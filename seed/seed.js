import bcrypt from "bcrypt"
import { z } from "zod"
import { env } from "../src/config/env.js"
import { prisma } from "../src/db/index.js"
import logger from "../src/utils/logger.js"

const bootstrapSchema = z
    .object({
        name: z.string().trim().min(2).max(100),
        email: z.string().trim().toLowerCase().email().max(320),
        password: z
            .string()
            .min(10)
            .max(72)
            .refine((value) => Buffer.byteLength(value, "utf8") <= 72)
            .regex(/[A-Za-z]/)
            .regex(/[0-9]/),
    })
    .strict()

const defaultRoomTypes = [
    { code: "CLASSROOM", name: "Classroom" },
    { code: "LECTURE_HALL", name: "Lecture Hall" },
    { code: "LABORATORY", name: "Laboratory" },
    { code: "SEMINAR_ROOM", name: "Seminar Room" },
]

async function seedReferenceDefaults() {
    for (const roomType of defaultRoomTypes) {
        await prisma.roomType.upsert({
            where: { code: roomType.code },
            update: { name: roomType.name, isActive: true },
            create: roomType,
        })
    }
}

function readBootstrapAdmin() {
    const values = {
        name: process.env.BOOTSTRAP_ADMIN_NAME,
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    }

    if (!values.name && !values.email && !values.password) return null

    const parsed = bootstrapSchema.safeParse(values)
    if (!parsed.success) {
        const details = parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")
        throw new Error(
            `Invalid bootstrap administrator configuration: ${details}`
        )
    }
    return parsed.data
}

async function seedBootstrapAdmin(admin) {
    if (!admin) {
        logger.warn(
            "Bootstrap administrator variables are absent; administrator creation was skipped"
        )
        return
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: admin.email },
        select: { id: true, role: true },
    })

    if (existingUser && existingUser.role !== "ADMIN") {
        throw new Error(
            "The bootstrap administrator email already belongs to a non-administrator account"
        )
    }

    await prisma.approvedUser.upsert({
        where: { email: admin.email },
        update: { initialRole: "ADMIN", isActive: true },
        create: { email: admin.email, initialRole: "ADMIN" },
    })

    if (existingUser) {
        logger.info(
            { userId: existingUser.id },
            "Bootstrap administrator already exists"
        )
        return
    }

    const hashedPassword = await bcrypt.hash(admin.password, env.BCRYPT_ROUNDS)
    const user = await prisma.user.create({
        data: {
            name: admin.name,
            email: admin.email,
            hashedPassword,
            role: "ADMIN",
        },
        select: { id: true },
    })

    logger.info({ userId: user.id }, "Bootstrap administrator created")
}

async function main() {
    logger.info("Phase 1 seed started")
    await seedReferenceDefaults()
    await seedBootstrapAdmin(readBootstrapAdmin())
    logger.info("Phase 1 seed completed")
}

main()
    .catch((error) => {
        logger.error({ err: error }, "Phase 1 seed failed")
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
