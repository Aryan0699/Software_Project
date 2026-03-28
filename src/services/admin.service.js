import {prisma} from "../db/index.js";
import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";

// ==================== STAFF-BUILDING ASSIGNMENTS ====================

/**
 * Assign a staff member to a building
 */
export const assignStaffToBuilding = async ({ staffUserId, buildingId }) => {
    logger.info(`Assigning staff ${staffUserId} to building ${buildingId}`);

    // Verify staff user exists and has STAFF role
    const staffUser = await prisma.user.findUnique({
        where: { id: staffUserId },
        select: { id: true, role: true, isActive: true, name: true }
    });

    if (!staffUser) {
        throw new ApiError(404, "Staff user not found");
    }

    if (staffUser.role !== "STAFF") {
        throw new ApiError(400, "User must have STAFF role to be assigned to a building");
    }

    if (!staffUser.isActive) {
        throw new ApiError(400, "Cannot assign inactive staff user to a building");
    }

    // Verify building exists
    const building = await prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true, code: true, name: true, isActive: true }
    });

    if (!building) {
        throw new ApiError(404, "Building not found");
    }

    if (!building.isActive) {
        throw new ApiError(400, "Cannot assign staff to inactive building");
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.buildingStaffAssignment.findUnique({
        where: {
            buildingId_staffUserId: {
                buildingId,
                staffUserId
            }
        }
    });

    if (existingAssignment) {
        throw new ApiError(409, "Staff is already assigned to this building");
    }

    // Create assignment
    const assignment = await prisma.buildingStaffAssignment.create({
        data: {
            buildingId,
            staffUserId
        },
        include: {
            building: {
                select: { id: true, code: true, name: true }
            },
            staffUser: {
                select: { id: true, name: true, email: true }
            }
        }
    });

    logger.info(`Staff ${staffUserId} assigned to building ${buildingId}`);
    return assignment;
};

/**
 * Remove a staff-building assignment (by composite key)
 */
export const removeStaffFromBuilding = async ({ buildingId, staffUserId }) => {
    logger.info(`Removing staff ${staffUserId} from building ${buildingId}`);

    const assignment = await prisma.buildingStaffAssignment.findUnique({
        where: {
            buildingId_staffUserId: { buildingId, staffUserId }
        }
    });

    if (!assignment) {
        throw new ApiError(404, "Assignment not found");
    }

    await prisma.buildingStaffAssignment.delete({
        where: {
            buildingId_staffUserId: { buildingId, staffUserId }
        }
    });

    logger.info(`Staff ${staffUserId} removed from building ${buildingId}`);
    return { message: "Assignment removed successfully" };
};

/**
 * Update a staff-building assignment (replace staff or building on an existing link)
 */
export const updateStaffBuildingAssignment = async ({ buildingId, staffUserId, newStaffUserId, newBuildingId }) => {
    logger.info(`Updating staff-building assignment: building=${buildingId}, staff=${staffUserId}`);

    // Verify old assignment exists
    const existingAssignment = await prisma.buildingStaffAssignment.findUnique({
        where: {
            buildingId_staffUserId: { buildingId, staffUserId }
        }
    });

    if (!existingAssignment) {
        throw new ApiError(404, "Assignment not found");
    }

    const targetStaffId = newStaffUserId || staffUserId;
    const targetBuildingId = newBuildingId || buildingId;

    if (targetStaffId !== staffUserId) {
        // Verify new staff user
        const newStaff = await prisma.user.findUnique({
            where: { id: targetStaffId },
            select: { id: true, role: true, isActive: true }
        });
        if (!newStaff) throw new ApiError(404, "New staff user not found");
        if (newStaff.role !== "STAFF") throw new ApiError(400, "User must have STAFF role");
        if (!newStaff.isActive) throw new ApiError(400, "Cannot assign inactive staff user");
    }

    if (targetBuildingId !== buildingId) {
        // Verify new building
        const newBuilding = await prisma.building.findUnique({
            where: { id: targetBuildingId },
            select: { id: true, isActive: true }
        });
        if (!newBuilding) throw new ApiError(404, "New building not found");
        if (!newBuilding.isActive) throw new ApiError(400, "Cannot assign staff to inactive building");
    }

    // Check for duplicate
    if (targetStaffId !== staffUserId || targetBuildingId !== buildingId) {
        const duplicate = await prisma.buildingStaffAssignment.findUnique({
            where: {
                buildingId_staffUserId: {
                    buildingId: targetBuildingId,
                    staffUserId: targetStaffId
                }
            }
        });
        if (duplicate) {
            throw new ApiError(409, "This staff-building combination already exists");
        }
    }

    // Delete old + create new (composite key can't be updated in place)
    const result = await prisma.$transaction(async (tx) => {
        await tx.buildingStaffAssignment.delete({
            where: {
                buildingId_staffUserId: { buildingId, staffUserId }
            }
        });
        return tx.buildingStaffAssignment.create({
            data: {
                buildingId: targetBuildingId,
                staffUserId: targetStaffId,
            },
            include: {
                building: {
                    select: { id: true, code: true, name: true }
                },
                staffUser: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    });

    logger.info(`Staff-building assignment updated`);
    return result;
};

/**
 * Get staff-building assignments with optional filters
 */
export const getStaffBuildingAssignments = async ({ buildingId, staffUserId, page = 1, limit = 20 }) => {
    logger.info(`Fetching staff-building assignments with filters`);

    const where = {};
    if (buildingId) where.buildingId = buildingId;
    if (staffUserId) where.staffUserId = staffUserId;

    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
        prisma.buildingStaffAssignment.findMany({
            where,
            skip,
            take: limit,
            include: {
                building: {
                    select: { id: true, code: true, name: true, isActive: true }
                },
                staffUser: {
                    select: { id: true, name: true, email: true, isActive: true }
                }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.buildingStaffAssignment.count({ where })
    ]);

    logger.info(`Found ${assignments.length} assignments (total: ${total})`);
    return {
        data: assignments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get all buildings assigned to a specific staff member
 */
export const getBuildingsByStaff = async (staffUserId) => {
    logger.info(`Fetching buildings for staff ${staffUserId}`);

    const staffUser = await prisma.user.findUnique({
        where: { id: staffUserId },
        select: { id: true, role: true }
    });

    if (!staffUser) {
        throw new ApiError(404, "Staff user not found");
    }

    const assignments = await prisma.buildingStaffAssignment.findMany({
        where: { staffUserId },
        include: {
            building: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    location: true,
                    isActive: true,
                    _count: {
                        select: { rooms: true }
                    }
                }
            }
        },
        orderBy: { building: { code: "asc" } }
    });

    logger.info(`Found ${assignments.length} buildings for staff ${staffUserId}`);
    return assignments.map(a => ({
        createdAt: a.createdAt,
        ...a.building
    }));
};

/**
 * Get all staff members assigned to a specific building
 */
export const getStaffByBuilding = async (buildingId) => {
    logger.info(`Fetching staff for building ${buildingId}`);

    const building = await prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true, code: true, name: true }
    });

    if (!building) {
        throw new ApiError(404, "Building not found");
    }

    const assignments = await prisma.buildingStaffAssignment.findMany({
        where: { buildingId },
        include: {
            staffUser: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    isActive: true
                }
            }
        },
        orderBy: { staffUser: { name: "asc" } }
    });

    logger.info(`Found ${assignments.length} staff members for building ${buildingId}`);
    return {
        building,
        staff: assignments.map(a => ({
            createdAt: a.createdAt,
            ...a.staffUser
        }))
    };
};

