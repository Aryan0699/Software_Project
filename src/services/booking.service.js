import {prisma} from "../db/index.js";
import ApiError from "../utils/apiError.js";
import {parseBookingDate,validateMinuteRange,getDayOfWeek} from "../utils/dateTime.js";
import logger from "../utils/logger.js";
import {findAvailableRooms,isRoomAvailable} from "./availabilty.service.js";
import { logAction } from "./bookingActionHistory.service.js";


const properBookingFormat = (booking) => {
    return {
        id: booking.id,
        requesterUserId: booking.requesterUserId,
        roomId: booking.roomId,
        bookingDate: booking.bookingDate,
        startMinute: booking.startMinute,
        endMinute: booking.endMinute,
        title: booking.title,
        purpose: booking.purpose,
        minCapacityRequired: booking.minCapacityRequired,
        status: booking.status,
        rejectionReason: booking.rejectionReason,
        facultyReviewerUserId: booking.facultyReviewerUserId,
        staffReviewerUserId: booking.staffReviewerUserId,
        facultyDecisionAt: booking.facultyDecisionAt,
        staffDecisionAt: booking.staffDecisionAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
    }
}

const ensureRoomIsAvailable = async ({ roomId, bookingDate, startMinute, endMinute }) => {
  const availability = await isRoomAvailable({
    roomId,
    bookingDate,
    startMinute,
    endMinute,
  });

  if (!availability.available) {
    throw new ApiError(409, "Room is not available for the requested time", [
      availability.reason,
    ]);
  }
}
const resolveStaffReviewerForRoom = async (roomId,tx) => {
    const room = await tx.room.findUnique({
        where: { id: roomId },
        select: {
            id: true,
            buildingId: true,
            isActive: true,
            capacity: true,
        }
    })

    if(!room || !room.isActive) {
        logger.warn(`Room not found or inactive when resolving staff reviewer: ${roomId}`);
        throw new ApiError(404, "Room not found or is inactive");
    }
    const staffReviewer = await tx.buildingStaffAssignment.findFirst({
        where: {
        buildingId: room.buildingId,
        },
        select: {
        staffUserId: true,
        staffUser: {
            select: {
            id: true,
            role: true,
            isActive: true,
            },
        },
        },
    });

    if(!staffReviewer || !staffReviewer.staffUser || !staffReviewer.staffUser.isActive) {
        logger.warn(`No active staff reviewer assigned to building when resolving staff reviewer: ${room.buildingId}`);
        throw new ApiError(500, "No active staff reviewer assigned to this building");
    }

    if(staffReviewer.staffUser.role !== "STAFF") {
        logger.error(`Assigned building reviewer is not a staff user`);
        throw new ApiError(500, "Assigned building reviewer is not a staff user");
    }

    return{
        room,
        staffReviewerUserId: staffReviewer.staffUserId
    }
}

