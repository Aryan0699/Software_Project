import { log } from "node:console";
import { prisma } from "../db/index.js";
import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";

// ==================== BUILDINGS ====================

export const createBuilding = async ({ code, name, location }) => {
    logger.info(`Creating building: ${code} - ${name}`);

    const existing = await prisma.building.findFirst({
        where: { OR: [{ code }, { name }] },
    });
    if (existing) {
        throw new ApiError(409, `Building with code "${code}" or name "${name}" already exists`);
    }

    return prisma.building.create({
        data: { code, name, location },
    });
};

export const getBuildingById = async (id) => {
    logger.info(`Fetching building with ID: ${id}`);
    const building = await prisma.building.findUnique({
        where: { id },
        include: {
            rooms: {
                select: {
                    id: true, roomNumber: true, fullCode: true,
                    displayName: true, capacity: true, isActive: true,
                    roomType: { select: { id: true, code: true, name: true } },
                },
                orderBy: { roomNumber: "asc" },
            },
            staffLinks: {
                include: {
                    staffUser: { select: { id: true, name: true, email: true } },
                },
            },
            _count: { select: { rooms: true } },
        },
    });
    logger.info(`Building fetch result for ID ${id}: ${building ? "Found" : "Not found"}`);

    if (!building){
        logger.warn(`Building with ID ${id} not found in database`);
        throw new ApiError(404, "Building not found");
    } 
    return building;
};

export const listBuildings = async ({ isActive, page = 1, limit = 20 }) => {
    const where = {};
    logger.info(`Listing buildings with filters: ${JSON.stringify(where)}`);
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;
    // Parellel execution using tx is a optimised version of this
    const [data, total] = await Promise.all([
        prisma.building.findMany({
            where,
            skip,
            take: limit,
            include: {
                _count: { select: { rooms: true, staffLinks: true } },
            },
            orderBy: { code: "asc" },
        }),
        prisma.building.count({ where }),
    ]);
    logger.info(`Buildings listed: ${data.length} out of total ${total}`);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateBuilding = async (id, data) => {
    logger.info(`Updating building with ID: ${id}`);
    const building = await prisma.building.findUnique({ where: { id } });
    if (!building) throw new ApiError(404, "Building not found");

    // Uniqueness check for code/name if changing
    if (data.code || data.name) {
        const conflicts = await prisma.building.findFirst({
            where: {
                id: { not: id },
                OR: [
                    ...(data.code ? [{ code: data.code }] : []),
                    ...(data.name ? [{ name: data.name }] : []),
                ],
            },
        });
        if (conflicts) {
            logger.warn(`Building with ID ${id} has conflicts.`);
            throw new ApiError(409, "Building with that code or name already exists");
        }
    }
    logger.info(`Building with ID ${id} found. Proceeding with update.`);
    return prisma.building.update({ where: { id }, data });
};

export const softDeleteBuilding = async (id) => {
    logger.info(`Soft deleting building with ID: ${id}`);
    const building = await prisma.building.findUnique({ where: { id } });
    if (!building) throw new ApiError(404, "Building not found");
    logger.info(`Building with ID ${id} found. Proceeding with soft delete.`);
    return prisma.building.update({ where: { id }, data: { isActive: false } });
};

export const hardDeleteBuilding = async (id) => {
    logger.info(`Hard deleting building with ID: ${id}`);
    const building = await prisma.building.findUnique({ where: { id } });
    if (!building) throw new ApiError(404, "Building not found");

    // Check for referential constraints
    const roomCount = await prisma.room.count({ where: { buildingId: id } });
    if (roomCount > 0) {
        logger.warn(`Cannot hard delete building with ID ${id}: ${roomCount} rooms still reference it.`);
        throw new ApiError(
            409,
            `Cannot delete building: ${roomCount} rooms still reference it. Remove rooms first or use soft delete.`
        );
    }
    logger.info(`No rooms reference building with ID ${id}. Proceeding with hard delete.`);
    await prisma.building.delete({ where: { id } });
    return { message: "Building permanently deleted" };
};

// ==================== ROOMS ====================

export const createRoom = async ({ buildingId, roomNumber, roomTypeId, displayName, capacity, notes }) => {
    logger.info(`Creating room ${roomNumber} in building ${buildingId}`);

    const building = await prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true, code: true, isActive: true },
    });
    if (!building) throw new ApiError(404, "Building not found");
    if (!building.isActive) throw new ApiError(400, "Cannot add room to inactive building");

    const fullCode = `${building.code} ${roomNumber}`;

    // Check uniqueness
    const existing = await prisma.room.findFirst({
        where: { OR: [{ fullCode }, { buildingId, roomNumber }] },
    });
    if (existing) throw new ApiError(409, `Room "${fullCode}" already exists`);

    if (roomTypeId) {
        const rt = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
        if (!rt) throw new ApiError(404, "Room type not found");
    }

    return prisma.room.create({
        data: { buildingId, roomNumber, fullCode, roomTypeId, displayName, capacity, notes },
        include: {
            building: { select: { id: true, code: true, name: true } },
            roomType: { select: { id: true, code: true, name: true } },
        },
    });
};

