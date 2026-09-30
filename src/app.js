import { randomUUID } from "node:crypto"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import { env } from "./config/env.js"
import {
    errorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware.js"
import adminAccessRouter from "./routes/adminAccess.route.js"
import academicCalendarRouter from "./routes/academicCalendar.route.js"
import availabilityRouter from "./routes/availability.route.js"
import approvalRouter from "./routes/approval.route.js"
import authRouter from "./routes/auth.route.js"
import bookingRouter from "./routes/booking.route.js"
import facilitiesRouter from "./routes/facilities.route.js"
import healthRouter from "./routes/health.route.js"
import notificationRouter from "./routes/notification.route.js"
import ApiResponse from "./utils/ApiResponse.js"
import logger from "./utils/logger.js"

const app = express()

app.disable("x-powered-by")
if (env.trustProxy) app.set("trust proxy", 1)

app.use(
    pinoHttp({
        logger,
        genReqId(req, res) {
            const suppliedId = req.headers["x-request-id"]
            const requestId =
                typeof suppliedId === "string" &&
                /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedId)
                    ? suppliedId
                    : randomUUID()
            res.setHeader("x-request-id", requestId)
            return requestId
        },
        customLogLevel(_req, res, error) {
            if (error || res.statusCode >= 500) return "error"
            if (res.statusCode >= 400) return "warn"
            return "info"
        },
    })
)
// helmet provides default security headers to protect against common web vulnerabilities like XSS, clickjacking, and MIME sniffing.
app.use(helmet())
app.use(
    // just blocks to read the response not to reach the route handler that is done by requireTrustedOrigin middleware in auth.route.js
    cors({
        credentials: true, // include cookies in the request
        origin(origin, callback) {
            if (!origin || env.corsOrigins.includes(origin))
                return callback(null, true)
            return callback(null, false)
        },
    })
)
app.use(express.json({ limit: "64kb" }))
app.use(express.urlencoded({ extended: false, limit: "64kb" }))
app.use(cookieParser())

app.get("/", (_req, res) => {
    res.json(
        new ApiResponse(200, "URAS API", {
            version: "v1",
            health: "/api/v1/health/live",
        })
    )
})

app.use("/api/v1/health", healthRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/admin", adminAccessRouter)
app.use("/api/v1/facilities", facilitiesRouter)
app.use("/api/v1/academic-calendar", academicCalendarRouter)
app.use("/api/v1/availability", availabilityRouter)
app.use("/api/v1/booking-requests", bookingRouter)
app.use("/api/v1/approvals", approvalRouter)
app.use("/api/v1/notifications", notificationRouter)

// since top down therefore if route not found or any error on top then shown over here
app.use(notFoundHandler)
app.use(errorHandler)

export default app
