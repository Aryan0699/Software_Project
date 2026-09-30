import {
    getUnreadNotificationCount,
    listNotifications as listNotificationsService,
    markAllNotificationsRead as markAllNotificationsReadService,
    markNotificationRead as markNotificationReadService,
} from "../services/notification.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const listNotifications = asyncHandler(async (req, res) => {
    const result = await listNotificationsService(req.validatedQuery, req.user)
    res.json(new ApiResponse(200, "Notifications", result))
})

export const unreadNotificationCount = asyncHandler(async (req, res) => {
    const count = await getUnreadNotificationCount(req.user)
    res.json(new ApiResponse(200, "Unread notification count", { count }))
})

export const markNotificationRead = asyncHandler(async (req, res) => {
    const notification = await markNotificationReadService(
        req.validatedParams.id,
        req.user
    )
    res.json(new ApiResponse(200, "Notification marked as read", { notification }))
})

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const result = await markAllNotificationsReadService(req.user)
    res.json(new ApiResponse(200, "Notifications marked as read", result))
})
