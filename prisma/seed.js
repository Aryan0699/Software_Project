import { SALT_ROUNDS } from "../src/constants.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcrypt";
import { env } from "../src/utils/env.js";
import logger from "../src/utils/logger.js";
import {data} from "../data/approvedUsers.js";
const prisma = new PrismaClient();
async function seed() {
    const adminPassword = env.ADMIN_PASSWORD;
    console.log("Admin Password: " + adminPassword);
    const adminHashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS || 10);

    for (const user of data)
    {
        await prisma.approvedUser.upsert({
            where: { email: user.email },
            update: {},
            create: {
            email: user.email,
            role: user.role,
            },
        });
    }

    await prisma.user.upsert({
        where: { email: "admin@iitj.ac.in" },
        update: {},
        create: {
        username: "System Admin",
        email: "admin@iitj.ac.in",
        hashedPassword: adminHashedPassword,
        role: "ADMIN",
        isActive: true,
        },
    });

    console.log("Seeding completed.");

}

seed().catch((error)=>
{
    logger.error(`Error seeding the database: ${error}`);
    process.exit(1);
}).finally(async ()=>
{
    await prisma.$disconnect(); // Ensure the PrismaClient disconnects after seeding to prevent hanging connections
}
);
