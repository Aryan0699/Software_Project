import {prisma} from "../db/index.js";
import ApiError from "../utils/apiError.js";
import {parseBookingDate,validateMinuteRange,getDayOfWeek} from "../utils/dateTime.js";
import logger from "../utils/logger.js";


const isRoomAvailable = async({ roomId, bookingDate, startMinute, endMinute }) => {
    logger.info(`Checking availability for room ID: ${roomId} on date: ${bookingDate} from minute ${startMinute} to ${endMinute}`);
    const date = parseBookingDate(bookingDate);
    validateMinuteRange(startMinute, endMinute);
    const dayOfWeek = getDayOfWeek(date);

    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: {
            id: true,
            isActive: true,
        }    
    })

    if(!room || !room.isActive) {
        logger.warn(`Room not found or is inactive: ${roomId}`);
        throw new ApiError(404, "Room not found or is inactive");
    }

    logger.info("Now checking for timetable conflicts");
    const timeTableConflict = await prisma.roomSlotOccupancy.findFirst({
        where: {
            roomId: roomId,
            isActive: true,
            slot:{
                occurrences:{
                    some: {
                        dayOfWeek,
                        startMinute:{lt:endMinute},
                        endMinute: {gt:startMinute}
                    }
                }
            }
        },
        include:{
            slot:{
                select:{
                    id:true,
                    code:true
                }
            }
        }
    })

    if(timeTableConflict)
    {
        logger.warn(`TimeTable conflict found for room ID: ${roomId} with slot ID: ${timeTableConflict.slot.id}`);
        return {
            available:false,
            reason:"TimeTable Conflict",
            details:{
                slotId: timeTableConflict.slot.id,
                slotCode: timeTableConflict.slot.code   
            }
        }
    }

    logger.info("Now checking for existing bookings that may conflict");
    const bookingConflict = await prisma.bookingRequest.findFirst({
        where:{
            roomId,
            bookingDate: date,
            status: "APPROVED",
            startMinute: {lt:endMinute},
            endMinute: {gt:startMinute}
        },

        select:{
            id:true,
            title:true,
            startMinute:true,
            endMinute:true
        }
    })

    if(bookingConflict)
    {
        logger.warn(`Booking conflict found for room ID: ${roomId} with booking ID: ${bookingConflict.id}`);
        return {
            available:false,
            reason:"Booking Conflict",
            details:bookingConflict
        }
    }
    return {
        available:true,
        reason:null,
        details:null
    }
}

const findAvailableRooms = async ({ buildingId, bookingDate, startMinute, endMinute, roomTypeId, minCapacity = 0, featureIds }) =>
{
    logger.info(`Finding available rooms on date: ${bookingDate} from minute ${startMinute} to ${endMinute}`);
    const date = parseBookingDate(bookingDate);
    validateMinuteRange(startMinute, endMinute);
    const dayOfWeek = getDayOfWeek(date);

    const allRoomsWhere = {
        isActive:true,
        ...(buildingId ? { buildingId } : {}),
        ...(roomTypeId ? { roomTypeId } : {}),
        ...(minCapacity > 0 ? { capacity: { gte: minCapacity } } : {}),
    }

    if (featureIds && featureIds.length > 0) {
        allRoomsWhere.AND = featureIds.map(fId => ({
            features: { some: { featureId: fId } }
        }));
    }

    const allRooms = await prisma.room.findMany({
        where: allRoomsWhere,
        select:
        {
            id:true,
            roomNumber:true,
            fullCode:true,
            displayName:true,
            capacity:true,
            buildingId: true,
            building:{
                select:{
                    id:true,
                    name:true,
                    code:true
                }
            },
            roomType: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                }
            },
            features: {
                select: {
                    feature: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        }
                    },
                    value: true,
                }
            }
        },
        orderBy:[
            {buildingId:"asc"},
            {roomNumber:"asc"}
        ]
    })

    if(allRooms.length === 0)
    {
        logger.info("No rooms found matching the criteria");
        return [];
    }

    const roomIds = allRooms.map(r=>r.id);

    const roomsBlockedDueToTimeTable = await prisma.roomSlotOccupancy.findMany({
        where: {
            roomId: { in: roomIds },
            isActive: true,
            slot: {
                occurrences: {
                    some: {
                        dayOfWeek,
                        startMinute: { lt: endMinute },
                        endMinute: { gt: startMinute }
                    }
                }
            }
        },
        select:
        {
            roomId:true,
        }
    });

    const roomsBlockedDueToBooking = await prisma.bookingRequest.findMany({
        where:{
            roomId: { in: roomIds },
            bookingDate: date,
            status: "APPROVED",
            startMinute:{lt:endMinute},
            endMinute:{gt:startMinute}
        },
        select:{
            roomId:true,
        }
    })

    const blockedRoomIds = new Set([
        ...roomsBlockedDueToTimeTable.map(r=>r.roomId),
        ...roomsBlockedDueToBooking.map(r=>r.roomId)
    ])

    const availableRooms = allRooms.filter(r=>!blockedRoomIds.has(r.id));

    logger.info(`Found ${availableRooms.length} available rooms matching the criteria`);
    return availableRooms;
}


