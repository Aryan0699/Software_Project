import {
    cancelRestriction as cancelRestrictionService,
    createBuilding as createBuildingService,
    createDepartment as createDepartmentService,
    createRestriction as createRestrictionService,
    createRoom as createRoomService,
    createRoomType as createRoomTypeService,
    listBuildings as listBuildingsService,
    listDepartments as listDepartmentsService,
    listRestrictions as listRestrictionsService,
    listRooms as listRoomsService,
    listRoomTypes as listRoomTypesService,
    updateBuilding as updateBuildingService,
    updateDepartment as updateDepartmentService,
    updateRoom as updateRoomService,
    updateRoomType as updateRoomTypeService,
} from "../services/facilities.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const listDepartments = asyncHandler(async (req, res) => {
    const result = await listDepartmentsService(req.validatedQuery, req.user)
    res.json(new ApiResponse(200, "Departments", result))
})

export const createDepartment = asyncHandler(async (req, res) => {
    const department = await createDepartmentService(req.validatedBody)
    res.status(201).json(
        new ApiResponse(201, "Department created", { department })
    )
})

export const updateDepartment = asyncHandler(async (req, res) => {
    const department = await updateDepartmentService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Department updated", { department }))
})

export const listRoomTypes = asyncHandler(async (req, res) => {
    const result = await listRoomTypesService(req.validatedQuery, req.user)
    res.json(new ApiResponse(200, "Room types", result))
})

export const createRoomType = asyncHandler(async (req, res) => {
    const roomType = await createRoomTypeService(req.validatedBody)
    res.status(201).json(
        new ApiResponse(201, "Room type created", { roomType })
    )
})

export const updateRoomType = asyncHandler(async (req, res) => {
    const roomType = await updateRoomTypeService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Room type updated", { roomType }))
})

export const listBuildings = asyncHandler(async (req, res) => {
    const result = await listBuildingsService(req.validatedQuery, req.user)
    res.json(new ApiResponse(200, "Buildings", result))
})

export const createBuilding = asyncHandler(async (req, res) => {
    const building = await createBuildingService(req.validatedBody)
    res.status(201).json(
        new ApiResponse(201, "Building created", { building })
    )
})

export const updateBuilding = asyncHandler(async (req, res) => {
    const building = await updateBuildingService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Building updated", { building }))
})

export const listRooms = asyncHandler(async (req, res) => {
    const result = await listRoomsService(req.validatedQuery, req.user)
    res.json(new ApiResponse(200, "Rooms", result))
})

export const createRoom = asyncHandler(async (req, res) => {
    const room = await createRoomService(req.validatedBody)
    res.status(201).json(new ApiResponse(201, "Room created", { room }))
})

export const updateRoom = asyncHandler(async (req, res) => {
    const room = await updateRoomService(
        req.validatedParams.id,
        req.validatedBody
    )
    res.json(new ApiResponse(200, "Room updated", { room }))
})

export const listRestrictions = asyncHandler(async (req, res) => {
    const result = await listRestrictionsService(req.validatedQuery, req.user)
    res.json(new ApiResponse(200, "Room restrictions", result))
})

export const createRestriction = asyncHandler(async (req, res) => {
    const restriction = await createRestrictionService(
        req.validatedBody,
        req.user
    )
    res.status(201).json(
        new ApiResponse(201, "Room restriction created", { restriction })
    )
})

export const cancelRestriction = asyncHandler(async (req, res) => {
    const restriction = await cancelRestrictionService(
        req.validatedParams.id,
        req.user
    )
    res.json(
        new ApiResponse(200, "Room restriction cancelled", { restriction })
    )
})

