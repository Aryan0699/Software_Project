import {
    closeTerm as closeTermService,
    createException as createExceptionService,
    createTerm as createTermService,
    deactivateException as deactivateExceptionService,
    listExceptions as listExceptionsService,
    listTerms as listTermsService,
    previewExceptionImpact as previewExceptionImpactService,
    setCurrentTerm as setCurrentTermService,
    updateException as updateExceptionService,
    updateTerm as updateTermService,
} from "../services/academicCalendar.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const listTerms = asyncHandler(async (req, res) => {
    const result = await listTermsService(req.validatedQuery)
    res.json(new ApiResponse(200, "Academic terms", result))
})

export const createTerm = asyncHandler(async (req, res) => {
    const term = await createTermService(req.validatedBody)
    res.status(201).json(
        new ApiResponse(201, "Academic term created", { term })
    )
})

export const updateTerm = asyncHandler(async (req, res) => {
    const term = await updateTermService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Academic term updated", { term }))
})

export const setCurrentTerm = asyncHandler(async (req, res) => {
    const term = await setCurrentTermService(req.validatedParams.id)
    res.json(new ApiResponse(200, "Current academic term updated", { term }))
})

export const closeTerm = asyncHandler(async (req, res) => {
    const term = await closeTermService(req.validatedParams.id)
    res.json(new ApiResponse(200, "Academic term closed", { term }))
})

export const listExceptions = asyncHandler(async (req, res) => {
    const result = await listExceptionsService(req.validatedQuery)
    res.json(new ApiResponse(200, "Calendar exceptions", result))
})

export const previewExceptionImpact = asyncHandler(async (req, res) => {
    const result = await previewExceptionImpactService(req.validatedBody)
    res.json(new ApiResponse(200, "Calendar change impact", result))
})

export const createException = asyncHandler(async (req, res) => {
    const calendarException = await createExceptionService(
        req.validatedBody,
        req.user.id
    )
    res.status(201).json(
        new ApiResponse(201, "Calendar exception created", {
            calendarException,
        })
    )
})

export const updateException = asyncHandler(async (req, res) => {
    const calendarException = await updateExceptionService(
        req.validatedParams.id,
        req.validatedBody,
        req.user.id
    )
    res.json(
        new ApiResponse(200, "Calendar exception updated", {
            calendarException,
        })
    )
})

export const deactivateException = asyncHandler(async (req, res) => {
    const calendarException = await deactivateExceptionService(
        req.validatedParams.id,
        req.user.id
    )
    res.json(
        new ApiResponse(200, "Calendar exception deactivated", {
            calendarException,
        })
    )
})
