import {
    getAvailabilityTimelineConfig as getAvailabilityTimelineConfigService,
    getRoomTimeline as getRoomTimelineService,
    searchRoomAvailability as searchRoomAvailabilityService,
} from "../services/availability.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const searchRoomAvailability = asyncHandler(async (req, res) => {
    const result = await searchRoomAvailabilityService(
        req.validatedQuery,
        req.user
    )
    res.json(new ApiResponse(200, "Room availability", result))
})

export const getRoomTimeline = asyncHandler(async (req, res) => {
    const timeline = await getRoomTimelineService(
        req.validatedParams.id,
        req.validatedQuery.date,
        req.user
    )
    res.json(new ApiResponse(200, "Room timeline", { timeline }))
})

export const getAvailabilityTimelineConfig = asyncHandler(async (req, res) => {
    const result = await getAvailabilityTimelineConfigService(
        req.validatedQuery.date
    )
    res.json(
        new ApiResponse(200, "Availability timeline configuration", result)
    )
})
