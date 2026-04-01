import { prisma } from "../src/db/index.js";
import logger from "../src/utils/logger.js";
import { env } from "../src/utils/env.js";
import bcrypt from "bcrypt";

const seedAdmin  =  async () => {
    logger.info("Starting admin seed...");  
    const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    try {
        const admin = await prisma.user.upsert({
            where: { email: env.ADMIN_EMAIL },
            update: {},
            create: {
                email: env.ADMIN_EMAIL,
                hashedPassword: hashedPassword,
                name: "Admin",
                role:"ADMIN"
            }
        });
        logger.info("Admin seed completed successfully.");
    } catch (error) {
        logger.error(`Error occurred while seeding admin: ${error.message}`);
    }
}

export default seedAdmin;
