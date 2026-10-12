import { Router } from "express"
import {
    createBookingActivityApprover,
    createBookingActivityType,
    createApprovedUser,
    createStaffAssignment,
    deleteBookingActivityType,
    deleteStaffAssignment,
    getBookingApproverOptions,
    listBookingActivityTypes,
    getStaffAssignmentOptions,
    listApprovedUsers,
    listStaffAssignments,
    listUsers,
    updateApprovedUser,
    updateBookingActivityApprover,
    updateBookingActivityType,
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
    activityApproverParamsSchema,
    createBookingActivityApproverSchema,
    createBookingActivityTypeSchema,
    createApprovedUserSchema,
    createStaffAssignmentSchema,
    listApprovedUsersQuerySchema,
    listStaffAssignmentsQuerySchema,
    listUsersQuerySchema,
    recordIdParamsSchema,
    updateApprovedUserSchema,
    updateBookingActivityApproverSchema,
    updateBookingActivityTypeSchema,
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

adminAccessRouter.get("/booking-activity-types", listBookingActivityTypes)
adminAccessRouter.get("/booking-approver-options", getBookingApproverOptions)
adminAccessRouter.post(
    "/booking-activity-types",
    validateBody(createBookingActivityTypeSchema),
    createBookingActivityType
)
adminAccessRouter.patch(
    "/booking-activity-types/:id",
    validateParams(recordIdParamsSchema),
    validateBody(updateBookingActivityTypeSchema),
    updateBookingActivityType
)
adminAccessRouter.delete(
    "/booking-activity-types/:id",
    validateParams(recordIdParamsSchema),
    deleteBookingActivityType
)
adminAccessRouter.post(
    "/booking-activity-types/:id/approvers",
    validateParams(recordIdParamsSchema),
    validateBody(createBookingActivityApproverSchema),
    createBookingActivityApprover
)
adminAccessRouter.patch(
    "/booking-activity-types/:id/approvers/:assignmentId",
    validateParams(activityApproverParamsSchema),
    validateBody(updateBookingActivityApproverSchema),
    updateBookingActivityApprover
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
