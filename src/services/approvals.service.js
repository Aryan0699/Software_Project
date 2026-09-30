import { env } from "../config/env.js"
import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import { pageOffset, pagination } from "../utils/pagination.js"
import {
    acquireOccupancyLock,
    findIntervalConflicts,
} from "./occupancy.service.js"
import {
    bookingRecordInclude,
    bookingSummarySelect,
    findPendingCompetitors,
    getActiveInstitutionalApprovers,
    serializeBookingRequest,
    serializeBookingSummary,
} from "./bookingRequests.service.js"
import {
    bookingHasStarted,
    expireStartedBookingRequests,
    rejectExpiredBooking,
} from "./bookingExpiry.service.js"
import { createNotifications } from "./notification.service.js"

const AUTO_REJECTION_REASON = "Room was allocated to another request."

const approvalTaskInclude = {
    reviewer: { select: { id: true, name: true, email: true } },
    bookingRequest: {
        include: bookingRecordInclude,
    },
}

const approvalQueueInclude = {
    reviewer: { select: { id: true, name: true, email: true } },
    bookingRequest: { select: bookingSummarySelect },
}

function serializeApprovalTask(task) {
    return {
        id: task.id,
        reviewerKind: task.reviewerKind,
        reviewerLabel: task.reviewerLabel,
        status: task.status,
        decisionNote: task.decisionNote,
        assignedAt: task.assignedAt,
        decidedAt: task.decidedAt,
        closedAt: task.closedAt,
        reviewer: task.reviewer,
        request: serializeBookingRequest(task.bookingRequest),
    }
}

function serializeApprovalQueueTask(task) {
    return {
        id: task.id,
        reviewerKind: task.reviewerKind,
        reviewerLabel: task.reviewerLabel,
        status: task.status,
        decisionNote: task.decisionNote,
        assignedAt: task.assignedAt,
        decidedAt: task.decidedAt,
        closedAt: task.closedAt,
        reviewer: task.reviewer,
        request: serializeBookingSummary(task.bookingRequest),
    }
}

function requireAssignedTask(task, viewer) {
    if (!task) {
        throw new ApiError(404, "Approval task was not found", {
            code: "APPROVAL_TASK_NOT_FOUND",
        })
    }
    if (task.reviewerUserId !== viewer.id) {
        throw new ApiError(
            403,
            "This approval task is assigned to another reviewer",
            {
                code: "APPROVAL_TASK_FORBIDDEN",
            }
        )
    }
}

function isInstitutionalKind(kind) {
    return kind === "INSTITUTIONAL"
}

function wouldFinalize(task) {
    if (!isInstitutionalKind(task.reviewerKind)) return false
    const institutionalTasks = task.bookingRequest.approvals.filter((approval) =>
        isInstitutionalKind(approval.reviewerKind)
    )
    return (
        institutionalTasks.length > 0 &&
        institutionalTasks.every(
            (approval) =>
                approval.id === task.id || approval.status === "APPROVED"
        )
    )
}

async function loadTask(db, approvalId) {
    return db.bookingApproval.findUnique({
        where: { id: approvalId },
        include: approvalTaskInclude,
    })
}

function assertCurrentVersion(request, expectedVersion) {
    if (request.version !== expectedVersion) {
        throw new ApiError(
            409,
            "This request changed while you were reviewing it. Please review the latest state.",
            {
                code: "REQUEST_STATE_CHANGED",
                details: { currentVersion: request.version },
            }
        )
    }
}

function sameIds(first = [], second = []) {
    const left = [...new Set(first)].sort()
    const right = [...new Set(second)].sort()
    return (
        left.length === right.length &&
        left.every((value, index) => value === right[index])
    )
}

