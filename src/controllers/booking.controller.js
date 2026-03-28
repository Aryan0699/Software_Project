import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import {
    createBookingRequest as createBookingRequestService,
    getMyBookingRequests as getMyBookingRequestsService,
    staffApproveBookingRequest as staffApproveBookingRequestService,
    staffRejectBookingRequest as staffRejectBookingRequestService,
    cancelBookingRequest as cancelBookingRequestService,
    getBookingRequestById as getBookingRequestByIdService,
    getFacultyPendingRequests as getFacultyPendingRequestsService,
    getStaffPendingRequests as getStaffPendingRequestsService,
    facultyApproveBookingRequest as facultyApproveBookingRequestService,
    facultyRejectBookingRequest as facultyRejectBookingRequestService
} from "../services/booking.service.js";

import { isRoomAvailable,findAvailableRooms } from "../services/availabilty.service.js";
import logger from "../utils/logger.js";


export const checkRoomAvailability = asyncHandler(async (req, res) => {
  const { roomId, bookingDate, startMinute, endMinute } = req.body;

  const result = await isRoomAvailable({
    roomId,
    bookingDate,
    startMinute: Number(startMinute),
    endMinute: Number(endMinute),
  });
  logger.info(`Room available for room ID ${roomId} on ${bookingDate} from minute ${startMinute} to ${endMinute}: ${result}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Availability checked successfully", result));
});

export const getAvailableRooms = asyncHandler(async (req, res) => {
  const { bookingDate, startMinute, endMinute, buildingId, roomTypeId, minCapacity } =
    req.query;
  logger.info("Getting available rooms with filters");
  const rooms = await findAvailableRooms({
    bookingDate,
    startMinute: Number(startMinute),
    endMinute: Number(endMinute),
    buildingId: buildingId || undefined,
    roomTypeId: roomTypeId || undefined,
    minCapacity: minCapacity ? Number(minCapacity) : undefined,
  });
  logger.info(`Found ${rooms.length} available rooms on ${bookingDate} from minute ${startMinute} to ${endMinute} with filters - buildingId: ${buildingId}, roomTypeId: ${roomTypeId}, minCapacity: ${minCapacity}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Available rooms fetched successfully", rooms));
});

export const createBookingRequest = asyncHandler(async (req, res) => {
  const {
    roomId,
    bookingDate,
    startMinute,
    endMinute,
    title,
    purpose,
    minCapacityRequired,
    facultyReviewerUserId,
  } = req.body;

  logger.info(`Creating booking request for user ID: ${req.user.userId} in room ID: ${roomId} on date: ${bookingDate} from minute ${startMinute} to ${endMinute} with title: ${title}`);
  const booking = await createBookingRequestService({
    requesterUserId: req.user.userId,
    requesterRole: req.user.role,
    roomId,
    bookingDate,
    startMinute: Number(startMinute),
    endMinute: Number(endMinute),
    title,
    purpose,
    minCapacityRequired:
      minCapacityRequired !== undefined ? Number(minCapacityRequired) : undefined,
    facultyReviewerUserId,
  });
  logger.info(`Booking request created with ID: ${booking.id} for user ID: ${req.user.userId}`);
  return res
    .status(201)
    .json(new ApiResponse(201, "Booking request created successfully", booking));
});

export const getMyBookingRequests = asyncHandler(async (req, res) => {
  logger.info(`Fetching booking requests for user ID: ${req.user.userId}`);
  const bookings = await getMyBookingRequestsService(req.user.userId);
  logger.info(`Found ${bookings.length} booking requests for user ID: ${req.user.userId}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "My booking requests fetched successfully", bookings));
});

export const getBookingRequestById = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  logger.info(`Fetching booking request with ID: ${bookingId}`);

  const booking = await getBookingRequestByIdService(bookingId);
  logger.info(`Found booking request with ID: ${bookingId}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Booking request fetched successfully", booking));
});

export const getFacultyPendingRequests = asyncHandler(async (req, res) => {
  const bookings = await getFacultyPendingRequestsService(req.user.userId);
  logger.info(`Found ${bookings.length} faculty pending requests for user ID: ${req.user.userId}`);

  return res
    .status(200)
    .json(new ApiResponse(200, "Faculty pending requests fetched successfully", bookings));
});

export const getStaffPendingRequests = asyncHandler(async (req, res) => {
  const bookings = await getStaffPendingRequestsService(req.user.userId);
  logger.info(`Found ${bookings.length} staff pending requests for user ID: ${req.user.userId}`);

  return res
    .status(200)
    .json(new ApiResponse(200, "Staff pending requests fetched successfully", bookings));
});

export const facultyApproveBookingRequest = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
    logger.info(`Faculty user ID: ${req.user.userId} approving booking request ID: ${bookingId}`);
  const booking = await facultyApproveBookingRequestService({
    bookingRequestId: bookingId,
    facultyUserId: req.user.userId,
  });
  logger.info(`Booking request ID: ${bookingId} approved by faculty user ID: ${req.user.userId}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Booking request approved by faculty", booking));
});

export const facultyRejectBookingRequest = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { rejectionReason } = req.body;
    logger.info(`Faculty user ID: ${req.user.userId} rejecting booking request ID: ${bookingId} with reason: ${rejectionReason}`);
  const booking = await facultyRejectBookingRequestService({
    bookingRequestId: bookingId,
    facultyUserId: req.user.userId,
    rejectionReason,
  });
  logger.info(`Booking request ID: ${bookingId} rejected by faculty user ID: ${req.user.userId}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Booking request rejected by faculty", booking));
});

export const staffApproveBookingRequest = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
    logger.info(`Staff user ID: ${req.user.userId} approving booking request ID: ${bookingId}`);
  const booking = await staffApproveBookingRequestService({
    bookingRequestId: bookingId,
    staffUserId: req.user.userId,
  });
    logger.info(`Booking request ID: ${bookingId} approved by staff user ID: ${req.user.userId}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Booking request approved by staff", booking));
});

export const staffRejectBookingRequest = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { rejectionReason } = req.body;
    logger.info(`Staff user ID: ${req.user.userId} rejecting booking request ID: ${bookingId} with reason: ${rejectionReason}`);
  const booking = await staffRejectBookingRequestService({
    bookingRequestId: bookingId,
    staffUserId: req.user.userId,
    rejectionReason,
  });
    logger.info(`Booking request ID: ${bookingId} rejected by staff user ID: ${req.user.userId}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Booking request rejected by staff", booking));
});

export const cancelBookingRequest = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  logger.info(`User ID: ${req.user.userId} cancelling booking request ID: ${bookingId}`);
  const booking = await cancelBookingRequestService({
    bookingRequestId: bookingId,
    requesterUserId: req.user.userId,
  });
    logger.info(`Booking request ID: ${bookingId} cancelled by user ID: ${req.user.userId}`);
  return res
    .status(200)
    .json(new ApiResponse(200, "Booking request cancelled successfully", booking));
});
