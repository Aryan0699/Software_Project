import { Router } from "express"
import {
    cancelBookingRequest,
    createBookingRequest,
    exportBookingRequests,
    getBookingDashboard,
    getBookingFilterOptions,
    getBookingRequest,
    listBookingRequests,
    listFacultyVerifiers,
} from "../controllers/booking.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    bookingRequestParamsSchema,
    cancelBookingRequestSchema,
    createBookingRequestSchema,
    facultyVerifierQuerySchema,
    listBookingRequestsQuerySchema,
} from "../schemas/booking.schema.js"

const bookingRouter = Router()

bookingRouter.use(requireAuth, requireTrustedOrigin)
bookingRouter.get(
    "/faculty-verifiers",
    requireRole("STUDENT", "FACULTY"),
    validateQuery(facultyVerifierQuerySchema),
    listFacultyVerifiers
)
bookingRouter.get("/filter-options", getBookingFilterOptions)
bookingRouter.get("/dashboard", getBookingDashboard)
bookingRouter.get(
    "/export",
    validateQuery(listBookingRequestsQuerySchema),
    exportBookingRequests
)
bookingRouter.get(
    "/",
    validateQuery(listBookingRequestsQuerySchema),
    listBookingRequests
)
bookingRouter.post(
    "/:id/cancel",
    requireRole("STUDENT", "FACULTY"),
    validateParams(bookingRequestParamsSchema),
    validateBody(cancelBookingRequestSchema),
    cancelBookingRequest
)
bookingRouter.post(
    "/",
    requireRole("STUDENT", "FACULTY"),
    validateBody(createBookingRequestSchema),
    createBookingRequest
)
bookingRouter.get(
    "/:id",
    validateParams(bookingRequestParamsSchema),
    getBookingRequest
)

export default bookingRouter
