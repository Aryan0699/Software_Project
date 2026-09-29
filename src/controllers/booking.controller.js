import {
    createBookingRequest as createBookingRequestService,
    getBookingRequest as getBookingRequestService,
    listBookingRequests as listBookingRequestsService,
    listFacultyVerifiers as listFacultyVerifiersService,
} from "../services/bookingRequests.service.js"
import {
    decideApproval as decideApprovalService,
    getFinalizationPreview as getFinalizationPreviewService,
    listMyApprovals as listMyApprovalsService,
} from "../services/approvals.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const listFacultyVerifiers = asyncHandler(async (req, res) => {
    const result = await listFacultyVerifiersService(req.validatedQuery)
    res.json(new ApiResponse(200, "Faculty verifiers", result))
})

export const createBookingRequest = asyncHandler(async (req, res) => {
    const result = await createBookingRequestService(
        req.validatedBody,
        req.user
    )
    res.status(result.created ? 201 : 200).json(
        new ApiResponse(
            result.created ? 201 : 200,
            result.created
                ? "Booking request submitted"
                : "Booking request already submitted",
            { request: result.request }
        )
    )
})

export const listBookingRequests = asyncHandler(async (req, res) => {
    const result = await listBookingRequestsService(
        req.validatedQuery,
        req.user
    )
    res.json(new ApiResponse(200, "Booking requests", result))
})

export const getBookingRequest = asyncHandler(async (req, res) => {
    const request = await getBookingRequestService(
        req.validatedParams.id,
        req.user
    )
    res.json(new ApiResponse(200, "Booking request", { request }))
})

export const listMyApprovals = asyncHandler(async (req, res) => {
    const result = await listMyApprovalsService(req.validatedQuery, req.user)
    res.json(new ApiResponse(200, "Approval tasks", result))
})

export const getFinalizationPreview = asyncHandler(async (req, res) => {
    const preview = await getFinalizationPreviewService(
        req.validatedParams.approvalId,
        req.user
    )
    res.json(new ApiResponse(200, "Final approval preview", { preview }))
})

export const decideApproval = asyncHandler(async (req, res) => {
    const result = await decideApprovalService(
        req.validatedParams.approvalId,
        req.validatedBody,
        req.user
    )
    res.json(new ApiResponse(200, "Approval decision recorded", result))
})
