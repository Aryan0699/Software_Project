import { Router } from "express"
import {
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    unreadNotificationCount,
} from "../controllers/notification.controller.js"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import { validateParams, validateQuery } from "../middlewares/validate.middleware.js"
import {
    listNotificationsQuerySchema,
    notificationParamsSchema,
} from "../schemas/notification.schema.js"

const notificationRouter = Router()
notificationRouter.use(requireAuth, requireTrustedOrigin)
notificationRouter.get("/", validateQuery(listNotificationsQuerySchema), listNotifications)
notificationRouter.get("/unread-count", unreadNotificationCount)
notificationRouter.patch(
    "/:id/read",
    validateParams(notificationParamsSchema),
    markNotificationRead
)
notificationRouter.post("/read-all", markAllNotificationsRead)

export default notificationRouter