export async function listMyApprovals(
    { page, pageSize, view, search },
    viewer
) {
    await expireStartedBookingRequests()
    const where = {
        reviewerUserId: viewer.id,
        status:
            view === "pending"
                ? "PENDING"
                : { in: ["APPROVED", "REJECTED", "CLOSED"] },
        ...(search
            ? {
                  bookingRequest: {
                      OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          {
                              requester: {
                                  name: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                          {
                              room: {
                                  fullCode: {
                                      contains: search,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      ],
                  },
              }
            : {}),
    }
    const [records, total] = await Promise.all([
        prisma.bookingApproval.findMany({
            where,
            include: approvalQueueInclude,
            orderBy:
                view === "pending"
                    ? [{ assignedAt: "asc" }, { id: "asc" }]
                    : [{ updatedAt: "desc" }, { id: "desc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.bookingApproval.count({ where }),
    ])
    return {
        records: records.map(serializeApprovalQueueTask),
        pagination: pagination(page, pageSize, total),
    }
}

export async function getFinalizationPreview(approvalId, viewer) {
    await expireStartedBookingRequests()
    const task = await loadTask(prisma, approvalId)
    requireAssignedTask(task, viewer)
    if (task.status !== "PENDING") {
        throw new ApiError(
            409,
            "This approval task has already been completed",
            {
                code: "APPROVAL_TASK_COMPLETED",
            }
        )
    }
    const finalizes = wouldFinalize(task)
    const competitors = finalizes
        ? await findPendingCompetitors(prisma, task.bookingRequest, {
              details: true,
          })
        : []
    return {
        requiresFinalizationConfirmation: finalizes,
        requestVersion: task.bookingRequest.version,
        competitors,
        systemReason: AUTO_REJECTION_REASON,
    }
}

async function closeOtherTasks(tx, bookingRequestId, actingTaskId) {
    await tx.bookingApproval.updateMany({
        where: {
            bookingRequestId,
            id: { not: actingTaskId },
            status: "PENDING",
        },
        data: { status: "CLOSED", closedAt: new Date() },
    })
}

async function rejectByReviewer(tx, task, input, viewer) {
    const now = new Date()
    await tx.bookingApproval.update({
        where: { id: task.id },
        data: {
            status: "REJECTED",
            decisionNote: input.note,
            decidedAt: now,
        },
    })
    await closeOtherTasks(tx, task.bookingRequestId, task.id)
    await tx.bookingRequest.update({
        where: { id: task.bookingRequestId },
        data: {
            status: "REJECTED",
            statusReason: input.note,
            rejectedAt: now,
            version: { increment: 1 },
        },
    })
    await tx.bookingActionHistory.create({
        data: {
            bookingRequestId: task.bookingRequestId,
            actionType:
                task.reviewerKind === "FACULTY"
                    ? "FACULTY_REJECTED"
                    : "INSTITUTIONAL_REJECTED",
            performedByUserId: viewer.id,
            previousStatus: task.bookingRequest.status,
            newStatus: "REJECTED",
            note: input.note,
            metadata: { reviewerKind: task.reviewerKind },
        },
    })
    const facultyTask = task.bookingRequest.approvals.find(
        (approval) => approval.reviewerKind === "FACULTY"
    )
    await createNotifications(tx, [
        {
            recipientId: task.bookingRequest.requesterUserId,
            type:
                task.reviewerKind === "FACULTY"
                    ? "FACULTY_REJECTED"
                    : "BOOKING_REJECTED",
            title: "Room request rejected",
            message: input.note,
            resourceType: "BOOKING_REQUEST",
            resourceId: task.bookingRequestId,
        },
        ...(task.reviewerKind === "INSTITUTIONAL" && facultyTask
            ? [
                  {
                      recipientId: facultyTask.reviewerUserId,
                      type: "BOOKING_REJECTED",
                      title: "Student room request rejected",
                      message: input.note,
                      resourceType: "BOOKING_REQUEST",
                      resourceId: task.bookingRequestId,
                  },
              ]
            : []),
    ])
}

async function approveFaculty(tx, task, input, viewer) {
    const approvers = await getActiveInstitutionalApprovers(tx)
    const now = new Date()
    await tx.bookingApproval.update({
        where: { id: task.id },
        data: {
            status: "APPROVED",
            decisionNote: input.note || null,
            decidedAt: now,
        },
    })
    await tx.bookingApproval.createMany({
        data: approvers.map((assignment) => ({
            bookingRequestId: task.bookingRequestId,
            reviewerKind: "INSTITUTIONAL",
            reviewerLabel: assignment.title,
            reviewerUserId: assignment.userId,
        })),
    })
    await tx.bookingRequest.update({
        where: { id: task.bookingRequestId },
        data: { status: "PENDING_INSTITUTIONAL", version: { increment: 1 } },
    })
    await tx.bookingActionHistory.createMany({
        data: [
            {
                bookingRequestId: task.bookingRequestId,
                actionType: "FACULTY_APPROVED",
                performedByUserId: viewer.id,
                previousStatus: "PENDING_FACULTY",
                newStatus: "PENDING_INSTITUTIONAL",
                note: input.note || null,
                metadata: { reviewerKind: "FACULTY" },
            },
            {
                bookingRequestId: task.bookingRequestId,
                actionType: "SENT_TO_INSTITUTIONAL_REVIEW",
                performedByUserId: viewer.id,
                previousStatus: "PENDING_FACULTY",
                newStatus: "PENDING_INSTITUTIONAL",
                note: "Sent for institutional approval",
            },
        ],
    })
    await createNotifications(tx, [
        {
            recipientId: task.bookingRequest.requesterUserId,
            type: "FACULTY_APPROVED",
            title: "Faculty verification completed",
            message: `${task.bookingRequest.title} was sent for institutional approval.`,
            resourceType: "BOOKING_REQUEST",
            resourceId: task.bookingRequestId,
        },
        ...approvers.map((approver) => ({
            recipientId: approver.userId,
            type: "INSTITUTIONAL_REVIEW_REQUIRED",
            title: "Room request needs your review",
            message: `${task.bookingRequest.title} requires your decision.`,
            resourceType: "BOOKING_REQUEST",
            resourceId: task.bookingRequestId,
        })),
    ])
}

async function approveNonFinalInstitutional(tx, task, input, viewer) {
    await tx.bookingApproval.update({
        where: { id: task.id },
        data: {
            status: "APPROVED",
            decisionNote: input.note || null,
            decidedAt: new Date(),
        },
    })
    await tx.bookingRequest.update({
        where: { id: task.bookingRequestId },
        data: { version: { increment: 1 } },
    })
    await tx.bookingActionHistory.create({
        data: {
            bookingRequestId: task.bookingRequestId,
            actionType: "INSTITUTIONAL_APPROVED",
            performedByUserId: viewer.id,
            previousStatus: "PENDING_INSTITUTIONAL",
            newStatus: "PENDING_INSTITUTIONAL",
            note: input.note || null,
            metadata: { reviewerKind: task.reviewerKind },
        },
    })
    await createNotifications(tx, [
        {
            recipientId: task.bookingRequest.requesterUserId,
            type: "INSTITUTIONAL_APPROVAL_PROGRESS",
            title: "Approval progress updated",
            message: `${task.reviewerLabel} approved ${task.bookingRequest.title}.`,
            resourceType: "BOOKING_REQUEST",
            resourceId: task.bookingRequestId,
        },
    ])
}

function finalSuitabilityLost(request) {
    if (request.room.status !== "ACTIVE" || !request.room.building.isActive)
        return true
    if (
        request.startMinute < env.BOOKING_TIMELINE_START_MINUTE ||
        request.endMinute > env.BOOKING_TIMELINE_END_MINUTE ||
        request.endMinute - request.startMinute <
            env.BOOKING_MIN_DURATION_MINUTES
    ) {
        return true
    }
    if (
        request.expectedParticipants !== null &&
        request.room.capacity !== null &&
        request.expectedParticipants > request.room.capacity
    ) {
        return true
    }
    const roomFeatures = new Set(
        request.room.features.map((item) => item.toLocaleLowerCase())
    )
    return request.requiredFeatures.some(
        (feature) => !roomFeatures.has(feature.toLocaleLowerCase())
    )
}

async function rejectForLostAvailability(tx, task, viewer, reason) {
    const now = new Date()
    await tx.bookingApproval.update({
        where: { id: task.id },
        data: { status: "CLOSED", closedAt: now },
    })
    await closeOtherTasks(tx, task.bookingRequestId, task.id)
    await tx.bookingRequest.update({
        where: { id: task.bookingRequestId },
        data: {
            status: "REJECTED",
            statusReason: reason,
            rejectedAt: now,
            version: { increment: 1 },
        },
    })
    await tx.bookingActionHistory.create({
        data: {
            bookingRequestId: task.bookingRequestId,
            actionType: "AUTO_REJECTED_CONFLICT",
            performedByUserId: viewer.id,
            previousStatus: "PENDING_INSTITUTIONAL",
            newStatus: "REJECTED",
            note: reason,
            metadata: {
                reviewerKind: task.reviewerKind,
                finalAvailabilityLost: true,
            },
        },
    })
    await createNotifications(tx, [
        {
            recipientId: task.bookingRequest.requesterUserId,
            type: "BOOKING_AUTO_REJECTED",
            title: "Room request could not be finalized",
            message: reason,
            resourceType: "BOOKING_REQUEST",
            resourceId: task.bookingRequestId,
        },
    ])
}

async function approveFinalInstitutional(tx, task, input, viewer) {
    await acquireOccupancyLock(tx)
    const current = await loadTask(tx, task.id)
    requireAssignedTask(current, viewer)
    if (current.status !== "PENDING") {
        throw new ApiError(
            409,
            "This approval task has already been completed",
            {
                code: "APPROVAL_TASK_COMPLETED",
            }
        )
    }
    assertCurrentVersion(current.bookingRequest, input.expectedRequestVersion)
    if (!wouldFinalize(current)) {
        throw new ApiError(
            409,
            "Approval progress changed. Review the latest state.",
            {
                code: "REQUEST_STATE_CHANGED",
                details: { currentVersion: current.bookingRequest.version },
            }
        )
    }

    const competitors = await findPendingCompetitors(
        tx,
        current.bookingRequest,
        {
            details: true,
        }
    )
    if (!input.expectedCompetitorIds) {
        throw new ApiError(
            409,
            "Review the final approval impact before approving",
            {
                code: "FINALIZATION_PREVIEW_REQUIRED",
            }
        )
    }
    if (
        !sameIds(
            input.expectedCompetitorIds,
            competitors.map((item) => item.id)
        )
    ) {
        throw new ApiError(
            409,
            "Competing requests changed while you were reviewing. Please review again.",
            {
                code: "REQUEST_STATE_CHANGED",
                details: { currentVersion: current.bookingRequest.version },
            }
        )
    }

    const conflicts = await findIntervalConflicts(tx, {
        roomId: current.bookingRequest.roomId,
        date: current.bookingRequest.bookingDate,
        startMinute: current.bookingRequest.startMinute,
        endMinute: current.bookingRequest.endMinute,
    })
    const lost =
        finalSuitabilityLost(current.bookingRequest) ||
        conflicts.academic.length > 0 ||
        conflicts.bookings.length > 0 ||
        conflicts.restrictions.length > 0
    if (lost) {
        await rejectForLostAvailability(
            tx,
            current,
            viewer,
            "The room is no longer available for the requested time."
        )
        return
    }

    const now = new Date()
    await tx.bookingApproval.update({
        where: { id: current.id },
        data: {
            status: "APPROVED",
            decisionNote: input.note || null,
            decidedAt: now,
        },
    })
    await tx.bookingRequest.update({
        where: { id: current.bookingRequestId },
        data: {
            status: "APPROVED",
            statusReason: null,
            approvedAt: now,
            version: { increment: 1 },
        },
    })
    await tx.bookingActionHistory.createMany({
        data: [
            {
                bookingRequestId: current.bookingRequestId,
                actionType: "INSTITUTIONAL_APPROVED",
                performedByUserId: viewer.id,
                previousStatus: "PENDING_INSTITUTIONAL",
                newStatus: "PENDING_INSTITUTIONAL",
                note: input.note || null,
                metadata: { reviewerKind: current.reviewerKind },
            },
            {
                bookingRequestId: current.bookingRequestId,
                actionType: "FINAL_APPROVED",
                performedByUserId: viewer.id,
                previousStatus: "PENDING_INSTITUTIONAL",
                newStatus: "APPROVED",
                note: "All required approvals completed",
            },
        ],
    })
    const facultyTask = current.bookingRequest.approvals.find(
        (approval) => approval.reviewerKind === "FACULTY"
    )
    await createNotifications(tx, [
        {
            recipientId: current.bookingRequest.requesterUserId,
            type: "BOOKING_APPROVED",
            title: "Room request approved",
            message: `${current.bookingRequest.title} has been approved.`,
            resourceType: "BOOKING_REQUEST",
            resourceId: current.bookingRequestId,
        },
        ...(facultyTask
            ? [
                  {
                      recipientId: facultyTask.reviewerUserId,
                      type: "BOOKING_APPROVED",
                      title: "Student room request approved",
                      message: `${current.bookingRequest.title} has completed institutional approval.`,
                      resourceType: "BOOKING_REQUEST",
                      resourceId: current.bookingRequestId,
                  },
              ]
            : []),
    ])

    for (const competitor of competitors) {
        const updated = await tx.bookingRequest.updateMany({
            where: {
                id: competitor.id,
                status: { in: ["PENDING_FACULTY", "PENDING_INSTITUTIONAL"] },
            },
            data: {
                status: "REJECTED",
                statusReason: AUTO_REJECTION_REASON,
                rejectedAt: now,
                version: { increment: 1 },
            },
        })
        if (!updated.count) continue
        await tx.bookingApproval.updateMany({
            where: { bookingRequestId: competitor.id, status: "PENDING" },
            data: { status: "CLOSED", closedAt: now },
        })
        await tx.bookingActionHistory.create({
            data: {
                bookingRequestId: competitor.id,
                actionType: "AUTO_REJECTED_CONFLICT",
                performedByUserId: viewer.id,
                previousStatus: competitor.status,
                newStatus: "REJECTED",
                note: input.sharedConflictNote || AUTO_REJECTION_REASON,
                metadata: {
                    systemReason: AUTO_REJECTION_REASON,
                    sharedNote: input.sharedConflictNote || null,
                    approvedBookingRequestId: current.bookingRequestId,
                },
            },
        })
        const competitorFacultyTask = await tx.bookingApproval.findFirst({
            where: {
                bookingRequestId: competitor.id,
                reviewerKind: "FACULTY",
            },
            select: { reviewerUserId: true },
        })
        await createNotifications(tx, [
            {
                recipientId: competitor.requester.id,
                type: "BOOKING_AUTO_REJECTED",
                title: "Room request was not allocated",
                message: input.sharedConflictNote || AUTO_REJECTION_REASON,
                resourceType: "BOOKING_REQUEST",
                resourceId: competitor.id,
            },
            ...(competitorFacultyTask
                ? [
                      {
                          recipientId: competitorFacultyTask.reviewerUserId,
                          type: "BOOKING_AUTO_REJECTED",
                          title: "Student room request was not allocated",
                          message:
                              input.sharedConflictNote || AUTO_REJECTION_REASON,
                          resourceType: "BOOKING_REQUEST",
                          resourceId: competitor.id,
                      },
                  ]
                : []),
        ])
    }
}

export async function decideApproval(approvalId, input, viewer) {
    await expireStartedBookingRequests()
    await prisma.$transaction(
        async (tx) => {
            const task = await loadTask(tx, approvalId)
            requireAssignedTask(task, viewer)

            if (task.status !== "PENDING") {
                const expectedStatus =
                    input.decision === "APPROVE" ? "APPROVED" : "REJECTED"
                const recordedNote = task.decisionNote || ""
                const suppliedNote = input.note || ""
                if (
                    task.status === expectedStatus &&
                    recordedNote === suppliedNote
                )
                    return
                throw new ApiError(
                    409,
                    "This approval task has already been completed",
                    {
                        code: "APPROVAL_TASK_COMPLETED",
                    }
                )
            }
            if (bookingHasStarted(task.bookingRequest)) {
                await rejectExpiredBooking(tx, task.bookingRequest)
                return
            }
            assertCurrentVersion(
                task.bookingRequest,
                input.expectedRequestVersion
            )

            if (input.decision === "REJECT") {
                await rejectByReviewer(tx, task, input, viewer)
                return
            }
            if (task.reviewerKind === "FACULTY") {
                await approveFaculty(tx, task, input, viewer)
                return
            }
            if (!isInstitutionalKind(task.reviewerKind)) {
                throw new ApiError(409, "This approval role is not supported", {
                    code: "APPROVAL_ROLE_UNSUPPORTED",
                })
            }
            if (wouldFinalize(task)) {
                await approveFinalInstitutional(tx, task, input, viewer)
            } else {
                await approveNonFinalInstitutional(tx, task, input, viewer)
            }
        },
        { maxWait: 5_000, timeout: 20_000 }
    )

    const task = await loadTask(prisma, approvalId)
    return {
        approval: serializeApprovalTask(task),
        request: serializeBookingRequest(task.bookingRequest),
    }
}
