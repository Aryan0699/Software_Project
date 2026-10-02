import {
    createDraft as createDraftService,
    createSlot as createSlotService,
    createSlotSystem as createSlotSystemService,
    deleteSlot as deleteSlotService,
    discardGrid as discardGridService,
    getGrid as getGridService,
    listSlotSystems as listSlotSystemsService,
    lockGrid as lockGridService,
    toggleGridCell as toggleGridCellService,
    updateGridRange as updateGridRangeService,
    updateSlot as updateSlotService,
    updateSlotSystem as updateSlotSystemService,
} from "../services/slotSystems.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const listSlotSystems = asyncHandler(async (_req, res) => {
    res.json(
        new ApiResponse(200, "Slot systems", {
            slotSystems: await listSlotSystemsService(),
        })
    )
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

export const getGrid = asyncHandler(async (req, res) => {
    res.json(
        new ApiResponse(200, "Slot grid", {
            grid: await getGridService(req.validatedParams.id),
        })
    )
})

export const createDraft = asyncHandler(async (req, res) => {
    const grid = await createDraftService(
        req.validatedParams.id,
        req.validatedBody,
        req.user.id
    )
    res.status(201).json(new ApiResponse(201, "Draft grid created", { grid }))
})

export const updateGridRange = asyncHandler(async (req, res) => {
    const grid = await updateGridRangeService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Grid hours updated", { grid }))
})

export const createSlot = asyncHandler(async (req, res) => {
    const grid = await createSlotService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.status(201).json(new ApiResponse(201, "Slot created", { grid }))
})

export const updateSlot = asyncHandler(async (req, res) => {
    const grid = await updateSlotService(
        req.validatedParams.id,
        req.validatedParams.slotId,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Slot updated", { grid }))
})

export const deleteSlot = asyncHandler(async (req, res) => {
    const grid = await deleteSlotService(
        req.validatedParams.id,
        req.validatedParams.slotId
    )
    res.json(new ApiResponse(200, "Slot deleted", { grid }))
})

export const toggleGridCell = asyncHandler(async (req, res) => {
    const grid = await toggleGridCellService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Grid period updated", { grid }))
})

export const lockGrid = asyncHandler(async (req, res) => {
    const grid = await lockGridService(req.validatedParams.id)
    res.json(new ApiResponse(200, "Slot grid locked", { grid }))
})

export const discardGrid = asyncHandler(async (req, res) => {
    const grid = await discardGridService(req.validatedParams.id)
    res.json(new ApiResponse(200, "Draft grid discarded", { grid }))
})
