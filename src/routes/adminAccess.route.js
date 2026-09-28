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
    updateUserProfile,
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
import { updateProfileSchema } from "../schemas/profile.schema.js"

const adminAccessRouter = Router()

adminAccessRouter.use(requireAuth, requireRole("ADMIN"), requireTrustedOrigin)

adminAccessRouter.get(
    "/approved-users",
    validateQuery(listApprovedUsersQuerySchema),
    listApprovedUsers
)
adminAccessRouter.post(
    "/approved-users",
    validateBody(createApprovedUserSchema),
    createApprovedUser
)
adminAccessRouter.patch(
    "/approved-users/:id",
    validateParams(recordIdParamsSchema),
    validateBody(updateApprovedUserSchema),
    updateApprovedUser
)

adminAccessRouter.get("/users", validateQuery(listUsersQuerySchema), listUsers)
adminAccessRouter.patch(
    "/users/:id/access",
    validateParams(recordIdParamsSchema),
    validateBody(updateUserAccessSchema),
    updateUserAccess
)
adminAccessRouter.patch(
    "/users/:id/profile",
    validateParams(recordIdParamsSchema),
    validateBody(updateProfileSchema),
    updateUserProfile
)

adminAccessRouter.get("/dean-offices", getDeanOffices)
adminAccessRouter.put(
    "/dean-offices/:office",
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
    validateBody(createStaffAssignmentSchema),
    createStaffAssignment
)
adminAccessRouter.delete(
    "/staff-building-assignments/:id",
    validateParams(recordIdParamsSchema),
    deleteStaffAssignment
)

export default adminAccessRouter
