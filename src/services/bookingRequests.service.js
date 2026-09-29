import {
    DEAN_APPROVAL_ROLES,
    approvalRoleLabels,
} from "../config/bookingWorkflow.js"
import { env } from "../config/env.js"
import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import {
    formatDateOnly,
    institutionNow,
    parseDateOnly,
} from "../utils/dateTime.js"
import { pageOffset, pagination } from "../utils/pagination.js"
import {
    halfOpenOverlapWhere,
    intervalsOverlap,
} from "../utils/timeInterval.js"
import { findIntervalConflicts } from "./occupancy.service.js"
import { expireStartedBookingRequests } from "./bookingExpiry.service.js"

const userSummarySelect = {
    id: true,
    name: true,
    email: true,
}

export const bookingRecordInclude = {
    requester: { select: { ...userSummarySelect, role: true } },
    room: {
        select: {
            id: true,
            fullCode: true,
            displayName: true,
            capacity: true,
            isAccessible: true,
            features: true,
            status: true,
            building: {
                select: { id: true, code: true, name: true, isActive: true },
            },
            roomType: { select: { id: true, code: true, name: true } },
        },
    },
    approvals: {
        include: { reviewer: { select: userSummarySelect } },
        orderBy: { assignedAt: "asc" },
    },
    actions: {
        include: { performedBy: { select: userSummarySelect } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    },
}

export const bookingSummarySelect = {
    id: true,
    requesterUserId: true,
    requesterRoleSnapshot: true,
    roomId: true,
    bookingDate: true,
    startMinute: true,
    endMinute: true,
    title: true,
    status: true,
    statusReason: true,
    submittedAt: true,
    version: true,
    requester: { select: { ...userSummarySelect, role: true } },
    room: {
        select: {
            id: true,
            fullCode: true,
            displayName: true,
            capacity: true,
            building: { select: { id: true, code: true, name: true } },
        },
    },
}

function plannedProgress(request) {
    const byRole = new Map(
        request.approvals.map((approval) => [approval.reviewerRole, approval])
    )
    const task = (role) => {
        const approval = byRole.get(role)
        return {
            role,
            label: approvalRoleLabels[role],
            status: approval?.status || "NOT_STARTED",
            approvalId: approval?.id || null,
            reviewer: approval?.reviewer || null,
            decisionNote: approval?.decisionNote || null,
            assignedAt: approval?.assignedAt || null,
            decidedAt: approval?.decidedAt || null,
            closedAt: approval?.closedAt || null,
        }
    }

    const stages = []
    if (request.requesterRoleSnapshot === "STUDENT") {
        stages.push({
            key: "FACULTY_REVIEW",
            label: "Faculty verification",
            tasks: [task("FACULTY")],
        })
    }
    stages.push({
        key: "INSTITUTIONAL_REVIEW",
        label: "Institutional approval",
        tasks: DEAN_APPROVAL_ROLES.map(task),
    })
    return stages
}

export function serializeBookingRequest(request, pendingCompetitorCount = 0) {
    return {
        ...request,
        bookingDate: formatDateOnly(request.bookingDate),
        capacityUnverified: request.room.capacity === null,
        pendingCompetitorCount,
        workflow: plannedProgress(request),
    }
}

export function serializeBookingSummary(request, pendingCompetitorCount = 0) {
    return {
        ...request,
        bookingDate: formatDateOnly(request.bookingDate),
        capacityUnverified: request.room.capacity === null,
        pendingCompetitorCount,
    }
}

export async function findPendingCompetitors(
    db,
    request,
    { details = false } = {}
) {
    return db.bookingRequest.findMany({
        where: {
            id: { not: request.id },
            roomId: request.roomId,
            bookingDate: request.bookingDate,
            status: { in: ["PENDING_FACULTY", "PENDING_DEANS"] },
            ...halfOpenOverlapWhere(request.startMinute, request.endMinute),
        },
        select: details
            ? {
                  id: true,
                  title: true,
                  status: true,
                  submittedAt: true,
                  startMinute: true,
                  endMinute: true,
                  version: true,
                  requester: { select: { id: true, name: true } },
              }
            : { id: true },
        orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    })
}

export async function getActiveOfficeAssignments(db) {
    const assignments = await db.deanOfficeAssignment.findMany({
        where: {
            office: { in: DEAN_APPROVAL_ROLES },
            user: { isActive: true, role: "FACULTY" },
        },
        select: {
            office: true,
            userId: true,
            user: { select: userSummarySelect },
        },
    })
    const byOffice = new Map(assignments.map((item) => [item.office, item]))
    const missing = DEAN_APPROVAL_ROLES.filter(
        (office) => !byOffice.has(office)
    )
    if (missing.length) {
        throw new ApiError(
            409,
            `Booking requests are unavailable until an active holder is assigned for ${missing.join(", ")}`,
            {
                code: "MISSING_APPROVAL_AUTHORITY",
                details: { missingOffices: missing },
            }
        )
    }
    return DEAN_APPROVAL_ROLES.map((office) => byOffice.get(office))
}

function normalizedFeatures(items) {
    return items.map((item) => item.trim()).filter(Boolean)
}

async function validateCreation(db, input, requester) {
    if (!["STUDENT", "FACULTY"].includes(requester.role)) {
        throw new ApiError(403, "Only students and faculty can request rooms", {
            code: "BOOKING_REQUESTER_NOT_ALLOWED",
        })
    }

    const date = parseDateOnly(input.bookingDate)
    const now = institutionNow()
    if (
        date < now.dateValue ||
        (date.getTime() === now.dateValue.getTime() &&
            input.startMinute <= now.minute)
    ) {
        throw new ApiError(409, "Choose a booking time that has not started", {
            code: "BOOKING_TIME_IN_PAST",
        })
    }
    if (
        input.startMinute < env.BOOKING_TIMELINE_START_MINUTE ||
        input.endMinute > env.BOOKING_TIMELINE_END_MINUTE
    ) {
        throw new ApiError(
            409,
            "Booking time is outside configured operating hours",
            {
                code: "BOOKING_OUTSIDE_OPERATING_WINDOW",
                details: {
                    windowStartMinute: env.BOOKING_TIMELINE_START_MINUTE,
                    windowEndMinute: env.BOOKING_TIMELINE_END_MINUTE,
                },
            }
        )
    }
    if (
        input.endMinute - input.startMinute <
        env.BOOKING_MIN_DURATION_MINUTES
    ) {
        throw new ApiError(
            409,
            `Bookings must be at least ${env.BOOKING_MIN_DURATION_MINUTES} minutes`,
            { code: "BOOKING_TOO_SHORT" }
        )
    }

    const room = await db.room.findUnique({
        where: { id: input.roomId },
        include: {
            building: {
                select: { id: true, code: true, name: true, isActive: true },
            },
            roomType: { select: { id: true, code: true, name: true } },
        },
    })
    if (!room) {
        throw new ApiError(404, "Room was not found", {
            code: "ROOM_NOT_FOUND",
        })
    }
    if (room.status !== "ACTIVE" || !room.building.isActive) {
        throw new ApiError(409, "This room is currently unavailable", {
            code: "ROOM_INACTIVE",
        })
    }
    if (
        input.expectedParticipants !== undefined &&
        room.capacity !== null &&
        input.expectedParticipants > room.capacity
    ) {
        throw new ApiError(409, "Expected attendance exceeds room capacity", {
            code: "ROOM_CAPACITY_EXCEEDED",
            details: { capacity: room.capacity },
        })
    }

    const requestedFeatures = normalizedFeatures(input.requiredFeatures)
    const roomFeatures = new Set(
        room.features.map((item) => item.toLocaleLowerCase())
    )
    const missingFeatures = requestedFeatures.filter(
        (item) => !roomFeatures.has(item.toLocaleLowerCase())
    )
    if (missingFeatures.length) {
        throw new ApiError(
            409,
            "The room does not have every required feature",
            {
                code: "ROOM_FEATURES_MISSING",
                details: { missingFeatures },
            }
        )
    }

    let facultyVerifier = null
    if (requester.role === "STUDENT") {
        if (!input.facultyVerifierUserId) {
            throw new ApiError(400, "Select a faculty verifier", {
                code: "FACULTY_VERIFIER_REQUIRED",
            })
        }
        facultyVerifier = await db.user.findFirst({
            where: {
                id: input.facultyVerifierUserId,
                role: "FACULTY",
                isActive: true,
                facultyProfile: { isNot: null },
            },
            select: userSummarySelect,
        })
        if (!facultyVerifier) {
            throw new ApiError(
                409,
                "Selected faculty verifier is no longer active. Please choose another reviewer.",
                { code: "FACULTY_VERIFIER_INACTIVE" }
            )
        }
    }

    const offices = await getActiveOfficeAssignments(db)
    const conflicts = await findIntervalConflicts(db, {
        roomId: room.id,
        date,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
    })
    if (
        conflicts.academic.length ||
        conflicts.bookings.length ||
        conflicts.restrictions.length
    ) {
        throw new ApiError(
            409,
            "This room is no longer available for the selected time",
            {
                code: "BOOKING_INTERVAL_UNAVAILABLE",
                details: { conflicts },
            }
        )
    }

    const pending = await db.bookingRequest.findMany({
        where: {
            roomId: room.id,
            bookingDate: date,
            status: { in: ["PENDING_FACULTY", "PENDING_DEANS"] },
            ...halfOpenOverlapWhere(input.startMinute, input.endMinute),
        },
        select: { id: true },
    })
    if (pending.length && !input.acknowledgePendingCompetition) {
        throw new ApiError(
            409,
            "Another request is pending for this time. Confirm the competition warning before submitting.",
            {
                code: "PENDING_COMPETITION_ACK_REQUIRED",
                details: { pendingRequestCount: pending.length },
            }
        )
    }

    return {
        date,
        room,
        facultyVerifier,
        offices,
        pendingCount: pending.length,
    }
}

function sameIdempotentInput(existing, input) {
    const facultyTask = existing.approvals.find(
        (item) => item.reviewerRole === "FACULTY"
    )
    const sameFeatures =
        JSON.stringify([...existing.requiredFeatures].sort()) ===
        JSON.stringify([...input.requiredFeatures].sort())
    return (
        existing.roomId === input.roomId &&
        formatDateOnly(existing.bookingDate) === input.bookingDate &&
        existing.startMinute === input.startMinute &&
        existing.endMinute === input.endMinute &&
        existing.title === input.title &&
        existing.purpose === input.purpose &&
        existing.eventType === input.eventType &&
        existing.expectedParticipants ===
            (input.expectedParticipants ?? null) &&
        existing.specialRequirements === (input.specialRequirements || null) &&
        sameFeatures &&
        (existing.requesterRoleSnapshot !== "STUDENT" ||
            facultyTask?.reviewerUserId === input.facultyVerifierUserId)
    )
}

async function existingIdempotentRequest(db, requesterId, input) {
    const existing = await db.bookingRequest.findUnique({
        where: {
            requesterUserId_clientRequestId: {
                requesterUserId: requesterId,
                clientRequestId: input.clientRequestId,
            },
        },
        include: bookingRecordInclude,
    })
    if (!existing) return null
    if (!sameIdempotentInput(existing, input)) {
        throw new ApiError(
            409,
            "This submission identifier was already used for different request details",
            {
                code: "IDEMPOTENCY_KEY_REUSED",
            }
        )
    }
    const competitors = await findPendingCompetitors(db, existing)
    return serializeBookingRequest(existing, competitors.length)
}

export async function listFacultyVerifiers({ page, pageSize, search }) {
    const where = {
        role: "FACULTY",
        isActive: true,
        facultyProfile: { isNot: null },
        ...(search
            ? {
                  OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                  ],
              }
            : {}),
    }
    const [records, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                ...userSummarySelect,
                facultyProfile: {
                    select: {
                        designation: true,
                        department: {
                            select: { id: true, code: true, name: true },
                        },
                    },
                },
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.user.count({ where }),
    ])
    return { records, pagination: pagination(page, pageSize, total) }
}

