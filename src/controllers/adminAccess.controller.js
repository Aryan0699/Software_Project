import {
    assignDeanOffice as assignDeanOfficeService,
    createApprovedUser as createApprovedUserService,
    createStaffAssignment as createStaffAssignmentService,
    deleteStaffAssignment as deleteStaffAssignmentService,
    getDeanOffices as getDeanOfficesService,
    getStaffAssignmentOptions as getStaffAssignmentOptionsService,
    listApprovedUsers as listApprovedUsersService,
    listStaffAssignments as listStaffAssignmentsService,
    listUsers as listUsersService,
    updateApprovedUser as updateApprovedUserService,
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

export const getDeanOffices = asyncHandler(async (_req, res) => {
    const offices = await getDeanOfficesService()
    res.json(new ApiResponse(200, "Dean office assignments", { offices }))
})

export const assignDeanOffice = asyncHandler(async (req, res) => {
    const assignment = await assignDeanOfficeService({
        office: req.validatedParams.office,
        userId: req.validatedBody.userId,
        actorUserId: req.user.id,
    })
    res.json(
        new ApiResponse(200, "Dean office assignment updated", {
            assignment,
        })
    )
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
