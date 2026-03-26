import e from "express";
import prisma from "../db/index.js";
import ApiError from "../utils/apiError.js";
import {parseBookingDate,validateMinuteRange,getDayOfWeek} from "../utils/dateTime.js";
import logger from "../utils/logger.js";


const isRoomAvailable = async(roomId, bookingDate, startMinute, endMinute) =>{
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
                    dayOfWeek,
                    startMinute:{lt:endMinute},
                    endMinute: {gt:startMinute}
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

const findAvailableRooms = async (buildingId, bookingDate, startMinute, endMinute,roomTypeId,minCapacity=0) =>
{
    logger.info(`Finding available rooms in building ID: ${buildingId} on date: ${bookingDate} from minute ${startMinute} to ${endMinute} with room type ID: ${roomTypeId} and minimum capacity: ${minCapacity}`);
    const date = parseBookingDate(bookingDate);
    validateMinuteRange(startMinute, endMinute);
    const dayOfWeek = getDayOfWeek(date);

    // if koi field null hai to aayegi hi nahi object me
    const allRoomsWhere = {
        isActive:true,
        ...(buildingId ? { buildingId } : {}),
        ...(roomTypeId?{roomTypeId}:{}),
        capacity:{
            gte: minCapacity
        }
    }

    const allRooms = await prisma.room.findMany({
        where:allRoomsWhere,
        select:
        {
            id:true,
            roomNumber:true,
            fullCode:true,
            displayName:true,
            capacity:true,
            building:{
                select:{
                    id:true,
                    name:true,
                    code:true
                }
            }
        },
        order:[
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
                    dayOfWeek,
                    startMinute: { lt: endMinute },
                    endMinute: { gt: startMinute }
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

export {isRoomAvailable, findAvailableRooms};