/**
 * Suggest alternative rooms when a specific room is unavailable.
 * Returns up to `limit` rooms, prioritising same-building matches.
 */
const suggestAlternativeRooms = async ({
    roomId,
    bookingDate,
    startMinute,
    endMinute,
    buildingId,
    minCapacity,
    roomTypeId,
    featureIds,
    limit = 15,
}) => {
    logger.info(`Suggesting alternatives for room ${roomId} on ${bookingDate} ${startMinute}-${endMinute}`);

    let preferredBuildingId = buildingId || null;
    if (!preferredBuildingId && roomId) {
        const originalRoom = await prisma.room.findUnique({
            where: { id: roomId },
            select: { buildingId: true, capacity: true },
        });
        if (originalRoom) {
            preferredBuildingId = originalRoom.buildingId;
            if (!minCapacity && originalRoom.capacity) {
                minCapacity = originalRoom.capacity;
            }
        }
    }

    const available = await findAvailableRooms({
        bookingDate,
        startMinute,
        endMinute,
        roomTypeId,
        minCapacity,
        featureIds,
    });

    const filtered = roomId ? available.filter(r => r.id !== roomId) : available;

    const sorted = filtered.sort((a, b) => {
        const aIsSameBuilding = a.buildingId === preferredBuildingId ? 0 : 1;
        const bIsSameBuilding = b.buildingId === preferredBuildingId ? 0 : 1;
        if (aIsSameBuilding !== bIsSameBuilding) return aIsSameBuilding - bIsSameBuilding;

        const aCap = a.capacity || 0;
        const bCap = b.capacity || 0;
        return aCap - bCap;
    });

    return sorted.slice(0, limit);
}

/**
 * Building room map — returns all rooms in a building with their current
 * availability status for a given date and time range.
 */
