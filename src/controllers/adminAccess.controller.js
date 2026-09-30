import {
    createInstitutionalApprover as createInstitutionalApproverService,
    createApprovedUser as createApprovedUserService,
    createStaffAssignment as createStaffAssignmentService,
    deleteStaffAssignment as deleteStaffAssignmentService,
    getInstitutionalApproverOptions as getInstitutionalApproverOptionsService,
    listInstitutionalApprovers as listInstitutionalApproversService,
    getStaffAssignmentOptions as getStaffAssignmentOptionsService,
    listApprovedUsers as listApprovedUsersService,
    listStaffAssignments as listStaffAssignmentsService,
    listUsers as listUsersService,
    updateApprovedUser as updateApprovedUserService,
    updateInstitutionalApprover as updateInstitutionalApproverService,
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

export const listInstitutionalApprovers = asyncHandler(async (_req, res) => {
    const approvers = await listInstitutionalApproversService()
    res.json(new ApiResponse(200, "Institutional approvers", { approvers }))
})

export const getInstitutionalApproverOptions = asyncHandler(async (_req, res) => {
    const faculty = await getInstitutionalApproverOptionsService()
    res.json(new ApiResponse(200, "Institutional approver options", { faculty }))
})

export const createInstitutionalApprover = asyncHandler(async (req, res) => {
    const approver = await createInstitutionalApproverService({
        ...req.validatedBody,
        actorUserId: req.user.id,
    })
    res.status(201).json(
        new ApiResponse(201, "Institutional approver added", {
            approver,
        })
    )
})

export const updateInstitutionalApprover = asyncHandler(async (req, res) => {
    const approver = await updateInstitutionalApproverService({
        id: req.validatedParams.id,
        changes: req.validatedBody,
        actorUserId: req.user.id,
    })
    res.json(new ApiResponse(200, "Institutional approver updated", { approver }))
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
