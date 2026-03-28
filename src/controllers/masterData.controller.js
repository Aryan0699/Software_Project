import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../utils/logger.js";
import * as masterDataService from "../services/masterData.service.js";

// ==================== BUILDINGS ====================

export const createBuilding = asyncHandler(async (req, res) => {
    const building = await masterDataService.createBuilding(req.body);
    logger.info(`Building created: ${building.code}`);
    return res.status(201).json(new ApiResponse(201, "Building created successfully", building));
});

export const getBuilding = asyncHandler(async (req, res) => {
    const building = await masterDataService.getBuildingById(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Building fetched successfully", building));
});

export const listBuildings = asyncHandler(async (req, res) => {
    const result = await masterDataService.listBuildings(req.query);
    return res.status(200).json(new ApiResponse(200, "Buildings fetched successfully", result));
});

export const updateBuilding = asyncHandler(async (req, res) => {
    const building = await masterDataService.updateBuilding(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, "Building updated successfully", building));
});

export const softDeleteBuilding = asyncHandler(async (req, res) => {
    const building = await masterDataService.softDeleteBuilding(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Building deactivated", building));
});

export const hardDeleteBuilding = asyncHandler(async (req, res) => {
    const result = await masterDataService.hardDeleteBuilding(req.params.id);
    return res.status(200).json(new ApiResponse(200, result.message));
});

// ==================== ROOMS ====================

export const createRoom = asyncHandler(async (req, res) => {
    const room = await masterDataService.createRoom(req.body);
    logger.info(`Room created: ${room.fullCode}`);
    return res.status(201).json(new ApiResponse(201, "Room created successfully", room));
});

export const getRoom = asyncHandler(async (req, res) => {
    const room = await masterDataService.getRoomById(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Room fetched successfully", room));
});

export const listRooms = asyncHandler(async (req, res) => {
    const result = await masterDataService.listRooms(req.query);
    return res.status(200).json(new ApiResponse(200, "Rooms fetched successfully", result));
});

export const updateRoom = asyncHandler(async (req, res) => {
    const room = await masterDataService.updateRoom(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, "Room updated successfully", room));
});

export const softDeleteRoom = asyncHandler(async (req, res) => {
    const room = await masterDataService.softDeleteRoom(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Room deactivated", room));
});

export const hardDeleteRoom = asyncHandler(async (req, res) => {
    const result = await masterDataService.hardDeleteRoom(req.params.id);
    return res.status(200).json(new ApiResponse(200, result.message));
});

// ==================== ROOM TYPES ====================

export const createRoomType = asyncHandler(async (req, res) => {
    const rt = await masterDataService.createRoomType(req.body);
    return res.status(201).json(new ApiResponse(201, "Room type created successfully", rt));
});

export const listRoomTypes = asyncHandler(async (req, res) => {
    const result = await masterDataService.listRoomTypes(req.query);
    return res.status(200).json(new ApiResponse(200, "Room types fetched successfully", result));
});

export const updateRoomType = asyncHandler(async (req, res) => {
    const rt = await masterDataService.updateRoomType(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, "Room type updated successfully", rt));
});

export const softDeleteRoomType = asyncHandler(async (req, res) => {
    const rt = await masterDataService.softDeleteRoomType(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Room type deactivated", rt));
});

export const hardDeleteRoomType = asyncHandler(async (req, res) => {
    const result = await masterDataService.hardDeleteRoomType(req.params.id);
    return res.status(200).json(new ApiResponse(200, result.message));
});

// ==================== ROOM FEATURES ====================

export const createRoomFeature = asyncHandler(async (req, res) => {
    const rf = await masterDataService.createRoomFeature(req.body);
    return res.status(201).json(new ApiResponse(201, "Room feature created successfully", rf));
});

export const listRoomFeatures = asyncHandler(async (req, res) => {
    const result = await masterDataService.listRoomFeatures(req.query);
    return res.status(200).json(new ApiResponse(200, "Room features fetched successfully", result));
});

export const updateRoomFeature = asyncHandler(async (req, res) => {
    const rf = await masterDataService.updateRoomFeature(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, "Room feature updated successfully", rf));
});

export const softDeleteRoomFeature = asyncHandler(async (req, res) => {
    const rf = await masterDataService.softDeleteRoomFeature(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Room feature deactivated", rf));
});

export const hardDeleteRoomFeature = asyncHandler(async (req, res) => {
    const result = await masterDataService.hardDeleteRoomFeature(req.params.id);
    return res.status(200).json(new ApiResponse(200, result.message));
});

export const assignFeatureToRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const assignment = await masterDataService.assignFeatureToRoom({ roomId, ...req.body });
    return res.status(201).json(new ApiResponse(201, "Feature assigned to room", assignment));
});

