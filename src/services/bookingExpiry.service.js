import { prisma } from "../db/index.js"
import { institutionNow } from "../utils/dateTime.js"
import { createNotifications } from "./notification.service.js"

export const BOOKING_EXPIRED_REASON =
    "The requested start time passed before all required approvals were completed."

const pendingStatuses = ["PENDING_FACULTY", "PENDING_INSTITUTIONAL"]

export function bookingHasStarted(request, now = institutionNow()) {
    return (
        request.bookingDate < now.dateValue ||
        (request.bookingDate.getTime() === now.dateValue.getTime() &&
            request.startMinute <= now.minute)
    )
}

export async function rejectExpiredBooking(
    db,
    request,
    rejectedAt = new Date()
) {
    if (!bookingHasStarted(request, institutionNow(rejectedAt))) return false

    const updated = await db.bookingRequest.updateMany({
        where: { id: request.id, status: { in: pendingStatuses } },
        data: {
            status: "REJECTED",
            statusReason: BOOKING_EXPIRED_REASON,
            rejectedAt,
            version: { increment: 1 },
        },
    })
    if (!updated.count) return false

    const reviewers = await db.bookingApproval.findMany({
        where: { bookingRequestId: request.id },
        select: { reviewerUserId: true },
    })
    await db.bookingApproval.updateMany({
        where: { bookingRequestId: request.id, status: "PENDING" },
        data: { status: "CLOSED", closedAt: rejectedAt },
    })
    await db.bookingActionHistory.create({
        data: {
            bookingRequestId: request.id,
            actionType: "AUTO_REJECTED_EXPIRED",
            previousStatus: request.status,
            newStatus: "REJECTED",
            note: BOOKING_EXPIRED_REASON,
            metadata: { reason: "REQUEST_START_TIME_PASSED" },
        },
    })
    await createNotifications(db, [
        {
            recipientId: request.requesterUserId,
            type: "BOOKING_AUTO_REJECTED",
            title: "Room request expired",
            message: BOOKING_EXPIRED_REASON,
            resourceType: "BOOKING_REQUEST",
            resourceId: request.id,
        },
        ...reviewers.map((reviewer) => ({
            recipientId: reviewer.reviewerUserId,
            type: "BOOKING_AUTO_REJECTED",
            title: "Room request expired",
            message: BOOKING_EXPIRED_REASON,
            resourceType: "BOOKING_REQUEST",
            resourceId: request.id,
        })),
    ])
    return true
}

export async function expireStartedBookingRequests(nowValue = new Date()) {
    const now = institutionNow(nowValue)
    const candidates = await prisma.bookingRequest.findMany({
        where: {
            status: { in: pendingStatuses },
            OR: [
                { bookingDate: { lt: now.dateValue } },
                {
                    bookingDate: now.dateValue,
                    startMinute: { lte: now.minute },
                },
            ],
        },
        select: {
            id: true,
            requesterUserId: true,
            bookingDate: true,
            startMinute: true,
            status: true,
        },
        take: 500,
    })

    let rejectedCount = 0
    for (const request of candidates) {
        const rejected = await prisma.$transaction((tx) =>
            rejectExpiredBooking(tx, request, nowValue)
        )
        if (rejected) rejectedCount += 1
    }
    return rejectedCount
}
