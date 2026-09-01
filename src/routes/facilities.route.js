import { Router } from "express"
import {
    cancelRestriction,
    createBuilding,
    createDepartment,
    createRestriction,
    createRoom,
    createRoomType,
    listBuildings,
    listDepartments,
    listRestrictions,
    listRooms,
    listRoomTypes,
    updateBuilding,
    updateDepartment,
    updateRoom,
    updateRoomType,
} from "../controllers/facilities.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    createBuildingSchema,
    createReferenceSchema,
    createRestrictionSchema,
    createRoomSchema,
    listBuildingsQuerySchema,
    listReferenceQuerySchema,
    listRestrictionsQuerySchema,
    listRoomsQuerySchema,
    recordIdParamsSchema,
    updateBuildingSchema,
    updateReferenceSchema,
    updateRoomSchema,
} from "../schemas/facilities.schema.js"

const facilitiesRouter = Router()

facilitiesRouter.use(requireAuth)

facilitiesRouter.get(
    "/departments",
    validateQuery(listReferenceQuerySchema),
    listDepartments
)
facilitiesRouter.post(
    "/departments",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateBody(createReferenceSchema),
    createDepartment
)
facilitiesRouter.patch(
    "/departments/:id",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    validateBody(updateReferenceSchema),
    updateDepartment
)

facilitiesRouter.get(
    "/room-types",
    validateQuery(listReferenceQuerySchema),
    listRoomTypes
)
facilitiesRouter.post(
    "/room-types",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateBody(createReferenceSchema),
    createRoomType
)
facilitiesRouter.patch(
    "/room-types/:id",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    validateBody(updateReferenceSchema),
    updateRoomType
)

facilitiesRouter.get(
    "/buildings",
    validateQuery(listBuildingsQuerySchema),
    listBuildings
)
facilitiesRouter.post(
    "/buildings",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateBody(createBuildingSchema),
    createBuilding
)
facilitiesRouter.patch(
    "/buildings/:id",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    validateBody(updateBuildingSchema),
    updateBuilding
)

facilitiesRouter.get(
    "/rooms",
    validateQuery(listRoomsQuerySchema),
    listRooms
)
facilitiesRouter.post(
    "/rooms",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateBody(createRoomSchema),
    createRoom
)
facilitiesRouter.patch(
    "/rooms/:id",
    requireRole("ADMIN"),
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    validateBody(updateRoomSchema),
    updateRoom
)

facilitiesRouter.get(
    "/restrictions",
    requireRole("ADMIN", "STAFF"),
    validateQuery(listRestrictionsQuerySchema),
    listRestrictions
)
facilitiesRouter.post(
    "/restrictions",
    requireRole("ADMIN", "STAFF"),
    requireTrustedOrigin,
    validateBody(createRestrictionSchema),
    createRestriction
)
facilitiesRouter.patch(
    "/restrictions/:id/cancel",
    requireRole("ADMIN", "STAFF"),
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    cancelRestriction
)

export default facilitiesRouter

