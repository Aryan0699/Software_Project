import {prisma} from "../db/index.js";
import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";

// ==================== STAFF-BUILDING ASSIGNMENTS ====================

export const assignStaffToBuilding = async ({ staffUserId, buildingId }) => {
    logger.info(`Assigning staff ${staffUserId} to building ${buildingId}`);

    const staffUser = await prisma.user.findUnique({
        where: { id: staffUserId },
        select: { id: true, role: true, isActive: true, name: true }
    });

    if (!staffUser) throw new ApiError(404, "Staff user not found");
    if (staffUser.role !== "STAFF") throw new ApiError(400, "User must have STAFF role to be assigned to a building");
    if (!staffUser.isActive) throw new ApiError(400, "Cannot assign inactive staff user to a building");

    const building = await prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true, code: true, name: true, isActive: true }
    });

    if (!building) throw new ApiError(404, "Building not found");
    if (!building.isActive) throw new ApiError(400, "Cannot assign staff to inactive building");

    const existingAssignment = await prisma.buildingStaffAssignment.findUnique({
        where: { buildingId_staffUserId: { buildingId, staffUserId } }
    });

    if (existingAssignment) throw new ApiError(409, "Staff is already assigned to this building");

    const assignment = await prisma.buildingStaffAssignment.create({
        data: { buildingId, staffUserId },
        include: {
            building: { select: { id: true, code: true, name: true } },
            staffUser: { select: { id: true, name: true, email: true } }
        }
    });

    logger.info(`Staff ${staffUserId} assigned to building ${buildingId}`);
    return assignment;
};

export const removeStaffFromBuilding = async ({ buildingId, staffUserId }) => {
    logger.info(`Removing staff ${staffUserId} from building ${buildingId}`);

    const assignment = await prisma.buildingStaffAssignment.findUnique({
        where: { buildingId_staffUserId: { buildingId, staffUserId } }
    });

    if (!assignment) throw new ApiError(404, "Assignment not found");

    await prisma.buildingStaffAssignment.delete({
        where: { buildingId_staffUserId: { buildingId, staffUserId } }
    });

    logger.info(`Staff ${staffUserId} removed from building ${buildingId}`);
    return { message: "Assignment removed successfully" };
};

export const updateStaffBuildingAssignment = async ({ buildingId, staffUserId, newStaffUserId, newBuildingId }) => {
    logger.info(`Updating staff-building assignment: building=${buildingId}, staff=${staffUserId}`);

    const existingAssignment = await prisma.buildingStaffAssignment.findUnique({
        where: { buildingId_staffUserId: { buildingId, staffUserId } }
    });

    if (!existingAssignment) throw new ApiError(404, "Assignment not found");

    const targetStaffId = newStaffUserId || staffUserId;
    const targetBuildingId = newBuildingId || buildingId;

    if (targetStaffId !== staffUserId) {
        const newStaff = await prisma.user.findUnique({
            where: { id: targetStaffId },
            select: { id: true, role: true, isActive: true }
        });
        if (!newStaff) throw new ApiError(404, "New staff user not found");
        if (newStaff.role !== "STAFF") throw new ApiError(400, "User must have STAFF role");
        if (!newStaff.isActive) throw new ApiError(400, "Cannot assign inactive staff user");
    }

    if (targetBuildingId !== buildingId) {
        const newBuilding = await prisma.building.findUnique({
            where: { id: targetBuildingId },
            select: { id: true, isActive: true }
        });
        if (!newBuilding) throw new ApiError(404, "New building not found");
        if (!newBuilding.isActive) throw new ApiError(400, "Cannot assign staff to inactive building");
    }

    if (targetStaffId !== staffUserId || targetBuildingId !== buildingId) {
        const duplicate = await prisma.buildingStaffAssignment.findUnique({
            where: { buildingId_staffUserId: { buildingId: targetBuildingId, staffUserId: targetStaffId } }
        });
        if (duplicate) throw new ApiError(409, "This staff-building combination already exists");
    }

    const result = await prisma.$transaction(async (tx) => {
        await tx.buildingStaffAssignment.delete({
            where: { buildingId_staffUserId: { buildingId, staffUserId } }
        });
        return tx.buildingStaffAssignment.create({
            data: { buildingId: targetBuildingId, staffUserId: targetStaffId },
            include: {
                building: { select: { id: true, code: true, name: true } },
                staffUser: { select: { id: true, name: true, email: true } }
            }
        });
    });

    logger.info(`Staff-building assignment updated`);
    return result;
};

