import { queryString, request, type Pagination } from "./api"

export type Notification = {
    id: string
    type: string
    title: string
    message: string
    resourceType: string | null
    resourceId: string | null
    data: Record<string, unknown> | null
    isRead: boolean
    readAt: string | null
    createdAt: string
}

export const notificationApi = {
    list(values: { page?: number; pageSize?: number; view?: "all" | "unread" } = {}) {
        return request<{
            records: Notification[]
            unreadCount: number
            pagination: Pagination
        }>(`/notifications${queryString(values)}`)
    },
    unreadCount() {
        return request<{ count: number }>("/notifications/unread-count")
    },
    markRead(id: string) {
        return request<{ notification: Notification }>(`/notifications/${id}/read`, {
            method: "PATCH",
        })
    },
    markAllRead() {
        return request<{ updatedCount: number }>("/notifications/read-all", {
            method: "POST",
        })
    },
}