const getBuildingRoomMap = async ({ buildingId, bookingDate, startMinute, endMinute }) => {
    logger.info(`Fetching room map for building ${buildingId} on ${bookingDate} ${startMinute}-${endMinute}`);

    const date = parseBookingDate(bookingDate);
    validateMinuteRange(startMinute, endMinute);
    const dayOfWeek = getDayOfWeek(date);

    const building = await prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true, code: true, name: true, location: true, isActive: true },
    });

    if (!building || !building.isActive) {
        throw new ApiError(404, "Building not found or is inactive");
    }

    const rooms = await prisma.room.findMany({
        where: { buildingId, isActive: true },
        select: {
            id: true,
            roomNumber: true,
            fullCode: true,
            displayName: true,
            capacity: true,
            notes: true,
            roomType: {
                select: { id: true, code: true, name: true }
            },
            features: {
                select: {
                    feature: {
                        select: { id: true, code: true, name: true }
                    },
                    value: true,
                }
            },
        },
        orderBy: { roomNumber: "asc" },
    });

    if (rooms.length === 0) {
        return { building, rooms: [] };
    }

    const roomIds = rooms.map(r => r.id);

    const timetableConflicts = await prisma.roomSlotOccupancy.findMany({
        where: {
            roomId: { in: roomIds },
            isActive: true,
            slot: {
                occurrences: {
                    some: {
                        dayOfWeek,
                        startMinute: { lt: endMinute },
                        endMinute: { gt: startMinute },
                    }
                }
            }
        },
        select: {
            roomId: true,
            slot: {
                select: { code: true },
            },
        },
    });

    const bookingConflicts = await prisma.bookingRequest.findMany({
        where: {
            roomId: { in: roomIds },
            bookingDate: date,
            status: "APPROVED",
            startMinute: { lt: endMinute },
            endMinute: { gt: startMinute },
        },
        select: {
            roomId: true,
            title: true,
            startMinute: true,
            endMinute: true,
        },
    });

    const timetableBlockedMap = new Map();
    for (const tc of timetableConflicts) {
        if (!timetableBlockedMap.has(tc.roomId)) {
            timetableBlockedMap.set(tc.roomId, []);
        }
        timetableBlockedMap.get(tc.roomId).push(tc.slot.code);
    }

    const bookingBlockedMap = new Map();
    for (const bc of bookingConflicts) {
        if (!bookingBlockedMap.has(bc.roomId)) {
            bookingBlockedMap.set(bc.roomId, []);
        }
        bookingBlockedMap.get(bc.roomId).push({
            title: bc.title,
            startMinute: bc.startMinute,
            endMinute: bc.endMinute,
        });
    }

    const roomsWithStatus = rooms.map(room => {
        const timetableSlots = timetableBlockedMap.get(room.id) || [];
        const bookings = bookingBlockedMap.get(room.id) || [];
        const isAvailable = timetableSlots.length === 0 && bookings.length === 0;

        let status = "AVAILABLE";
        let blockedBy = null;
        if (timetableSlots.length > 0) {
            status = "TIMETABLE_BLOCKED";
            blockedBy = { type: "TIMETABLE", slots: timetableSlots };
        } else if (bookings.length > 0) {
            status = "BOOKING_BLOCKED";
            blockedBy = { type: "BOOKING", bookings };
        }

        return {
            ...room,
            status,
            isAvailable,
            blockedBy,
        };
    });

    return {
        building,
        date: bookingDate,
        timeRange: { startMinute, endMinute },
        summary: {
            total: roomsWithStatus.length,
            available: roomsWithStatus.filter(r => r.isAvailable).length,
            blocked: roomsWithStatus.filter(r => !r.isAvailable).length,
        },
        rooms: roomsWithStatus,
    };
}

/**
 * Building room status — full-day view of all rooms in a building.
 * Returns each room's schedule: timetable slots + approved bookings for the day.
 * If no buildingId is given, defaults to "LHC".
 */
