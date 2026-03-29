import { Router } from "express";
import {
  checkRoomAvailability,
  getAvailableRooms,
  createBookingRequest,
  getMyBookingRequests,
  getBookingRequestById,
  getFacultyPendingRequests,
  getStaffPendingRequests,
  facultyApproveBookingRequest,
  facultyRejectBookingRequest,
  staffApproveBookingRequest,
  staffRejectBookingRequest,
  cancelBookingRequest,
  suggestRooms,
  buildingRoomMap,
  buildingRoomStatus,
} from "../controllers/booking.controller.js";
import verifyJWTToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createBookingSchema,
  checkAvailabilitySchema,
  rejectBookingSchema,
  getAvailableRoomsSchema,
  suggestRoomsSchema,
  buildingRoomMapSchema,
  buildingRoomStatusSchema,
} from "../validators/booking.validator.js";
import { bookingIdParamSchema } from "../validators/common.validator.js";

const bookingRouter = Router();

// ==================== AVAILABILITY & SUGGESTIONS ====================

bookingRouter.post(
  "/check-availability",
  verifyJWTToken,
  validate(checkAvailabilitySchema),
  checkRoomAvailability
);

bookingRouter.get(
  "/available-rooms",
  verifyJWTToken,
  validate(getAvailableRoomsSchema, "query"),
  getAvailableRooms
);

bookingRouter.get(
  "/suggest-alternatives",
  verifyJWTToken,
  validate(suggestRoomsSchema, "query"),
  suggestRooms
);

bookingRouter.get(
  "/building-room-map",
  verifyJWTToken,
  validate(buildingRoomMapSchema, "query"),
  buildingRoomMap
);

bookingRouter.get(
  "/building-room-status",
  verifyJWTToken,
  validate(buildingRoomStatusSchema, "query"),
  buildingRoomStatus
);

// ==================== REQUESTER OPERATIONS ====================

bookingRouter.post(
  "/",
  verifyJWTToken,
  authorizeRoles("USER", "FACULTY"),
  validate(createBookingSchema),
  createBookingRequest
);

bookingRouter.get("/my-requests", verifyJWTToken, getMyBookingRequests);

// ==================== FACULTY REVIEW ====================
// IMPORTANT: These MUST be above /:bookingId to avoid "faculty" being captured as a bookingId

bookingRouter.get(
  "/faculty/pending",
  verifyJWTToken,
  authorizeRoles("FACULTY"),
  getFacultyPendingRequests
);

bookingRouter.patch(
  "/faculty/:bookingId/approve",
  verifyJWTToken,
  authorizeRoles("FACULTY"),
  validate(bookingIdParamSchema, "params"),
  facultyApproveBookingRequest
);

bookingRouter.patch(
  "/faculty/:bookingId/reject",
  verifyJWTToken,
  authorizeRoles("FACULTY"),
  validate(bookingIdParamSchema, "params"),
  validate(rejectBookingSchema),
  facultyRejectBookingRequest
);

// ==================== STAFF REVIEW ====================
// IMPORTANT: These MUST be above /:bookingId to avoid "staff" being captured as a bookingId

bookingRouter.get(
  "/staff/pending",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  getStaffPendingRequests
);

bookingRouter.patch(
  "/staff/:bookingId/approve",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  validate(bookingIdParamSchema, "params"),
  staffApproveBookingRequest
);

bookingRouter.patch(
  "/staff/:bookingId/reject",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  validate(bookingIdParamSchema, "params"),
  validate(rejectBookingSchema),
  staffRejectBookingRequest
);

// ==================== DYNAMIC BOOKING ID ROUTES ====================
// These MUST be LAST because /:bookingId is a catch-all pattern

bookingRouter.get(
  "/:bookingId",
  verifyJWTToken,
  validate(bookingIdParamSchema, "params"),
  getBookingRequestById
);

bookingRouter.patch(
  "/:bookingId/cancel",
  verifyJWTToken,
  validate(bookingIdParamSchema, "params"),
  cancelBookingRequest
);

export default bookingRouter;
