import { Router } from "express"
import {
    getAvailabilityTimelineConfig,
    getRoomTimeline,
    searchRoomAvailability,
} from "../controllers/availability.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import {
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    availabilityRoomParamsSchema,
    availabilityTimelineConfigQuerySchema,
    roomTimelineQuerySchema,
    searchAvailabilityQuerySchema,
} from "../schemas/availability.schema.js"

const availabilityRouter = Router()

availabilityRouter.use(requireAuth, requireRole("STUDENT", "FACULTY"))
availabilityRouter.get(
    "/timeline-config",
    validateQuery(availabilityTimelineConfigQuerySchema),
    getAvailabilityTimelineConfig
)
availabilityRouter.get(
    "/rooms",
    validateQuery(searchAvailabilityQuerySchema),
    searchRoomAvailability
)
availabilityRouter.get(
    "/rooms/:id/timeline",
    validateParams(availabilityRoomParamsSchema),
    validateQuery(roomTimelineQuerySchema),
    getRoomTimeline
)

export default availabilityRouter
