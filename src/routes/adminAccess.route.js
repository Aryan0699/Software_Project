import { Router } from "express"
import {
    createInstitutionalApprover,
    createApprovedUser,
    createStaffAssignment,
    deleteStaffAssignment,
    getInstitutionalApproverOptions,
    listInstitutionalApprovers,
    getStaffAssignmentOptions,
    listApprovedUsers,
    listStaffAssignments,
    listUsers,
    updateApprovedUser,
    updateInstitutionalApprover,
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
    createInstitutionalApproverSchema,
    createApprovedUserSchema,
    createStaffAssignmentSchema,
    listApprovedUsersQuerySchema,
    listStaffAssignmentsQuerySchema,
    listUsersQuerySchema,
    recordIdParamsSchema,
    updateApprovedUserSchema,
    updateInstitutionalApproverSchema,
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

adminAccessRouter.get("/institutional-approvers", listInstitutionalApprovers)
adminAccessRouter.get(
    "/institutional-approver-options",
    getInstitutionalApproverOptions
)
adminAccessRouter.post(
    "/institutional-approvers",
    validateBody(createInstitutionalApproverSchema),
    createInstitutionalApprover
)
adminAccessRouter.patch(
    "/institutional-approvers/:id",
    validateParams(recordIdParamsSchema),
    validateBody(updateInstitutionalApproverSchema),
    updateInstitutionalApprover
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
