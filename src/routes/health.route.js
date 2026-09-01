import { Router } from "express"
import { prisma } from "../db/index.js"
import ApiResponse from "../utils/ApiResponse.js"

const healthRouter = Router()

healthRouter.get("/live", (_req, res) => {
    res.json(new ApiResponse(200, "Service is running", { status: "up" }))
})

healthRouter.get("/ready", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`
        res.json(
            new ApiResponse(200, "Service is ready", {
                status: "ready",
                database: "up",
            })
        )
    } catch {
        res.status(503).json({
            success: false,
            error: {
                code: "SERVICE_NOT_READY",
                message: "The service is not ready",
            },
        })
    }
})

export default healthRouter
