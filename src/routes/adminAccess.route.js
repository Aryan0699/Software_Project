import { Router } from "express"
import {
    assignDeanOffice,
    createApprovedUser,
    createStaffAssignment,
    deleteStaffAssignment,
    getDeanOffices,
    getStaffAssignmentOptions,
    listApprovedUsers,
    listStaffAssignments,
    listUsers,
    updateApprovedUser,
    updateUserAccess,
} from "../controllers/adminAccess.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    assignDeanOfficeSchema,
    createApprovedUserSchema,
    createStaffAssignmentSchema,
    deanOfficeParamsSchema,
    listApprovedUsersQuerySchema,
    listStaffAssignmentsQuerySchema,
    listUsersQuerySchema,
    recordIdParamsSchema,
    updateApprovedUserSchema,
    updateUserAccessSchema,
} from "../schemas/adminAccess.schema.js"

const adminAccessRouter = Router()

adminAccessRouter.use(requireAuth, requireRole("ADMIN"))

adminAccessRouter.get(
    "/approved-users",
    validateQuery(listApprovedUsersQuerySchema),
    listApprovedUsers
)
adminAccessRouter.post(
    "/approved-users",
    requireTrustedOrigin,
    validateBody(createApprovedUserSchema),
    createApprovedUser
)
adminAccessRouter.patch(
    "/approved-users/:id",
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    validateBody(updateApprovedUserSchema),
    updateApprovedUser
)

adminAccessRouter.get("/users", validateQuery(listUsersQuerySchema), listUsers)
adminAccessRouter.patch(
    "/users/:id/access",
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    validateBody(updateUserAccessSchema),
    updateUserAccess
)

adminAccessRouter.get("/dean-offices", getDeanOffices)
adminAccessRouter.put(
    "/dean-offices/:office",
    requireTrustedOrigin,
    validateParams(deanOfficeParamsSchema),
    validateBody(assignDeanOfficeSchema),
    assignDeanOffice
)

adminAccessRouter.get(
    "/staff-building-assignments",
    validateQuery(listStaffAssignmentsQuerySchema),
    listStaffAssignments
)
adminAccessRouter.get(
    "/staff-building-assignment-options",
    getStaffAssignmentOptions
)
adminAccessRouter.post(
    "/staff-building-assignments",
    requireTrustedOrigin,
    validateBody(createStaffAssignmentSchema),
    createStaffAssignment
)
adminAccessRouter.delete(
    "/staff-building-assignments/:id",
    requireTrustedOrigin,
    validateParams(recordIdParamsSchema),
    deleteStaffAssignment
)

export default adminAccessRouter