const createBookingRequest = async ({ requesterUserId,requesterRole, roomId, bookingDate, startMinute, endMinute, title, purpose="", minCapacityRequired=0,facultyReviewerUserId}) => {
    logger.info(`Creating booking request for user ID: ${requesterUserId} for room ID: ${roomId} on date: ${bookingDate} from minute ${startMinute} to ${endMinute}`);
    
    await ensureRoomIsAvailable({ roomId, bookingDate, startMinute, endMinute });

    //validation 
    if(!title || title.trim() === "")
    {
        logger.warn("Booking request creation failed due to missing title");
        throw new ApiError(400,"Title is required for booking request");
    }

    const date = parseBookingDate(bookingDate);
    validateMinuteRange(startMinute, endMinute);

    // first need to check whether that room exist or not and also check the capacity of room is sufficient for the booking request or not
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: {
            id: true,
            isActive: true,
            capacity: true,
            buildingId: true,
        }
    })

    if(!room || !room.isActive) {
        logger.warn(`Booking request creation failed due to room not found or inactive: ${roomId}`);
        throw new ApiError(404, "Room not found or is inactive");
    }

    if(typeof minCapacityRequired !== "number" || minCapacityRequired <= 0) {
        logger.warn(`Booking request creation failed due to invalid minimum capacity required: ${minCapacityRequired}`);
        throw new ApiError(400, "Invalid minimum capacity required");
    }


    if(room.capacity!=null && minCapacityRequired > room.capacity) {
        logger.warn(`Booking request creation failed due to insufficient room capacity: ${room.capacity}`);
        throw new ApiError(400, `Requested capacity exceeds room capacity - ${room.capacity}`);
    }

    await ensureRoomIsAvailable({ roomId, bookingDate, startMinute, endMinute });

    let status;
    let facultyReviewerIdToStore = null;
    let staffReviewerIdToStore = null;
    if(requesterRole === "USER")
    {
        if(!facultyReviewerUserId) {
            logger.warn(`User requested booking without faculty reviewer user ID: ${requesterUserId}`);
            throw new ApiError(400, "Faculty reviewer user ID is required for user booking requests");
        }
        const facultyReviewer = await prisma.user.findUnique({
            where:{
                id: facultyReviewerUserId,
            },
            select:
            {
                id: true,
                role: true,
                isActive: true
            }
        })

        if(!facultyReviewer || !facultyReviewer.isActive || facultyReviewer.role !== "FACULTY")
        {
            logger.warn(`Invalid faculty reviewer user ID provided: ${facultyReviewerUserId}`);
            throw new ApiError(400, "Invalid faculty reviewer");
        }

        status = "PENDING_FACULTY";
        facultyReviewerIdToStore = facultyReviewerUserId;
    }
    else if(requesterRole === "FACULTY")
    {
        // TODO : For now only the first staff is selected later implement to send to all staff
        const buildingStaff =  await prisma.buildingStaffAssignment.findFirst(
        {
            where:{
                buildingId: room.buildingId,
            },
            select:{
                staffUserId:true,
                staffUser:{
                    id: true,
                    role: true,
                    isActive: true
            }
        }
        })

        if(!buildingStaff || !buildingStaff.staffUser || !buildingStaff.staffUser.isActive)
        {
            logger.warn(`No active staff reviewer assigned to this building: ${room.buildingId}`);
            throw new ApiError(500, "No active staff reviewer assigned to this building");
        }

        if (buildingStaff.staffUser.role !== "STAFF") {
            logger.error(`Assigned building reviewer is not a staff user: ${buildingStaff.staffUserId}`);
            throw new ApiError(500, "Assigned building reviewer is not a staff user");
        }
        status = "PENDING_STAFF";
        staffReviewerIdToStore = buildingStaff.staffUserId;
    }
    else {
        throw new ApiError(403, "Invalid requester role - Only Faculty and Student users can create booking requests");
    }

    const bookingRequest = await prisma.$transaction(
        async (tx) => {
            const booking = await tx.bookingRequest.create({
                data:{
                    requesterUserId,
                    roomId,
                    bookingDate: date,
                    startMinute,
                    endMinute,
                    title,
                    purpose:purpose?String(purpose).trim():null,
                    minCapacityRequired:typeof minCapacityRequired === "number" ? Number(minCapacityRequired) : null,
                    status,
                    facultyReviewerUserId: facultyReviewerIdToStore,
                    staffReviewerUserId: staffReviewerIdToStore
                }
            })
            await logAction({
                bookingRequestId: booking.id,
                actionType: "CREATED",
                performedByUserId: requesterUserId,
                note: "Booking request created",
                tx
            });
            return booking;
        }
    )
    return properBookingFormat(bookingRequest);
}

const getMyBookingRequests = async (userId) => {
    const bookingRequests = await prisma.bookingRequest.findMany({
        where: {
            requesterUserId: userId,
        },
        include:
        {
            room:{
                select:{
                    id  : true,
                    displayName: true,
                    fullCode: true,
                    building:{
                        select:{
                            id: true,
                            code: true,
                            name: true,
                        }
                    }
                }
            },
            facultyReviewer:
            {
                select:
                {
                    id: true,
                    name: true,
                    email : true,
                }
            },
            staffReviewer:
            {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            },
        },
        orderBy: [{ bookingDate: "desc" }, { createdAt: "desc" }],
    });
    return bookingRequests;
}

