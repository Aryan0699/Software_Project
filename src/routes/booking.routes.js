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

// ==================== REQUESTER OPERATIONS ====================

bookingRouter.post(
  "/",
  verifyJWTToken,
  authorizeRoles("USER", "FACULTY"),
  validate(createBookingSchema),
  createBookingRequest
);

bookingRouter.get("/my-requests", verifyJWTToken, getMyBookingRequests);

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

// ==================== FACULTY REVIEW ====================

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

export default bookingRouter;
