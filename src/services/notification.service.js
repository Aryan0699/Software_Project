import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import { pageOffset, pagination } from "../utils/pagination.js"

export async function createNotifications(db, notifications) {
    const seen = new Set()
    const data = notifications.filter((item) => {
        if (!item?.recipientId) return false
        const key = `${item.recipientId}:${item.type}:${item.resourceType || ""}:${item.resourceId || ""}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
    if (data.length) await db.notification.createMany({ data })
}

export async function listNotifications({ page, pageSize, view }, viewer) {
    const where = {
        recipientId: viewer.id,
        ...(view === "unread" ? { isRead: false } : {}),
    }
    const [records, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
            where: { recipientId: viewer.id, isRead: false },
        }),
    ])
    return { records, unreadCount, pagination: pagination(page, pageSize, total) }
}

export async function getUnreadNotificationCount(viewer) {
    return prisma.notification.count({
        where: { recipientId: viewer.id, isRead: false },
    })
}

export async function markNotificationRead(id, viewer) {
    const notification = await prisma.notification.findFirst({
        where: { id, recipientId: viewer.id },
        select: { id: true, isRead: true },
    })
    if (!notification) {
        throw new ApiError(404, "Notification was not found", {
            code: "NOTIFICATION_NOT_FOUND",
        })
    }
    if (notification.isRead) return notification
    return prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
    })
}

export async function markAllNotificationsRead(viewer) {
    const result = await prisma.notification.updateMany({
        where: { recipientId: viewer.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
    })
    return { updatedCount: result.count }
}
