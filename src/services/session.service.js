import { createHash, randomBytes } from "node:crypto"
import { env } from "../config/env.js"
import { prisma } from "../db/index.js"

const SESSION_TOKEN_BYTES = 32

export function hashSessionToken(token) {
    return createHash("sha256").update(token).digest("hex")
}

export async function createSession({
    userId,
    userAgent,
    ipAddress,
    db = prisma,
}) {
    const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url")
    const expiresAt = new Date(Date.now() + env.sessionTtlMs)

    const session = await db.authSession.create({
        data: {
            userId,
            tokenHash: hashSessionToken(token),
            userAgent: userAgent?.slice(0, 500) || null,
            ipAddress: ipAddress?.slice(0, 64) || null,
            expiresAt,
        },
        select: { id: true, expiresAt: true },
    })

    return { token, session }
}

export async function findActiveSession(token) {
    if (!token || typeof token !== "string") return null

    return prisma.authSession.findFirst({
        where: {
            tokenHash: hashSessionToken(token),
            revokedAt: null,
            expiresAt: { gt: new Date() },
            user: { isActive: true },
        },
        select: {
            id: true,
            userId: true,
            expiresAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                },
            },
        },
    })
}

export async function revokeSession(sessionId, db = prisma) {
    return db.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
    })
}

export async function revokeAllUserSessions(userId, db = prisma) {
    return db.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    })
}