export async function createBookingRequest(input, requester) {
    const existing = await existingIdempotentRequest(
        prisma,
        requester.id,
        input
    )
    if (existing) return { created: false, request: existing }

    try {
        const created = await prisma.$transaction(
            async (tx) => {
                const repeated = await existingIdempotentRequest(
                    tx,
                    requester.id,
                    input
                )
                if (repeated) return { created: false, request: repeated }

                const validated = await validateCreation(tx, input, requester)
                const status =
                    requester.role === "STUDENT"
                        ? "PENDING_FACULTY"
                        : "PENDING_DEANS"
                const request = await tx.bookingRequest.create({
                    data: {
                        requesterUserId: requester.id,
                        clientRequestId: input.clientRequestId,
                        requesterRoleSnapshot: requester.role,
                        roomId: input.roomId,
                        bookingDate: validated.date,
                        startMinute: input.startMinute,
                        endMinute: input.endMinute,
                        title: input.title,
                        purpose: input.purpose,
                        eventType: input.eventType,
                        expectedParticipants:
                            input.expectedParticipants ?? null,
                        requiredFeatures: normalizedFeatures(
                            input.requiredFeatures
                        ),
                        specialRequirements: input.specialRequirements || null,
                        status,
                    },
                })

                const approvals =
                    requester.role === "STUDENT"
                        ? [
                              {
                                  bookingRequestId: request.id,
                                  reviewerRole: "FACULTY",
                                  reviewerUserId: validated.facultyVerifier.id,
                              },
                          ]
                        : validated.offices.map((assignment) => ({
                              bookingRequestId: request.id,
                              reviewerRole: assignment.office,
                              reviewerUserId: assignment.userId,
                          }))
                await tx.bookingApproval.createMany({ data: approvals })
                await tx.bookingActionHistory.createMany({
                    data: [
                        {
                            bookingRequestId: request.id,
                            actionType: "CREATED",
                            performedByUserId: requester.id,
                            newStatus: status,
                            note: "Booking request submitted",
                        },
                        ...(requester.role === "FACULTY"
                            ? [
                                  {
                                      bookingRequestId: request.id,
                                      actionType: "SENT_TO_DEANS",
                                      performedByUserId: requester.id,
                                      previousStatus: status,
                                      newStatus: status,
                                      note: "Sent for institutional approval",
                                  },
                              ]
                            : []),
                    ],
                })
                const record = await tx.bookingRequest.findUnique({
                    where: { id: request.id },
                    include: bookingRecordInclude,
                })
                return {
                    created: true,
                    request: serializeBookingRequest(
                        record,
                        validated.pendingCount
                    ),
                }
            },
            { maxWait: 5_000, timeout: 20_000 }
        )
        return created
    } catch (error) {
        if (error?.code === "P2002") {
            const repeated = await existingIdempotentRequest(
                prisma,
                requester.id,
                input
            )
            if (repeated) return { created: false, request: repeated }
        }
        throw error
    }
}