// ==================== BOOKING HISTORY & MONITORING ====================

/**
 * Get booking action history with filters
 */
export const getBookingActionHistory = async ({
    bookingRequestId,
    performedByUserId,
    actionType,
    fromDate,
    toDate,
    page = 1,
    limit = 50
}) => {
    logger.info("Fetching booking action history with filters");

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
            where,
            skip,
            take: limit,
            include: {
                bookingRequest: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        room: {
                            select: { fullCode: true, displayName: true }
                        }
                    }
                },
                performedByUser: {
                    select: { id: true, name: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.bookingActionHistory.count({ where })
    ]);

    logger.info(`Found ${actions.length} action history entries (total: ${total})`);
    return {
        data: actions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get all booking requests with filters (admin view)
 */
export const getAllBookingRequests = async ({
    status,
    fromDate,
    toDate,
    buildingId,
    roomId,
    requesterId,
    page = 1,
    limit = 20
}) => {
    logger.info("Fetching all booking requests for admin view");

    const where = {};

    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (requesterId) where.requesterUserId = requesterId;

    if (buildingId) {
        where.room = { buildingId };
    }

    if (fromDate || toDate) {
        where.bookingDate = {};
        if (fromDate) where.bookingDate.gte = new Date(fromDate);
        if (toDate) where.bookingDate.lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
        prisma.bookingRequest.findMany({
            where,
            skip,
            take: limit,
            include: {
                requester: {
                    select: { id: true, name: true, email: true, role: true }
                },
                room: {
                    select: {
                        id: true,
                        fullCode: true,
                        displayName: true,
                        building: {
                            select: { id: true, code: true, name: true }
                        }
                    }
                },
                facultyReviewer: {
                    select: { id: true, name: true, email: true }
                },
                staffReviewer: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.bookingRequest.count({ where })
    ]);

    logger.info(`Found ${bookings.length} booking requests (total: ${total})`);
    return {
        data: bookings,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get system statistics for admin dashboard
 */
export const getSystemStats = async () => {
    logger.info("Fetching system statistics");

    const [
        totalUsers,
        activeUsers,
        totalBuildings,
        activeRooms,
        totalBookings,
        pendingBookings,
        staffAssignments
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.building.count({ where: { isActive: true } }),
        prisma.room.count({ where: { isActive: true } }),
        prisma.bookingRequest.count(),
        prisma.bookingRequest.count({
            where: {
                status: { in: ["PENDING_FACULTY", "PENDING_STAFF"] }
            }
        }),
        prisma.buildingStaffAssignment.count()
    ]);

    // Bookings by status
    const bookingsByStatus = await prisma.bookingRequest.groupBy({
        by: ["status"],
        _count: { status: true }
    });

    // Users by role
    const usersByRole = await prisma.user.groupBy({
        by: ["role"],
        _count: { role: true }
    });

    return {
        users: {
            total: totalUsers,
            active: activeUsers,
            byRole: usersByRole.reduce((acc, item) => {
                acc[item.role] = item._count.role;
                return acc;
            }, {})
        },
        buildings: {
            total: totalBuildings,
            withStaffAssignments: staffAssignments
        },
        rooms: {
            active: activeRooms
        },
        bookings: {
            total: totalBookings,
            pending: pendingBookings,
            byStatus: bookingsByStatus.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {})
        }
    };
};
