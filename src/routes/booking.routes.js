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

const boookingRouter = Router();

// availability
boookingRouter.post("/check-availability", verifyJWTToken, checkRoomAvailability);
boookingRouter.get("/available-rooms", verifyJWTToken, getAvailableRooms);

// requester
boookingRouter.post("/", verifyJWTToken, authorizeRoles("USER", "FACULTY"), createBookingRequest);
boookingRouter.get("/my-requests", verifyJWTToken, getMyBookingRequests);
boookingRouter.get("/:bookingId", verifyJWTToken, getBookingRequestById);
boookingRouter.patch("/:bookingId/cancel", verifyJWTToken, cancelBookingRequest);

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
  facultyApproveBookingRequest
);

boookingRouter.patch(
  "/faculty/:bookingId/reject",
  verifyJWTToken,
  authorizeRoles("FACULTY"),
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
  staffApproveBookingRequest
);

boookingRouter.patch(
  "/staff/:bookingId/reject",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  staffRejectBookingRequest
);

export default boookingRouter;
