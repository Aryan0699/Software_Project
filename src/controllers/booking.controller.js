import {
    cancelBookingRequest as cancelBookingRequestService,
    createBookingRequest as createBookingRequestService,
    exportBookingRequests as exportBookingRequestsService,
    getBookingDashboard as getBookingDashboardService,
    getBookingFilterOptions as getBookingFilterOptionsService,
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

export const getBookingFilterOptions = asyncHandler(async (req, res) => {
    const options = await getBookingFilterOptionsService(req.user)
    res.json(new ApiResponse(200, "Booking filter options", { options }))
})

export const exportBookingRequests = asyncHandler(async (req, res) => {
    const csv = await exportBookingRequestsService(req.validatedQuery, req.user)
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="uras-bookings-${new Date().toISOString().slice(0, 10)}.csv"`
    )
    res.send(`\uFEFF${csv}`)
})

export const getBookingDashboard = asyncHandler(async (req, res) => {
    const dashboard = await getBookingDashboardService(req.user)
    res.json(new ApiResponse(200, "Booking dashboard", { dashboard }))
})

export const cancelBookingRequest = asyncHandler(async (req, res) => {
    const request = await cancelBookingRequestService(
        req.validatedParams.id,
        req.validatedBody.reason,
        req.user
    )
    res.json(new ApiResponse(200, "Booking request cancelled", { request }))
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