export const getRoomById = async (id) => {
    const room = await prisma.room.findUnique({
        where: { id },
        include: {
            building: { select: { id: true, code: true, name: true } },
            roomType: { select: { id: true, code: true, name: true } },
            features: {
                include: {
                    feature: { select: { id: true, code: true, name: true } },
                },
            },
        },
    });
    if (!room) throw new ApiError(404, "Room not found");
    return room;
};

export const listRooms = async ({ buildingId, roomTypeId, isActive, page = 1, limit = 20 }) => {
    const where = {};
    if (buildingId) where.buildingId = buildingId;
    if (roomTypeId) where.roomTypeId = roomTypeId;
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.room.findMany({
            where,
            skip,
            take: limit,
            include: {
                building: { select: { id: true, code: true, name: true } },
                roomType: { select: { id: true, code: true, name: true } },
                features: {
                    include: { feature: { select: { id: true, code: true, name: true } } },
                },
            },
            orderBy: [{ buildingId: "asc" }, { roomNumber: "asc" }],
        }),
        prisma.room.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateRoom = async (id, data) => {
    const room = await prisma.room.findUnique({ where: { id }, include: { building: { select: { code: true } } } });
    if (!room) throw new ApiError(404, "Room not found");

    // If roomNumber changes, update fullCode
    if (data.roomNumber) {
        data.fullCode = `${room.building.code} ${data.roomNumber}`;
        const dup = await prisma.room.findFirst({
            where: { fullCode: data.fullCode, id: { not: id } },
        });
        if (dup) throw new ApiError(409, `Room with code "${data.fullCode}" already exists`);
    }

    if (data.roomTypeId) {
        const rt = await prisma.roomType.findUnique({ where: { id: data.roomTypeId } });
        if (!rt) throw new ApiError(404, "Room type not found");
    }

    return prisma.room.update({
        where: { id },
        data,
        include: {
            building: { select: { id: true, code: true, name: true } },
            roomType: { select: { id: true, code: true, name: true } },
        },
    });
};

export const softDeleteRoom = async (id) => {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new ApiError(404, "Room not found");
    return prisma.room.update({ where: { id }, data: { isActive: false } });
};

export const hardDeleteRoom = async (id) => {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new ApiError(404, "Room not found");

    const bookingCount = await prisma.bookingRequest.count({ where: { roomId: id } });
    if (bookingCount > 0) {
        throw new ApiError(
            409,
            `Cannot delete room: ${bookingCount} bookings reference it. Use soft delete instead.`
        );
    }

    await prisma.room.delete({ where: { id } });
    return { message: "Room permanently deleted" };
};

// ==================== ROOM TYPES ====================

export const createRoomType = async ({ code, name }) => {
    const existing = await prisma.roomType.findFirst({
        where: { OR: [{ code }, { name }] },
    });
    if (existing) throw new ApiError(409, "Room type with that code or name already exists");

    return prisma.roomType.create({ data: { code, name } });
};

export const listRoomTypes = async ({ page = 1, limit = 50 }) => {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.roomType.findMany({
            skip,
            take: limit,
            include: { _count: { select: { rooms: true } } },
            orderBy: { code: "asc" },
        }),
        prisma.roomType.count(),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateRoomType = async (id, data) => {
    const rt = await prisma.roomType.findUnique({ where: { id } });
    if (!rt) throw new ApiError(404, "Room type not found");

    if (data.code || data.name) {
        const dup = await prisma.roomType.findFirst({
            where: {
                id: { not: id },
                OR: [
                    ...(data.code ? [{ code: data.code }] : []),
                    ...(data.name ? [{ name: data.name }] : []),
                ],
            },
        });
        if (dup) throw new ApiError(409, "Room type with that code or name already exists");
    }

    return prisma.roomType.update({ where: { id }, data });
};

export const softDeleteRoomType = async (id) => {
    const rt = await prisma.roomType.findUnique({ where: { id } });
    if (!rt) throw new ApiError(404, "Room type not found");
    return prisma.roomType.update({ where: { id }, data: { isActive: false } });
};

export const hardDeleteRoomType = async (id) => {
    const rt = await prisma.roomType.findUnique({ where: { id } });
    if (!rt) throw new ApiError(404, "Room type not found");

    const refCount = await prisma.room.count({ where: { roomTypeId: id } });
    if (refCount > 0) {
        throw new ApiError(409, `Cannot delete: ${refCount} rooms use this type. Use soft delete.`);
    }

    await prisma.roomType.delete({ where: { id } });
    return { message: "Room type permanently deleted" };
};

// ==================== ROOM FEATURES ====================

export const createRoomFeature = async ({ code, name }) => {
    const existing = await prisma.roomFeature.findFirst({
        where: { OR: [{ code }, { name }] },
    });
    if (existing) throw new ApiError(409, "Room feature with that code or name already exists");

    return prisma.roomFeature.create({ data: { code, name } });
};

export const listRoomFeatures = async ({ page = 1, limit = 50 }) => {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.roomFeature.findMany({
            skip,
            take: limit,
            include: { _count: { select: { roomAssignments: true } } },
            orderBy: { code: "asc" },
        }),
        prisma.roomFeature.count(),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateRoomFeature = async (id, data) => {
    const rf = await prisma.roomFeature.findUnique({ where: { id } });
    if (!rf) throw new ApiError(404, "Room feature not found");

    if (data.code || data.name) {
        const dup = await prisma.roomFeature.findFirst({
            where: {
                id: { not: id },
                OR: [
                    ...(data.code ? [{ code: data.code }] : []),
                    ...(data.name ? [{ name: data.name }] : []),
                ],
            },
        });
        if (dup) throw new ApiError(409, "Room feature with that code or name already exists");
    }

    return prisma.roomFeature.update({ where: { id }, data });
};

export const softDeleteRoomFeature = async (id) => {
    const rf = await prisma.roomFeature.findUnique({ where: { id } });
    if (!rf) throw new ApiError(404, "Room feature not found");
    return prisma.roomFeature.update({ where: { id }, data: { isActive: false } });
};

export const hardDeleteRoomFeature = async (id) => {
    const rf = await prisma.roomFeature.findUnique({ where: { id } });
    if (!rf) throw new ApiError(404, "Room feature not found");

    const refCount = await prisma.roomFeatureAssignment.count({ where: { featureId: id } });
    if (refCount > 0) {
        throw new ApiError(409, `Cannot delete: ${refCount} rooms use this feature. Use soft delete.`);
    }

    await prisma.roomFeature.delete({ where: { id } });
    return { message: "Room feature permanently deleted" };
};

export const assignFeatureToRoom = async ({ roomId, featureId, value }) => {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new ApiError(404, "Room not found");

    const feature = await prisma.roomFeature.findUnique({ where: { id: featureId } });
    if (!feature) throw new ApiError(404, "Feature not found");

    const existing = await prisma.roomFeatureAssignment.findUnique({
        where: { roomId_featureId: { roomId, featureId } },
    });
    if (existing) throw new ApiError(409, "Feature already assigned to this room");

    return prisma.roomFeatureAssignment.create({
        data: { roomId, featureId, value },
        include: {
            feature: { select: { id: true, code: true, name: true } },
        },
    });
};

export const removeFeatureFromRoom = async ({ roomId, featureId }) => {
    const existing = await prisma.roomFeatureAssignment.findUnique({
        where: { roomId_featureId: { roomId, featureId } },
    });
    if (!existing) throw new ApiError(404, "Feature assignment not found");

    await prisma.roomFeatureAssignment.delete({
        where: { roomId_featureId: { roomId, featureId } },
    });

    return { message: "Feature removed from room" };
};

// ==================== DEPARTMENTS ====================

export const createDepartment = async ({ code, name }) => {
    const existing = await prisma.department.findFirst({
        where: { OR: [{ code }, { name }] },
    });
    if (existing) throw new ApiError(409, "Department with that code or name already exists");

    return prisma.department.create({ data: { code, name } });
};

export const listDepartments = async ({ isActive, page = 1, limit = 50 }) => {
    const where = {};
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.department.findMany({
            where,
            skip,
            take: limit,
            include: {
                _count: { select: { courses: true, studentProfiles: true, facultyProfiles: true } },
            },
            orderBy: { code: "asc" },
        }),
        prisma.department.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateDepartment = async (id, data) => {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) throw new ApiError(404, "Department not found");

    if (data.code || data.name) {
        const dup = await prisma.department.findFirst({
            where: {
                id: { not: id },
                OR: [
                    ...(data.code ? [{ code: data.code }] : []),
                    ...(data.name ? [{ name: data.name }] : []),
                ],
            },
        });
        if (dup) throw new ApiError(409, "Department with that code or name already exists");
    }

    return prisma.department.update({ where: { id }, data });
};

export const softDeleteDepartment = async (id) => {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) throw new ApiError(404, "Department not found");
    return prisma.department.update({ where: { id }, data: { isActive: false } });
};

export const hardDeleteDepartment = async (id) => {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) throw new ApiError(404, "Department not found");

    const courseCount = await prisma.course.count({ where: { departmentId: id } });
    if (courseCount > 0) {
        throw new ApiError(409, `Cannot delete: ${courseCount} courses belong to this department. Use soft delete.`);
    }

    await prisma.department.delete({ where: { id } });
    return { message: "Department permanently deleted" };
};

// ==================== SLOT SYSTEMS ====================

export const createSlotSystem = async ({ code, name, description, applicableFor }) => {
    const existing = await prisma.slotSystem.findUnique({ where: { code } });
    if (existing) throw new ApiError(409, `Slot system with code "${code}" already exists`);

    return prisma.slotSystem.create({ data: { code, name, description, applicableFor } });
};

export const getSlotSystemById = async (id) => {
    const ss = await prisma.slotSystem.findUnique({
        where: { id },
        include: {
            slots: {
                include: {
                    occurrences: true,
                },
                orderBy: { code: "asc" },
            },
            aliases: {
                include: {
                    effectiveSlot: { select: { id: true, code: true } },
                },
                orderBy: { rawCode: "asc" },
            },
        },
    });
    if (!ss) throw new ApiError(404, "Slot system not found");
    return ss;
};

export const listSlotSystems = async ({ page = 1, limit = 20 }) => {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.slotSystem.findMany({
            skip,
            take: limit,
            include: {
                _count: { select: { slots: true, aliases: true } },
            },
            orderBy: { code: "asc" },
        }),
        prisma.slotSystem.count(),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateSlotSystem = async (id, data) => {
    const ss = await prisma.slotSystem.findUnique({ where: { id } });
    if (!ss) throw new ApiError(404, "Slot system not found");

    if (data.code) {
        const dup = await prisma.slotSystem.findFirst({
            where: { code: data.code, id: { not: id } },
        });
        if (dup) throw new ApiError(409, "Slot system with that code already exists");
    }

    return prisma.slotSystem.update({ where: { id }, data });
};

export const softDeleteSlotSystem = async (id) => {
    const ss = await prisma.slotSystem.findUnique({ where: { id } });
    if (!ss) throw new ApiError(404, "Slot system not found");
    return prisma.slotSystem.update({ where: { id }, data: { isActive: false } });
};

export const hardDeleteSlotSystem = async (id) => {
    const ss = await prisma.slotSystem.findUnique({ where: { id } });
    if (!ss) throw new ApiError(404, "Slot system not found");

    const slotCount = await prisma.slot.count({ where: { slotSystemId: id } });
    if (slotCount > 0) {
        throw new ApiError(409, `Cannot delete: ${slotCount} slots belong to this system. Use soft delete.`);
    }

    await prisma.slotSystem.delete({ where: { id } });
    return { message: "Slot system permanently deleted" };
};

// ==================== SLOT ALIASES ====================

export const createSlotAlias = async ({ slotSystemId, effectiveSlotId, rawCode, note }) => {
    // Verify slot system
    const ss = await prisma.slotSystem.findUnique({ where: { id: slotSystemId } });
    if (!ss) throw new ApiError(404, "Slot system not found");

    // Verify slot exists and belongs to the system
    const slot = await prisma.slot.findUnique({ where: { id: effectiveSlotId } });
    if (!slot) throw new ApiError(404, "Effective slot not found");
    if (slot.slotSystemId !== slotSystemId) {
        throw new ApiError(400, "Slot does not belong to the specified slot system");
    }

    // Check uniqueness
    const existing = await prisma.slotAlias.findUnique({
        where: { slotSystemId_rawCode: { slotSystemId, rawCode } },
    });
    if (existing) throw new ApiError(409, `Alias "${rawCode}" already exists in this slot system`);

    return prisma.slotAlias.create({
        data: { slotSystemId, effectiveSlotId, rawCode, note },
        include: {
            effectiveSlot: { select: { id: true, code: true, slotKind: true } },
            slotSystem: { select: { id: true, code: true, name: true } },
        },
    });
};

export const listSlotAliases = async ({ slotSystemId, effectiveSlotId, page = 1, limit = 50 }) => {
    const where = {};
    if (slotSystemId) where.slotSystemId = slotSystemId;
    if (effectiveSlotId) where.effectiveSlotId = effectiveSlotId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.slotAlias.findMany({
            where,
            skip,
            take: limit,
            include: {
                effectiveSlot: { select: { id: true, code: true } },
                slotSystem: { select: { id: true, code: true, name: true } },
            },
            orderBy: { rawCode: "asc" },
        }),
        prisma.slotAlias.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const deleteSlotAlias = async (id) => {
    const alias = await prisma.slotAlias.findUnique({ where: { id } });
    if (!alias) throw new ApiError(404, "Slot alias not found");

    await prisma.slotAlias.delete({ where: { id } });
    return { message: "Slot alias deleted" };
};

// ==================== COURSES ====================

export const createCourse = async ({ code, name, departmentId, ltp, credits }) => {
    logger.info(`Creating course: ${code} - ${name}`);

    const existing = await prisma.course.findFirst({
        where: { OR: [{ code }] },
    });
    if (existing) throw new ApiError(409, `Course with code "${code}" already exists`);

    if (departmentId) {
        const dept = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!dept) throw new ApiError(404, "Department not found");
    }

    return prisma.course.create({
        data: { code, name, departmentId, ltp, credits: credits ? parseFloat(credits) : null },
        include: {
            department: { select: { id: true, code: true, name: true } },
        },
    });
};

export const getCourseById = async (id) => {
    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            department: { select: { id: true, code: true, name: true } },
            assignments: {
                include: {
                    faculty: { select: { id: true, name: true, email: true } },
                    slot: { select: { id: true, code: true, slotKind: true } },
                    roomAllocations: {
                        include: {
                            room: {
                                select: {
                                    id: true, fullCode: true, displayName: true,
                                    building: { select: { id: true, code: true, name: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!course) throw new ApiError(404, "Course not found");

    //since frontend requires room allocation to be outside and not nested so need to transform the data before sending it to frontend
    const transformedCourse = {
        ...course,
        roomAllocations:
            course.assignments.flatMap(a => a.roomAllocations),
    };

    return transformedCourse;
};

export const listCourses = async ({ departmentId, isActive, page = 1, limit = 20 }) => {
    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prisma.course.findMany({
            where,
            skip,
            take: limit,
            include: {
                department: { select: { id: true, code: true, name: true } },
                _count: { select: { assignments: true } },
            },
            orderBy: { code: "asc" },
        }),
        prisma.course.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const updateCourse = async (id, data) => {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new ApiError(404, "Course not found");

    if (data.code) {
        const dup = await prisma.course.findFirst({
            where: { code: data.code, id: { not: id } },
        });
        if (dup) throw new ApiError(409, "Course with that code already exists");
    }

    if (data.departmentId) {
        const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
        if (!dept) throw new ApiError(404, "Department not found");
    }

    if (data.credits !== undefined) {
        data.credits = data.credits ? parseFloat(data.credits) : null;
    }

    return prisma.course.update({
        where: { id },
        data,
        include: {
            department: { select: { id: true, code: true, name: true } },
        },
    });
};

export const softDeleteCourse = async (id) => {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new ApiError(404, "Course not found");
    return prisma.course.update({ where: { id }, data: { isActive: false } });
};

export const hardDeleteCourse = async (id) => {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new ApiError(404, "Course not found");

    const assignmentCount = await prisma.courseSlotAssignment.count({ where: { courseId: id } });
    if (assignmentCount > 0) {
        throw new ApiError(409, `Cannot delete: ${assignmentCount} assignments reference this course. Use soft delete.`);
    }

    await prisma.course.delete({ where: { id } });
    return { message: "Course permanently deleted" };
};

// ==================== COURSE ROOM ALLOCATIONS ====================

export const allocateRoomToAssignment = async ({ courseSlotAssignmentId, roomId }) => {
    // Verify the assignment exists and get its course for context
    const assignment = await prisma.courseSlotAssignment.findUnique({
        where: { id: courseSlotAssignmentId },
        include: {
            course: { select: { id: true, code: true, name: true } },
        },
    });
    if (!assignment) throw new ApiError(404, "Course slot assignment not found");

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new ApiError(404, "Room not found");
    if (!room.isActive) throw new ApiError(400, "Cannot allocate inactive room");

    // Use the composite unique constraint for upsert-safe check
    const existing = await prisma.courseRoomAllocation.findUnique({
        where: { courseSlotAssignmentId_roomId: { courseSlotAssignmentId, roomId } },
    });
    if (existing) throw new ApiError(409, "Room already allocated to this assignment");

    return prisma.courseRoomAllocation.create({
        data: { courseSlotAssignmentId, roomId },
        include: {
            courseSlotAssignment: {
                select: {
                    id: true,
                    course: { select: { id: true, code: true, name: true } },
                    slot: { select: { id: true, code: true } },
                    faculty: { select: { id: true, name: true } },
                },
            },
            room: {
                select: {
                    id: true, fullCode: true, displayName: true,
                    building: { select: { id: true, code: true, name: true } },
                },
            },
        },
    });
};

export const removeRoomFromAssignment = async (allocationId) => {
    const allocation = await prisma.courseRoomAllocation.findUnique({ where: { id: allocationId } });
    if (!allocation) throw new ApiError(404, "Allocation not found");

    await prisma.courseRoomAllocation.delete({ where: { id: allocationId } });
    return { message: "Room allocation removed" };
};