export const removeFeatureFromRoom = asyncHandler(async (req, res) => {
    const { roomId, featureId } = req.params;
    const result = await masterDataService.removeFeatureFromRoom({ roomId, featureId });
    return res.status(200).json(new ApiResponse(200, result.message));
});

// ==================== DEPARTMENTS ====================

export const createDepartment = asyncHandler(async (req, res) => {
    const dept = await masterDataService.createDepartment(req.body);
    return res.status(201).json(new ApiResponse(201, "Department created successfully", dept));
});

export const listDepartments = asyncHandler(async (req, res) => {
    const result = await masterDataService.listDepartments(req.query);
    return res.status(200).json(new ApiResponse(200, "Departments fetched successfully", result));
});

export const updateDepartment = asyncHandler(async (req, res) => {
    const dept = await masterDataService.updateDepartment(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, "Department updated successfully", dept));
});

export const softDeleteDepartment = asyncHandler(async (req, res) => {
    const dept = await masterDataService.softDeleteDepartment(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Department deactivated", dept));
});

export const hardDeleteDepartment = asyncHandler(async (req, res) => {
    const result = await masterDataService.hardDeleteDepartment(req.params.id);
    return res.status(200).json(new ApiResponse(200, result.message));
});

// ==================== SLOT SYSTEMS ====================

export const createSlotSystem = asyncHandler(async (req, res) => {
    const ss = await masterDataService.createSlotSystem(req.body);
    return res.status(201).json(new ApiResponse(201, "Slot system created successfully", ss));
});

export const getSlotSystem = asyncHandler(async (req, res) => {
    const ss = await masterDataService.getSlotSystemById(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Slot system fetched successfully", ss));
});

export const listSlotSystems = asyncHandler(async (req, res) => {
    const result = await masterDataService.listSlotSystems(req.query);
    return res.status(200).json(new ApiResponse(200, "Slot systems fetched successfully", result));
});

export const updateSlotSystem = asyncHandler(async (req, res) => {
    const ss = await masterDataService.updateSlotSystem(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, "Slot system updated successfully", ss));
});

export const softDeleteSlotSystem = asyncHandler(async (req, res) => {
    const ss = await masterDataService.softDeleteSlotSystem(req.params.id);
    return res.status(200).json(new ApiResponse(200, "Slot system deactivated", ss));
});

export const hardDeleteSlotSystem = asyncHandler(async (req, res) => {
    const result = await masterDataService.hardDeleteSlotSystem(req.params.id);
    return res.status(200).json(new ApiResponse(200, result.message));
});

// ==================== SLOT ALIASES ====================

export const createSlotAlias = asyncHandler(async (req, res) => {
    const alias = await masterDataService.createSlotAlias(req.body);
    return res.status(201).json(new ApiResponse(201, "Slot alias created successfully", alias));
});

export const listSlotAliases = asyncHandler(async (req, res) => {
    const result = await masterDataService.listSlotAliases(req.query);
    return res.status(200).json(new ApiResponse(200, "Slot aliases fetched successfully", result));
});

export const deleteSlotAlias = asyncHandler(async (req, res) => {
    const result = await masterDataService.deleteSlotAlias(req.params.id);
    return res.status(200).json(new ApiResponse(200, result.message));
});
