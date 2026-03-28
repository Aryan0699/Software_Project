import { PrismaClient } from "../src/generated/prisma/client.js";
import logger from "../src/utils/logger.js";
import { env } from "../src/utils/env.js";

const prisma = new PrismaClient()

const seedAdmin  =  async () => {
    logger.info("Starting admin seed...");  
    try {
        const admin = await prisma.user.upsert({
            where: { email: env.ADMIN_EMAIL },
            update: {},
            create: {
                email: env.ADMIN_EMAIL,
                password: env.ADMIN_PASSWORD,
                name: "Admin"
            }
        });
        logger.info("Admin seed completed successfully.");
    } catch (error) {
        logger.error("Error occurred while seeding admin:", error);
    }
}