const getBookingRequestById = async (bookingRequestId) => {
   const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        room: {
          select: {
            id: true,
            fullCode: true,
            displayName: true,
            building: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        facultyReviewer: {
          select: { id: true, name: true, email: true },
        },
        staffReviewer: {
          select: { id: true, name: true, email: true },
        },
        actionHistory: {
          include: {
            performedByUser: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!booking) {
        logger.warn(`Booking request not found with ID: ${bookingRequestId}`);
        throw new ApiError(404, "Booking request not found");
    }
    return booking;
}

const getFacultyPendingRequests = async (facultyUserId) => {
    return prisma.bookingRequest.findMany({
      where: {
        facultyReviewerUserId: facultyUserId,
        status: "PENDING_FACULTY",
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        room: {
          select: {
            id: true,
            fullCode: true,
            building: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

const getStaffPendingRequests = async (staffUserId) => {
    return prisma.bookingRequest.findMany({
      where: {
        status: "PENDING_STAFF",
        staffReviewerUserId: staffUserId,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        room: {
          select: {
            id: true,
            fullCode: true,
            building: { select: { code: true, name: true } },
          },
        },
        facultyReviewer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

const facultyApproveBookingRequest = async ({ bookingRequestId, facultyUserId }) => {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: {
        id: true,
        roomId: true,
        status: true,
        facultyReviewerUserId: true,
      },
    });

    if (!booking) {
      throw new ApiError(404, "Booking request not found");
    }

    if (booking.status !== "PENDING_FACULTY") {
      throw new ApiError(400, "Booking request is not pending faculty approval");
    }

    if (booking.facultyReviewerUserId !== facultyUserId) {
      throw new ApiError(403, "You are not the assigned faculty reviewer");
    }
    await ensureRoomIsAvailable({
      roomId: booking.roomId,
      bookingDate: booking.bookingDate.toISOString().slice(0, 10),
      startMinute: booking.startMinute,
      endMinute: booking.endMinute,
    });
    const updated = await prisma.$transaction(async (tx) => {
      const { staffReviewerUserId } = await resolveStaffReviewerForRoom(tx, booking.roomId);

      const result = await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: {
          status: "PENDING_STAFF",
          staffReviewerUserId,
          facultyDecisionAt: new Date(),
          rejectionReason: null,
        },
      });

      await logAction({
        bookingRequestId,
        actionType: "FACULTY_APPROVED",
        performedByUserId: facultyUserId,
        note: "Approved by faculty and forwarded to staff",
        tx
      });

      return result;
    });

    return toSafeBooking(updated);
  }

const facultyRejectBookingRequest = async ({
    bookingRequestId,
    facultyUserId,
    rejectionReason,
  }) => {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
    });

    if (!booking) {
      throw new ApiError(404, "Booking request not found");
    }

    if (booking.status !== "PENDING_FACULTY") {
      throw new ApiError(400, "Booking request is not pending faculty approval");
    }

    if (booking.facultyReviewerUserId !== facultyUserId) {
      throw new ApiError(403, "You are not the assigned faculty reviewer");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason ? String(rejectionReason).trim() : null,
          facultyDecisionAt: new Date(),
        },
      });

      await logAction({
        bookingRequestId,
        actionType: "FACULTY_REJECTED",
        performedByUserId: facultyUserId,
        note: rejectionReason ? String(rejectionReason).trim() : "Rejected by faculty",
        tx
      });

      return result;
    });

    return toSafeBooking(updated);
  }

const staffApproveBookingRequest = async ({ bookingRequestId, staffUserId }) => {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
    });

    if (!booking) {
      throw new ApiError(404, "Booking request not found");
    }

    if (booking.status !== "PENDING_STAFF") {
      throw new ApiError(400, "Booking request is not pending staff approval");
    }

    if (booking.staffReviewerUserId !== staffUserId) {
      throw new ApiError(403, "You are not the assigned staff reviewer");
    }

    await ensureRoomIsAvailable({
      roomId: booking.roomId,
      bookingDate: booking.bookingDate.toISOString().slice(0, 10),
      startMinute: booking.startMinute,
      endMinute: booking.endMinute,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: {
          status: "APPROVED",
          staffDecisionAt: new Date(),
          rejectionReason: null,
        },
      });

      await logAction({
        bookingRequestId,
        actionType: "STAFF_APPROVED",
        performedByUserId: staffUserId,
        note: "Approved by staff",
        tx
      });

      return result;
    });

    return toSafeBooking(updated);
  }

const staffRejectBookingRequest = async ({
    bookingRequestId,
    staffUserId,
    rejectionReason,
  }) => {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
    });

    if (!booking) {
      throw new ApiError(404, "Booking request not found");
    }

    if (booking.status !== "PENDING_STAFF") {
      throw new ApiError(400, "Booking request is not pending staff approval");
    }

    if (booking.staffReviewerUserId !== staffUserId) {
      throw new ApiError(403, "You are not the assigned staff reviewer");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason ? String(rejectionReason).trim() : null,
          staffDecisionAt: new Date(),
        },
      });

      await logAction({
        bookingRequestId,
        actionType: "STAFF_REJECTED",
        performedByUserId: staffUserId,
        note: rejectionReason ? String(rejectionReason).trim() : "Rejected by staff",
        tx
      });

      return result;
    });

    return toSafeBooking(updated);
  }

const cancelBookingRequest = async ({ bookingRequestId, requesterUserId }) => {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
    });

    if (!booking) {
      throw new ApiError(404, "Booking request not found");
    }

    if (booking.requesterUserId !== requesterUserId) {
      throw new ApiError(403, "You can only cancel your own booking request");
    }

    if (booking.status === "APPROVED") {
      throw new ApiError(400, "Approved booking requests cannot be cancelled here");
    }

    if (booking.status === "CANCELLED") {
      throw new ApiError(400, "Booking request is already cancelled");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: {
          status: "CANCELLED",
        },
      });

      await logAction({
        bookingRequestId,
        actionType: "CANCELLED",
        performedByUserId: requesterUserId,
        note: "Cancelled by requester",
        tx
      });

      return result;
    });

    return toSafeBooking(updated);
  }
const getAvailableRoomsForBookingRequest = async ({ bookingDate, startMinute, endMinute, minCapacityRequired }) => {    
    const date = parseBookingDate(bookingDate);
    validateMinuteRange(startMinute, endMinute);
    const dayOfWeek = getDayOfWeek(date);
    const availableRooms = await findAvailableRooms({
        bookingDate: date,
        startMinute,
        endMinute,
        minCapacityRequired,
        dayOfWeek,
    });
    return availableRooms;
}

export {
    createBookingRequest,
    getMyBookingRequests,
    staffApproveBookingRequest,
    staffRejectBookingRequest,
    cancelBookingRequest,
    getAvailableRoomsForBookingRequest,
    getBookingRequestById,
    getFacultyPendingRequests,
    getStaffPendingRequests,
    facultyApproveBookingRequest,
    facultyRejectBookingRequest
}
