import app from "./app.js"
import { env } from "./config/env.js"
import { connectDB, disconnectDB } from "./db/index.js"
import { expireStartedBookingRequests } from "./services/bookingExpiry.service.js"
import logger from "./utils/logger.js"

let server
let bookingExpiryTimer
let bookingExpiryRunning = false
let isShuttingDown = false

async function shutdown(signal, exitCode = 0) {
    if (isShuttingDown) return
    isShuttingDown = true
    logger.info({ signal }, "Shutdown started")

    const forceExit = setTimeout(() => {
        logger.fatal("Graceful shutdown timed out")
        process.exit(1)
    }, 10_000)
    forceExit.unref()

    if (server) {
        await new Promise((resolve) => server.close(resolve))
    }
    if (bookingExpiryTimer) clearInterval(bookingExpiryTimer)
    await disconnectDB()
    clearTimeout(forceExit)
    process.exit(exitCode)
}

async function start() {
    await connectDB()
    const rejectExpired = async () => {
        if (bookingExpiryRunning) return
        bookingExpiryRunning = true
        try {
            const count = await expireStartedBookingRequests()
            if (count)
                logger.info({ count }, "Expired booking requests rejected")
        } catch (error) {
            logger.error({ err: error }, "Booking expiry reconciliation failed")
        } finally {
            bookingExpiryRunning = false
        }
    }
    await rejectExpired()
    bookingExpiryTimer = setInterval(rejectExpired, 60_000)
    bookingExpiryTimer.unref()
    server = app.listen(env.PORT, () => {
        logger.info(
            { port: env.PORT, environment: env.NODE_ENV },
            "URAS API listening"
        )
    })

    server.keepAliveTimeout = 65_000
    server.headersTimeout = 66_000
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("unhandledRejection", (error) => {
    logger.fatal({ err: error }, "Unhandled promise rejection")
    shutdown("unhandledRejection", 1)
})
process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Uncaught exception")
    shutdown("uncaughtException", 1)
})

start().catch((error) => {
    logger.fatal({ err: error }, "Failed to start URAS API")
    process.exit(1)
})
