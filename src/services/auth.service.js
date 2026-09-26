import bcrypt from "bcrypt"
import { OAuth2Client } from "google-auth-library"
import { env } from "../config/env.js"
import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import { createSession, revokeAllUserSessions } from "./session.service.js"

const googleClient = env.googleClientId
    ? new OAuth2Client(env.googleClientId)
    : null

const basicUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    avatarUrl: true,
}

const currentUserSelect = {
    ...basicUserSelect,
    lastLoginAt: true,
    createdAt: true,
    studentProfile: { include: { department: true } },
    facultyProfile: { include: { department: true } },
    staffProfile: true,
    deanOfficeHeld: {
        select: { office: true, assignedAt: true },
    },
    staffBuildings: {
        select: {
            assignedAt: true,
            building: {
                select: { id: true, code: true, name: true, isActive: true },
            },
        },
    },
}

function normalizeEmail(email) {
    return email.trim().toLowerCase()
}

function profileDataForRole(role) {
    if (role === "STUDENT") return { studentProfile: { create: {} } }
    if (role === "FACULTY") return { facultyProfile: { create: {} } }
    if (role === "STAFF") return { staffProfile: { create: {} } }
    return {}
}

async function requireActiveApproval(email, db = prisma) {
    const approval = await db.approvedUser.findUnique({
        where: { email },
        select: { initialRole: true, isActive: true },
    })

    if (!approval?.isActive) {
        throw new ApiError(
            403,
            "This institutional account is not approved for registration",
            {
                code: "REGISTRATION_NOT_APPROVED",
            }
        )
    }

    return approval
}

function assertActiveUser(user) {
    if (!user?.isActive) {
        throw new ApiError(
            403,
            "This account is inactive. Contact an administrator.",
            {
                code: "ACCOUNT_INACTIVE",
            }
        )
    }
}

export async function registerWithPassword({
    name,
    email,
    password,
    sessionContext,
}) {
    const normalizedEmail = normalizeEmail(email)
    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS)

    return prisma.$transaction(async (tx) => {
        const approval = await requireActiveApproval(normalizedEmail, tx)
        const existingUser = await tx.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        })
        if (existingUser) {
            throw new ApiError(
                409,
                "An account already exists for this email",
                { code: "ACCOUNT_EXISTS" }
            )
        }

        const user = await tx.user.create({
            data: {
                name,
                email: normalizedEmail,
                hashedPassword,
                role: approval.initialRole,
                lastLoginAt: new Date(),
                ...profileDataForRole(approval.initialRole),
            },
            select: basicUserSelect,
        })

        const { token, session } = await createSession({
            userId: user.id,
            ...sessionContext,
            db: tx,
        })
        return { user, token, expiresAt: session.expiresAt }
    })
}

export async function loginWithPassword({ email, password, sessionContext }) {
    const normalizedEmail = normalizeEmail(email)
    const credential = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { ...basicUserSelect, hashedPassword: true },
    })

    const passwordMatches = credential?.hashedPassword
        ? await bcrypt.compare(password, credential.hashedPassword)
        : false

    if (!credential || !passwordMatches) {
        throw new ApiError(401, "Invalid email or password", {
            code: "INVALID_CREDENTIALS",
        })
    }
    assertActiveUser(credential)

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: { id: credential.id },
            data: { lastLoginAt: new Date() },
            select: basicUserSelect,
        })
        const { token, session } = await createSession({
            userId: user.id,
            ...sessionContext,
            db: tx,
        })
        return { user, token, expiresAt: session.expiresAt }
    })
}

async function verifyGoogleCredential(credential) {
    if (!googleClient || !env.googleClientId) {
        throw new ApiError(503, "Google login is not configured", {
            code: "GOOGLE_LOGIN_UNAVAILABLE",
        })
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: env.googleClientId,
        })
        const payload = ticket.getPayload()

        if (
            !payload?.sub ||
            !payload.email ||
            payload.email_verified !== true
        ) {
            throw new Error("Google identity is incomplete or unverified")
        }

        return {
            googleId: payload.sub,
            email: normalizeEmail(payload.email),
            name: payload.name?.trim() || payload.email.split("@")[0],
            avatarUrl: payload.picture || null,
        }
    } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError(401, "Google sign-in could not be verified", {
            code: "INVALID_GOOGLE_CREDENTIAL",
            cause: error,
        })
    }
}

export async function loginWithGoogle({ credential, sessionContext }) {
    const identity = await verifyGoogleCredential(credential)

    return prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({
            where: { googleId: identity.googleId },
            select: basicUserSelect,
        })

        if (!user) {
            const emailUser = await tx.user.findUnique({
                where: { email: identity.email },
                select: { ...basicUserSelect, googleId: true },
            })

            if (
                emailUser?.googleId &&
                emailUser.googleId !== identity.googleId
            ) {
                throw new ApiError(
                    409,
                    "This email is already linked to another Google identity",
                    {
                        code: "GOOGLE_IDENTITY_CONFLICT",
                    }
                )
            }

            if (emailUser) {
                assertActiveUser(emailUser)
                user = await tx.user.update({
                    where: { id: emailUser.id },
                    data: {
                        googleId: identity.googleId,
                        avatarUrl: emailUser.avatarUrl || identity.avatarUrl,
                    },
                    select: basicUserSelect,
                })
            } else {
                const approval = await requireActiveApproval(identity.email, tx)
                user = await tx.user.create({
                    data: {
                        name: identity.name,
                        email: identity.email,
                        googleId: identity.googleId,
                        avatarUrl: identity.avatarUrl,
                        role: approval.initialRole,
                        ...profileDataForRole(approval.initialRole),
                    },
                    select: basicUserSelect,
                })
            }
        }

        assertActiveUser(user)
        user = await tx.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
            select: basicUserSelect,
        })

        const { token, session } = await createSession({
            userId: user.id,
            ...sessionContext,
            db: tx,
        })
        return { user, token, expiresAt: session.expiresAt }
    })
}

export async function getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: currentUserSelect,
    })
    assertActiveUser(user)
    return user
}

export async function replacePassword({
    userId,
    currentPassword,
    newPassword,
    sessionContext,
}) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, hashedPassword: true, isActive: true },
    })
    assertActiveUser(user)

    if (user.hashedPassword) {
        const matches = currentPassword
            ? await bcrypt.compare(currentPassword, user.hashedPassword)
            : false
        if (!matches) {
            throw new ApiError(401, "The current password is incorrect", {
                code: "INVALID_CURRENT_PASSWORD",
            })
        }
    }

    const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS)

    return prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { hashedPassword },
        })
        await revokeAllUserSessions(userId, tx)
        const { token, session } = await createSession({
            userId,
            ...sessionContext,
            db: tx,
        })
        return { token, expiresAt: session.expiresAt }
    })
}