const getBuildingRoomStatus = async ({ buildingId, date }) => {
    const bookingDate = date || new Date().toISOString().slice(0, 10);
    const parsedDate = parseBookingDate(bookingDate);
    const dayOfWeek = getDayOfWeek(parsedDate);

    // If no buildingId, resolve LHC as default
    let resolvedBuildingId = buildingId;
    if (!resolvedBuildingId) {
        const lhc = await prisma.building.findFirst({
            where: { code: "LHC", isActive: true },
            select: { id: true },
        });
        if (!lhc) throw new ApiError(404, "Default building (LHC) not found");
        resolvedBuildingId = lhc.id;
    }

    const building = await prisma.building.findUnique({
        where: { id: resolvedBuildingId },
        select: { id: true, code: true, name: true, location: true, isActive: true },
    });

    if (!building || !building.isActive) {
        throw new ApiError(404, "Building not found or is inactive");
    }

    logger.info(`Fetching full-day room status for building ${building.code} on ${bookingDate} (${dayOfWeek})`);

    const rooms = await prisma.room.findMany({
        where: { buildingId: resolvedBuildingId, isActive: true },
        select: {
            id: true,
            roomNumber: true,
            fullCode: true,
            displayName: true,
            capacity: true,
            roomType: {
                select: { id: true, code: true, name: true },
            },
        },
        orderBy: { roomNumber: "asc" },
    });

    if (rooms.length === 0) {
        return { building, date: bookingDate, dayOfWeek, rooms: [] };
    }

    const roomIds = rooms.map(r => r.id);

    // Get all timetable occupancies for these rooms on this day
    // Note: RoomSlotOccupancy has no direct `course` relation.
    // We traverse: slot → courseAssignments → course, then match by roomAllocation.
    const timetableOccupancies = await prisma.roomSlotOccupancy.findMany({
        where: {
            roomId: { in: roomIds },
            isActive: true,
            slot: {
                occurrences: {
                    some: { dayOfWeek },
                },
            },
        },
        select: {
            roomId: true,
            slot: {
                select: {
                    code: true,
                    occurrences: {
                        where: { dayOfWeek },
                        select: { startMinute: true, endMinute: true },
                    },
                    courseAssignments: {
                        where: { isActive: true },
                        select: {
                            course: { select: { code: true, name: true } },
                            faculty: { select: { name: true } },
                            roomAllocations: {
                                select: { roomId: true },
                            },
                        },
                    },
                },
            },
        },
    });

    // Get all approved bookings for these rooms on this date
    const approvedBookings = await prisma.bookingRequest.findMany({
        where: {
            roomId: { in: roomIds },
            bookingDate: parsedDate,
            status: "APPROVED",
        },
        select: {
            roomId: true,
            title: true,
            startMinute: true,
            endMinute: true,
            requester: { select: { name: true } },
        },
        orderBy: { startMinute: "asc" },
    });

    // Build schedule per room
    const timetableMap = new Map();
    for (const occ of timetableOccupancies) {
        if (!timetableMap.has(occ.roomId)) timetableMap.set(occ.roomId, []);

        // Find the course assignment that has a room allocation for THIS specific room
        const matchingAssignment = occ.slot.courseAssignments?.find(
            a => a.roomAllocations.some(ra => ra.roomId === occ.roomId)
        );

        const courseInfo = matchingAssignment
            ? {
                code: matchingAssignment.course.code,
                name: matchingAssignment.course.name,
                instructor: matchingAssignment.faculty?.name || null,
            }
            : null;

        for (const timeBlock of occ.slot.occurrences) {
            timetableMap.get(occ.roomId).push({
                sourceType: "TIMETABLE",
                slotCode: occ.slot.code,
                startMinute: timeBlock.startMinute,
                endMinute: timeBlock.endMinute,
                course: courseInfo,
            });
        }
    }

    const bookingMap = new Map();
    for (const bk of approvedBookings) {
        if (!bookingMap.has(bk.roomId)) bookingMap.set(bk.roomId, []);
        bookingMap.get(bk.roomId).push({
            sourceType: "BOOKING",
            startMinute: bk.startMinute,
            endMinute: bk.endMinute,
            title: bk.title,
            requester: bk.requester.name,
        });
    }

    const roomsWithSchedule = rooms.map(room => {
        const timetableEntries = timetableMap.get(room.id) || [];
        const bookingEntries = bookingMap.get(room.id) || [];

        // Merge and sort by startMinute
        const schedule = [...timetableEntries, ...bookingEntries]
            .sort((a, b) => a.startMinute - b.startMinute);

        return {
            ...room,
            schedule,
            occupiedSlots: timetableEntries.length,
            approvedBookings: bookingEntries.length,
        };
    });

    return {
        building,
        date: bookingDate,
        dayOfWeek,
        summary: {
            totalRooms: roomsWithSchedule.length,
            roomsWithSchedule: roomsWithSchedule.filter(r => r.schedule.length > 0).length,
            freeRooms: roomsWithSchedule.filter(r => r.schedule.length === 0).length,
        },
        rooms: roomsWithSchedule,
    };
};


export {isRoomAvailable, findAvailableRooms, suggestAlternativeRooms, getBuildingRoomMap, getBuildingRoomStatus};
