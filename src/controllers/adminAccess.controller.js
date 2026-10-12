import {
    createBookingActivityApprover as createBookingActivityApproverService,
    createBookingActivityType as createBookingActivityTypeService,
    createApprovedUser as createApprovedUserService,
    createStaffAssignment as createStaffAssignmentService,
    deleteBookingActivityType as deleteBookingActivityTypeService,
    deleteStaffAssignment as deleteStaffAssignmentService,
    getBookingApproverOptions as getBookingApproverOptionsService,
    listBookingActivityTypes as listBookingActivityTypesService,
    getStaffAssignmentOptions as getStaffAssignmentOptionsService,
    listApprovedUsers as listApprovedUsersService,
    listStaffAssignments as listStaffAssignmentsService,
    listUsers as listUsersService,
    updateApprovedUser as updateApprovedUserService,
    updateBookingActivityApprover as updateBookingActivityApproverService,
    updateBookingActivityType as updateBookingActivityTypeService,
    updateUserAccess as updateUserAccessService,
} from "../services/adminAccess.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { updateProfile } from "../services/profile.service.js"

export const listApprovedUsers = asyncHandler(async (req, res) => {
    const result = await listApprovedUsersService(req.validatedQuery)
    res.json(new ApiResponse(200, "Approved identities", result))
})

export const createApprovedUser = asyncHandler(async (req, res) => {
    const approvedUser = await createApprovedUserService({
        ...req.validatedBody,
        actorUserId: req.user.id,
    })
    res.status(201).json(
        new ApiResponse(201, "Identity approved for registration", {
            approvedUser,
        })
    )
})

export const updateApprovedUser = asyncHandler(async (req, res) => {
    const approvedUser = await updateApprovedUserService({
        id: req.validatedParams.id,
        changes: req.validatedBody,
    })
    res.json(
        new ApiResponse(200, "Approved identity updated", { approvedUser })
    )
})

export const listUsers = asyncHandler(async (req, res) => {
    const result = await listUsersService(req.validatedQuery)
    res.json(new ApiResponse(200, "Users", result))
})

export const updateUserAccess = asyncHandler(async (req, res) => {
    const user = await updateUserAccessService({
        id: req.validatedParams.id,
        changes: req.validatedBody,
        actorUserId: req.user.id,
    })
    res.json(new ApiResponse(200, "User access updated", { user }))
})

export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await updateProfile(req.validatedParams.id, req.validatedBody)
    res.json(new ApiResponse(200, "User profile updated", { user }))
})

export const listBookingActivityTypes = asyncHandler(async (_req, res) => {
    const activityTypes = await listBookingActivityTypesService()
    res.json(new ApiResponse(200, "Booking activity types", { activityTypes }))
})

export const getBookingApproverOptions = asyncHandler(async (_req, res) => {
    const users = await getBookingApproverOptionsService()
    res.json(new ApiResponse(200, "Booking approver options", { users }))
})

export const createBookingActivityType = asyncHandler(async (req, res) => {
    const activityType = await createBookingActivityTypeService(
        req.validatedBody
    )
    res.status(201).json(
        new ApiResponse(201, "Activity type created", {
            activityType,
        })
    )
})

export const updateBookingActivityType = asyncHandler(async (req, res) => {
    const activityType = await updateBookingActivityTypeService({
        id: req.validatedParams.id,
        changes: req.validatedBody,
    })
    res.json(new ApiResponse(200, "Activity type updated", { activityType }))
})

export const deleteBookingActivityType = asyncHandler(async (req, res) => {
    await deleteBookingActivityTypeService(req.validatedParams.id)
    res.json(new ApiResponse(200, "Activity type deleted"))
})

export const createBookingActivityApprover = asyncHandler(async (req, res) => {
    const approver = await createBookingActivityApproverService({
        activityTypeId: req.validatedParams.id,
        ...req.validatedBody,
    })
    res.status(201).json(
        new ApiResponse(201, "Activity approver assigned", { approver })
    )
})

export const updateBookingActivityApprover = asyncHandler(async (req, res) => {
    const approver = await updateBookingActivityApproverService({
        activityTypeId: req.validatedParams.id,
        id: req.validatedParams.assignmentId,
        changes: req.validatedBody,
    })
    res.json(new ApiResponse(200, "Activity approver updated", { approver }))
})

export const listStaffAssignments = asyncHandler(async (req, res) => {
    const result = await listStaffAssignmentsService(req.validatedQuery)
    res.json(new ApiResponse(200, "Staff-building assignments", result))
})

export const getStaffAssignmentOptions = asyncHandler(async (_req, res) => {
    const options = await getStaffAssignmentOptionsService()
    res.json(new ApiResponse(200, "Staff assignment options", options))
})

export const createStaffAssignment = asyncHandler(async (req, res) => {
    const assignment = await createStaffAssignmentService({
        ...req.validatedBody,
        actorUserId: req.user.id,
    })
    res.status(201).json(
        new ApiResponse(201, "Staff assigned to building", { assignment })
    )
})

export const deleteStaffAssignment = asyncHandler(async (req, res) => {
    await deleteStaffAssignmentService(req.validatedParams.id)
    res.json(new ApiResponse(200, "Staff-building assignment removed"))
})