async function pendingCountsFor(records) {
    if (!records.length) return new Map()
    const candidates = await prisma.bookingRequest.findMany({
        where: {
            roomId: { in: [...new Set(records.map((item) => item.roomId))] },
            bookingDate: {
                in: [...new Set(records.map((item) => item.bookingDate))],
            },
            status: { in: ["PENDING_FACULTY", "PENDING_DEANS"] },
        },
        select: {
            id: true,
            roomId: true,
            bookingDate: true,
            startMinute: true,
            endMinute: true,
        },
    })
    return new Map(
        records.map((record) => [
            record.id,
            candidates.filter(
                (item) =>
                    item.id !== record.id &&
                    item.roomId === record.roomId &&
                    item.bookingDate.getTime() ===
                        record.bookingDate.getTime() &&
                    intervalsOverlap(
                        item.startMinute,
                        item.endMinute,
                        record.startMinute,
                        record.endMinute
                    )
            ).length,
        ])
    )
}

async function bookingVisibilityWhere(viewer) {
    if (viewer.role === "ADMIN") return {}
    if (viewer.role === "STAFF") {
        const assignments = await prisma.buildingStaffAssignment.findMany({
            where: { staffUserId: viewer.id },
            select: { buildingId: true },
        })
        return {
            room: {
                buildingId: {
                    in: assignments.map((assignment) => assignment.buildingId),
                },
            },
        }
    }
    if (viewer.role === "FACULTY") {
        const office = await prisma.deanOfficeAssignment.findFirst({
            where: { userId: viewer.id },
            select: { id: true },
        })
        if (office) return {}
        return {
            OR: [
                { requesterUserId: viewer.id },
                { approvals: { some: { reviewerUserId: viewer.id } } },
            ],
        }
    }
    return { requesterUserId: viewer.id }
}

