import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../utils/logger.js";
import {
    assignStaffToBuilding,
    removeStaffFromBuilding,
    updateStaffBuildingAssignment,
    getStaffBuildingAssignments,
    getBuildingsByStaff,
    getStaffByBuilding,
    getBookingActionHistory,
    getAllBookingRequests,
    getSystemStats,
} from "../services/admin.service.js";

// ==================== STAFF-BUILDING ASSIGNMENTS ====================

export const assignStaff = asyncHandler(async (req, res) => {
    const { staffUserId, buildingId } = req.body;
    logger.info(`Admin assigning staff ${staffUserId} to building ${buildingId}`);

    const assignment = await assignStaffToBuilding({ staffUserId, buildingId });

    return res.status(201).json(
        new ApiResponse(201, "Staff assigned to building successfully", assignment)
    );
});

export const removeStaff = asyncHandler(async (req, res) => {
    const { buildingId, staffUserId } = req.params;
    logger.info(`Admin removing staff ${staffUserId} from building ${buildingId}`);

    const result = await removeStaffFromBuilding({ buildingId, staffUserId });

    return res.status(200).json(
        new ApiResponse(200, result.message)
    );
});

export const updateAssignment = asyncHandler(async (req, res) => {
    const { buildingId, staffUserId } = req.params;
    const { newStaffUserId, newBuildingId } = req.body;
    logger.info(`Admin updating assignment: building=${buildingId}, staff=${staffUserId}`);

    const updated = await updateStaffBuildingAssignment({
        buildingId,
        staffUserId,
        newStaffUserId,
        newBuildingId,
    });

    return res.status(200).json(
        new ApiResponse(200, "Assignment updated successfully", updated)
    );
});

export const getAssignments = asyncHandler(async (req, res) => {
    const { buildingId, staffUserId, page, limit } = req.query;
    logger.info("Admin fetching staff-building assignments");

    const result = await getStaffBuildingAssignments({
        buildingId,
        staffUserId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json(
        new ApiResponse(200, "Assignments fetched successfully", result)
    );
});

export const getBuildingsForStaff = asyncHandler(async (req, res) => {
    const { staffUserId } = req.params;
    logger.info(`Admin fetching buildings for staff ${staffUserId}`);

    const buildings = await getBuildingsByStaff(staffUserId);

    return res.status(200).json(
        new ApiResponse(200, "Buildings fetched successfully", buildings)
    );
});

export const getStaffForBuilding = asyncHandler(async (req, res) => {
    const { buildingId } = req.params;
    logger.info(`Admin fetching staff for building ${buildingId}`);

    const result = await getStaffByBuilding(buildingId);

    return res.status(200).json(
        new ApiResponse(200, "Staff fetched successfully", result)
    );
});

// ==================== BOOKING HISTORY & MONITORING ====================

export const getBookingHistory = asyncHandler(async (req, res) => {
    logger.info("Admin fetching booking action history");

    const result = await getBookingActionHistory(req.query);

    return res.status(200).json(
        new ApiResponse(200, "Booking action history fetched successfully", result)
    );
});

export const getAllBookings = asyncHandler(async (req, res) => {
    logger.info("Admin fetching all booking requests");

    const result = await getAllBookingRequests(req.query);

    return res.status(200).json(
        new ApiResponse(200, "All booking requests fetched successfully", result)
    );
});

export const getStats = asyncHandler(async (req, res) => {
    logger.info("Admin fetching system stats");

    const stats = await getSystemStats();

    return res.status(200).json(
        new ApiResponse(200, "System statistics fetched successfully", stats)
    );
});
