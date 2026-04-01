import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import { prisma } from "../db/index.js";
import logger from "../utils/logger.js";

// ==================== BUILDINGS ====================

export const getBuildings = asyncHandler(async (req, res) => {
    logger.info("Fetching active buildings for dropdown");
    const buildings = await prisma.building.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, location: true },
        orderBy: { code: "asc" },
    });
    logger.info(`Fetched ${buildings.length} buildings`);
    return res.status(200).json(
        new ApiResponse(200, "Buildings fetched successfully", buildings)
    );
});

// ==================== DEPARTMENTS ====================

export const getDepartments = asyncHandler(async (req, res) => {
    logger.info("Fetching active departments for dropdown");
    const departments = await prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
    });
    logger.info(`Fetched ${departments.length} departments`);
    return res.status(200).json(
        new ApiResponse(200, "Departments fetched successfully", departments)
    );
});

// ==================== ROOM TYPES ====================

export const getRoomTypes = asyncHandler(async (req, res) => {
    logger.info("Info: Fetching active room types for dropdown");
    const roomTypes = await prisma.roomType.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
    });
    logger.info(`Fetched ${roomTypes.length} room types`);
    return res.status(200).json(
        new ApiResponse(200, "Room types fetched successfully", roomTypes)
    );
});

// ==================== ROOM FEATURES ====================

export const getRoomFeatures = asyncHandler(async (req, res) => {
    logger.info("Info: Fetching active room features for dropdown");
    const roomFeatures = await prisma.roomFeature.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
    });
    logger.info(`Fetched ${roomFeatures.length} room features`);
    return res.status(200).json(
        new ApiResponse(200, "Room features fetched successfully", roomFeatures)
    );
});

// ==================== ROOMS ====================

export const getRooms = asyncHandler(async (req, res) => {
    const query = req.validated?.query ?? req.query;
    const { buildingId } = query;
    logger.info(`Info: Fetching active rooms${buildingId ? ` for building ${buildingId}` : ""}`);

    const where = { isActive: true };
    if (buildingId) where.buildingId = buildingId;

    const rooms = await prisma.room.findMany({
        where,
        select: {
            id: true,
            roomNumber: true,
            fullCode: true,
            displayName: true,
            capacity: true,
            building: { select: { id: true, code: true, name: true } },
            roomType: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ building: { code: "asc" } }, { roomNumber: "asc" }],
    });
    return res.status(200).json(
        new ApiResponse(200, "Rooms fetched successfully", rooms)
    );
});

// ==================== FACULTY ====================

export const getFacultyList = asyncHandler(async (req, res) => {
    logger.info("Info: Fetching active faculty for dropdown");
    const faculty = await prisma.user.findMany({
        where: { role: "FACULTY", isActive: true },
        select: {
            id: true,
            name: true,
            email: true,
            facultyProfile: {
                select: {
                    designation: true,
                    department: { select: { id: true, code: true, name: true } },
                },
            },
        },
        orderBy: { name: "asc" },
    });
    return res.status(200).json(
        new ApiResponse(200, "Faculty list fetched successfully", faculty)
    );
});

// ==================== STAFF ====================

export const getStaffList = asyncHandler(async (req, res) => {
    logger.info("Info: Fetching active staff for dropdown");
    const staff = await prisma.user.findMany({
        where: { role: "STAFF", isActive: true },
        select: {
            id: true,
            name: true,
            email: true,
            staffProfile: {
                select: { designation: true },
            },
        },
        orderBy: { name: "asc" },
    });
    return res.status(200).json(
        new ApiResponse(200, "Staff list fetched successfully", staff)
    );
});

// ==================== COURSES ====================

export const getCourses = asyncHandler(async (req, res) => {
    const { departmentId } = req.validated.query;
    logger.info(`Info: Fetching active courses${departmentId ? ` for department ${departmentId}` : ""}`);

    const where = { isActive: true };
    if (departmentId) where.departmentId = departmentId;

    const courses = await prisma.course.findMany({
        where,
        select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            department: { select: { id: true, code: true, name: true } },
        },
        orderBy: { code: "asc" },
    });
    return res.status(200).json(
        new ApiResponse(200, "Courses fetched successfully", courses)
    );
});

// ==================== SLOT SYSTEMS ====================

export const getSlotSystems = asyncHandler(async (req, res) => {
    logger.info("Info: Fetching active slot systems for dropdown");
    const slotSystems = await prisma.slotSystem.findMany({
        where: { isActive: true },
        select: {
            id: true,
            code: true,
            name: true,
            description: true,
        },
        orderBy: { code: "asc" },
    });
    return res.status(200).json(
        new ApiResponse(200, "Slot systems fetched successfully", slotSystems)
    );
});
