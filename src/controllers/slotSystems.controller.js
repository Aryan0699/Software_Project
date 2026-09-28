import {
    activateInitialGridVersion as activateInitialGridVersionService,
    createGridVersion as createGridVersionService,
    createSlot as createSlotService,
    createSlotSystem as createSlotSystemService,
    deleteSlot as deleteSlotService,
    discardGridVersion as discardGridVersionService,
    getGridVersion as getGridVersionService,
    listSlotSystems as listSlotSystemsService,
    updateSlot as updateSlotService,
    updateSlotSystem as updateSlotSystemService,
} from "../services/slotSystems.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const listSlotSystems = asyncHandler(async (req, res) => {
    const result = await listSlotSystemsService(req.validatedQuery)
    res.json(new ApiResponse(200, "Slot systems", result))
})

export const createSlotSystem = asyncHandler(async (req, res) => {
    const slotSystem = await createSlotSystemService(req.validatedBody)
    res.status(201).json(
        new ApiResponse(201, "Slot system created", { slotSystem })
    )
})

export const updateSlotSystem = asyncHandler(async (req, res) => {
    const slotSystem = await updateSlotSystemService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Slot system updated", { slotSystem }))
})

export const getGridVersion = asyncHandler(async (req, res) => {
    const grid = await getGridVersionService(
        req.validatedParams.systemId,
        req.validatedParams.gridId
    )
    res.json(new ApiResponse(200, "Slot grid version", { grid }))
})

export const createGridVersion = asyncHandler(async (req, res) => {
    const grid = await createGridVersionService(
        req.validatedParams.id,
        req.validatedBody,
        req.user.id
    )
    res.status(201).json(
        new ApiResponse(201, "Draft slot grid created", { grid })
    )
})

export const activateInitialGridVersion = asyncHandler(async (req, res) => {
    const grid = await activateInitialGridVersionService(
        req.validatedParams.systemId,
        req.validatedParams.gridId
    )
    res.json(new ApiResponse(200, "Initial slot grid activated", { grid }))
})

export const discardGridVersion = asyncHandler(async (req, res) => {
    const grid = await discardGridVersionService(
        req.validatedParams.systemId,
        req.validatedParams.gridId
    )
    res.json(new ApiResponse(200, "Draft slot grid discarded", { grid }))
})

export const createSlot = asyncHandler(async (req, res) => {
    const result = await createSlotService(
        req.validatedParams.systemId,
        req.validatedParams.gridId,
        req.validatedBody
    )
    res.status(201).json(new ApiResponse(201, "Slot created", result))
})

export const updateSlot = asyncHandler(async (req, res) => {
    const result = await updateSlotService(
        req.validatedParams.systemId,
        req.validatedParams.gridId,
        req.validatedParams.slotId,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Slot updated", result))
})

export const deleteSlot = asyncHandler(async (req, res) => {
    await deleteSlotService(
        req.validatedParams.systemId,
        req.validatedParams.gridId,
        req.validatedParams.slotId
    )
    res.json(new ApiResponse(200, "Slot deleted", null))
})