export async function listBookingRequests({ page, pageSize }, viewer) {
    await expireStartedBookingRequests()
    const where = await bookingVisibilityWhere(viewer)
    const [records, total] = await Promise.all([
        prisma.bookingRequest.findMany({
            where,
            select: bookingSummarySelect,
            orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.bookingRequest.count({ where }),
    ])
    const counts = await pendingCountsFor(records)
    return {
        records: records.map((item) =>
            serializeBookingSummary(item, counts.get(item.id) || 0)
        ),
        pagination: pagination(page, pageSize, total),
    }
}

async function canViewRequest(record, viewer) {
    if (viewer.role === "ADMIN" || record.requesterUserId === viewer.id)
        return true
    if (
        record.approvals.some(
            (approval) => approval.reviewerUserId === viewer.id
        )
    )
        return true
    if (viewer.role === "FACULTY") {
        const office = await prisma.deanOfficeAssignment.findFirst({
            where: { userId: viewer.id },
            select: { id: true },
        })
        if (office) return true
    }
    if (viewer.role === "STAFF") {
        const assignment = await prisma.buildingStaffAssignment.findFirst({
            where: {
                staffUserId: viewer.id,
                buildingId: record.room.building.id,
            },
            select: { id: true },
        })
        if (assignment) return true
    }
    return false
}

export async function getBookingRequest(id, viewer) {
    await expireStartedBookingRequests()
    const record = await prisma.bookingRequest.findUnique({
        where: { id },
        include: bookingRecordInclude,
    })
    if (!record) {
        throw new ApiError(404, "Booking request was not found", {
            code: "BOOKING_REQUEST_NOT_FOUND",
        })
    }
    if (!(await canViewRequest(record, viewer))) {
        throw new ApiError(403, "You cannot view this booking request", {
            code: "BOOKING_REQUEST_FORBIDDEN",
        })
    }
    const competitors = await findPendingCompetitors(prisma, record)
    return serializeBookingRequest(record, competitors.length)
}
