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
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";

const boookingRouter = Router();

// availability
boookingRouter.post("/check-availability", authenticate, checkRoomAvailability);
boookingRouter.get("/available-rooms", authenticate, getAvailableRooms);

// requester
boookingRouter.post("/", authenticate, authorizeRoles("USER", "FACULTY"), createBookingRequest);
boookingRouter.get("/my-requests", authenticate, getMyBookingRequests);
boookingRouter.get("/:bookingId", authenticate, getBookingRequestById);
boookingRouter.patch("/:bookingId/cancel", authenticate, cancelBookingRequest);

// faculty review
boookingRouter.get(
  "/faculty/pending",
  authenticate,
  authorizeRoles("FACULTY"),
  getFacultyPendingRequests
);

boookingRouter.patch(
  "/faculty/:bookingId/approve",
  authenticate,
  authorizeRoles("FACULTY"),
  facultyApproveBookingRequest
);

boookingRouter.patch(
  "/faculty/:bookingId/reject",
  authenticate,
  authorizeRoles("FACULTY"),
  facultyRejectBookingRequest
);

// staff review
boookingRouter.get(
  "/staff/pending",
  authenticate,
  authorizeRoles("STAFF", "ADMIN"),
  getStaffPendingRequests
);

boookingRouter.patch(
  "/staff/:bookingId/approve",
  authenticate,
  authorizeRoles("STAFF", "ADMIN"),
  staffApproveBookingRequest
);

boookingRouter.patch(
  "/staff/:bookingId/reject",
  authenticate,
  authorizeRoles("STAFF", "ADMIN"),
  staffRejectBookingRequest
);

export default boookingRouter;