export const getStaffBuildingAssignments = async ({ buildingId, staffUserId, page = 1, limit = 20 }) => {
    const where = {};
    if (buildingId) where.buildingId = buildingId;
    if (staffUserId) where.staffUserId = staffUserId;

    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
        prisma.buildingStaffAssignment.findMany({
            where, skip, take: limit,
            include: {
                building: { select: { id: true, code: true, name: true, isActive: true } },
                staffUser: { select: { id: true, name: true, email: true, isActive: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.buildingStaffAssignment.count({ where })
    ]);

    return { data: assignments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getBuildingsByStaff = async (staffUserId) => {
    const staffUser = await prisma.user.findUnique({
        where: { id: staffUserId }, select: { id: true, role: true }
    });
    if (!staffUser) throw new ApiError(404, "Staff user not found");

    const assignments = await prisma.buildingStaffAssignment.findMany({
        where: { staffUserId },
        include: {
            building: {
                select: { id: true, code: true, name: true, location: true, isActive: true, _count: { select: { rooms: true } } }
            }
        },
        orderBy: { building: { code: "asc" } }
    });

    return assignments.map(a => ({ createdAt: a.createdAt, ...a.building }));
};

export const getStaffByBuilding = async (buildingId) => {
    const building = await prisma.building.findUnique({
        where: { id: buildingId }, select: { id: true, code: true, name: true }
    });
    if (!building) throw new ApiError(404, "Building not found");

    const assignments = await prisma.buildingStaffAssignment.findMany({
        where: { buildingId },
        include: { staffUser: { select: { id: true, name: true, email: true, isActive: true } } },
        orderBy: { staffUser: { name: "asc" } }
    });

    return {
        building,
        staff: assignments.map(a => ({ createdAt: a.createdAt, ...a.staffUser }))
    };
};

// ==================== BOOKING HISTORY & MONITORING ====================

export const getBookingActionHistory = async ({
    bookingRequestId, performedByUserId, actionType, fromDate, toDate, page = 1, limit = 50
}) => {
    const where = {};
    if (bookingRequestId) where.bookingRequestId = bookingRequestId;
    if (performedByUserId) where.performedByUserId = performedByUserId;
    if (actionType) where.actionType = actionType;
    if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = new Date(fromDate);
        if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const [actions, total] = await Promise.all([
        prisma.bookingActionHistory.findMany({
            where, skip, take: limit,
            include: {
                bookingRequest: {
                    select: { id: true, title: true, status: true, room: { select: { fullCode: true, displayName: true } } }
                },
                performedByUser: { select: { id: true, name: true, email: true, role: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.bookingActionHistory.count({ where })
    ]);

    return { data: actions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getAllBookingRequests = async ({
    status, fromDate, toDate, buildingId, roomId, requesterId, page = 1, limit = 20
}) => {
    const where = {};
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (requesterId) where.requesterUserId = requesterId;
    if (buildingId) where.room = { buildingId };
    if (fromDate || toDate) {
        where.bookingDate = {};
        if (fromDate) where.bookingDate.gte = new Date(fromDate);
        if (toDate) where.bookingDate.lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
        prisma.bookingRequest.findMany({
            where, skip, take: limit,
            include: {
                requester: { select: { id: true, name: true, email: true, role: true } },
                room: {
                    select: { id: true, fullCode: true, displayName: true, building: { select: { id: true, code: true, name: true } } }
                },
                facultyReviewer: { select: { id: true, name: true, email: true } },
                staffReviewer: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.bookingRequest.count({ where })
    ]);

    return { data: bookings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getSystemStats = async () => {
    const [totalUsers, activeUsers, totalBuildings, activeRooms, totalBookings, pendingBookings, staffAssignments] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.building.count({ where: { isActive: true } }),
        prisma.room.count({ where: { isActive: true } }),
        prisma.bookingRequest.count(),
        prisma.bookingRequest.count({ where: { status: { in: ["PENDING_FACULTY", "PENDING_STAFF"] } } }),
        prisma.buildingStaffAssignment.count()
    ]);

    const bookingsByStatus = await prisma.bookingRequest.groupBy({ by: ["status"], _count: { status: true } });
    const usersByRole = await prisma.user.groupBy({ by: ["role"], _count: { role: true } });

    return {
        users: { total: totalUsers, active: activeUsers, byRole: usersByRole.reduce((acc, i) => { acc[i.role] = i._count.role; return acc; }, {}) },
        buildings: { total: totalBuildings, withStaffAssignments: staffAssignments },
        rooms: { active: activeRooms },
        bookings: { total: totalBookings, pending: pendingBookings, byStatus: bookingsByStatus.reduce((acc, i) => { acc[i.status] = i._count.status; return acc; }, {}) }
    };
};

// ==================== APPROVED USERS CRUD ====================

export const createApprovedUser = async ({ email, role }) => {
    logger.info(`Creating approved user: ${email} with role ${role}`);

    const emailNormalized = email.toLowerCase().trim();
    const existing = await prisma.approvedUser.findUnique({
        where: { email: emailNormalized },
    });
    if (existing) {
        throw new ApiError(409, `Approved user with email "${emailNormalized}" already exists with role ${existing.role}`);
    }

    return prisma.approvedUser.create({
        data: { email: emailNormalized, role },
    });
};

export const listApprovedUsers = async ({ role, page = 1, limit = 20 }) => {
    const where = {};
    if (role) where.role = role;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.approvedUser.findMany({
            where,
            skip,
            take: limit,
            orderBy: { email: "asc" },
        }),
        prisma.approvedUser.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateApprovedUser = async (id, { role }) => {
    const existing = await prisma.approvedUser.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Approved user not found");

    const updated = await prisma.approvedUser.update({
        where: { id },
        data: { role },
    });

    // Also update the already-registered user's role if they exist
    const registeredUser = await prisma.user.findUnique({
        where: { email: existing.email },
    });
    if (registeredUser && registeredUser.role !== role) {
        await prisma.user.update({
            where: { id: registeredUser.id },
            data: { role },
        });
        logger.info(`Also updated registered user ${registeredUser.email} role to ${role}`);
    }

    return updated;
};

export const deleteApprovedUser = async (id) => {
    const existing = await prisma.approvedUser.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Approved user not found");

    await prisma.approvedUser.delete({ where: { id } });
    return { message: "Approved user removed" };
};
