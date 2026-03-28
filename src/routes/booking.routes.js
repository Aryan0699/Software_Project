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
} from "../controllers/booking.controller.js";
import verifyJWTToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createBookingSchema,
  checkAvailabilitySchema,
  rejectBookingSchema,
  getAvailableRoomsSchema,
} from "../validators/booking.validator.js";
import { bookingIdParamSchema } from "../validators/common.validator.js";

const boookingRouter = Router();

// availability
boookingRouter.post(
  "/check-availability",
  verifyJWTToken,
  validate(checkAvailabilitySchema),
  checkRoomAvailability
);
boookingRouter.get(
  "/available-rooms",
  verifyJWTToken,
  validate(getAvailableRoomsSchema, "query"),
  getAvailableRooms
);

// requester
boookingRouter.post(
  "/",
  verifyJWTToken,
  authorizeRoles("USER", "FACULTY"),
  validate(createBookingSchema),
  createBookingRequest
);
boookingRouter.get("/my-requests", verifyJWTToken, getMyBookingRequests);
boookingRouter.get(
  "/:bookingId",
  verifyJWTToken,
  validate(bookingIdParamSchema, "params"),
  getBookingRequestById
);
boookingRouter.patch(
  "/:bookingId/cancel",
  verifyJWTToken,
  validate(bookingIdParamSchema, "params"),
  cancelBookingRequest
);

// faculty review
boookingRouter.get(
  "/faculty/pending",
  verifyJWTToken,
  authorizeRoles("FACULTY"),
  getFacultyPendingRequests
);

boookingRouter.patch(
  "/faculty/:bookingId/approve",
  verifyJWTToken,
  authorizeRoles("FACULTY"),
  validate(bookingIdParamSchema, "params"),
  facultyApproveBookingRequest
);

boookingRouter.patch(
  "/faculty/:bookingId/reject",
  verifyJWTToken,
  authorizeRoles("FACULTY"),
  validate(bookingIdParamSchema, "params"),
  validate(rejectBookingSchema),
  facultyRejectBookingRequest
);

// staff review
boookingRouter.get(
  "/staff/pending",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  getStaffPendingRequests
);

boookingRouter.patch(
  "/staff/:bookingId/approve",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  validate(bookingIdParamSchema, "params"),
  staffApproveBookingRequest
);

boookingRouter.patch(
  "/staff/:bookingId/reject",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  validate(bookingIdParamSchema, "params"),
  validate(rejectBookingSchema),
  staffRejectBookingRequest
);

export default boookingRouter;
