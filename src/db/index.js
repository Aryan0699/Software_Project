import { PrismaClient } from "../generated/prisma/client.js";
import {NODE_ENV} from "../constants.js";
import logger from "../utils/logger.js";

const globalPrisma = globalThis // Use globalThis to store the PrismaClient instance // globalThis is a object

// First time → create PrismaClient  
// Next reload → reuse existing one

const prisma =  globalPrisma.prisma || new PrismaClient(
    {
        log: ["warn", "error"] // Log warnings and errors for better debugging
    }
)
if(NODE_ENV !== "production")
{
    globalPrisma.prisma = prisma; //In production: // App runs once
}


// In prisma its optional to connect to the database, it will connect lazily when you make the first query. But we want to connect eagerly and log any connection errors at startup.
async function connectDB() {
    try {
        await prisma.$connect();
        logger.info("Connected to the database successfully.");
    } catch (error) {
        logger.error(`Failed to connect to the database: ${error}`);
        process.exit(1); // Exit the process with an error code
    }
    
}

export { prisma, connectDB };

