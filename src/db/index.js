import { PrismaClient } from "../generated/prisma/client.js"
import { env } from "../config/env.js"
import logger from "../utils/logger.js"

const globalPrisma = globalThis

// In development, we want to use a single PrismaClient instance across hot reloads to avoid exhausting database connections. In production, we create a new instance for each serverless function invocation.

// If the file simply contained const prisma = new PrismaClient(), every time you saved a file, Node.js would instantiate a new PrismaClient connection pool without closing the old ones. Within 5–10 file saves, your database would crash with a PostgreSQL error:
const prisma =
    globalPrisma.__urasPrisma ??
    new PrismaClient({
        log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })

if (!env.isProduction) {
    globalPrisma.__urasPrisma = prisma
}

async function connectDB() {
    await prisma.$connect()
    logger.info("Database connection established")
}

async function disconnectDB() {
    await prisma.$disconnect()
    logger.info("Database connection closed")
}

export { prisma, connectDB, disconnectDB }
