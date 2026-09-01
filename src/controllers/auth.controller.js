import { env } from "../config/env.js"
import {
    expiredSessionCookieOptions,
    sessionCookieOptions,
} from "../config/session.js"
import {
    getCurrentUser,
    loginWithGoogle,
    loginWithPassword,
    registerWithPassword,
    replacePassword,
} from "../services/auth.service.js"
import {
    revokeAllUserSessions,
    revokeSession,
} from "../services/session.service.js"
import { updateProfile } from "../services/profile.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

function getSessionContext(req) {
    return {
        userAgent: req.get("user-agent"),
        ipAddress: req.ip,
    }
}

function setSessionCookie(res, token) {
    res.cookie(env.SESSION_COOKIE_NAME, token, sessionCookieOptions)
}

export const register = asyncHandler(async (req, res) => {
    const result = await registerWithPassword({
        ...req.validatedBody,
        sessionContext: getSessionContext(req),
    })
    setSessionCookie(res, result.token)
    res.status(201).json(
        new ApiResponse(201, "Account created", {
            user: result.user,
            expiresAt: result.expiresAt,
        })
    )
})

export const login = asyncHandler(async (req, res) => {
    const result = await loginWithPassword({
        ...req.validatedBody,
        sessionContext: getSessionContext(req),
    })
    setSessionCookie(res, result.token)
    res.json(
        new ApiResponse(200, "Signed in", {
            user: result.user,
            expiresAt: result.expiresAt,
        })
    )
})

export const googleLogin = asyncHandler(async (req, res) => {
    const result = await loginWithGoogle({
        ...req.validatedBody,
        sessionContext: getSessionContext(req),
    })
    setSessionCookie(res, result.token)
    res.json(
        new ApiResponse(200, "Signed in with Google", {
            user: result.user,
            expiresAt: result.expiresAt,
        })
    )
})

export const currentUser = asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.user.id)
    res.set("Cache-Control", "no-store")
    res.json(
        new ApiResponse(200, "Current user", {
            user,
            sessionExpiresAt: req.auth.expiresAt,
        })
    )
})

export const logout = asyncHandler(async (req, res) => {
    await revokeSession(req.auth.sessionId)
    res.clearCookie(env.SESSION_COOKIE_NAME, expiredSessionCookieOptions)
    res.json(new ApiResponse(200, "Signed out"))
})

export const logoutAll = asyncHandler(async (req, res) => {
    await revokeAllUserSessions(req.user.id)
    res.clearCookie(env.SESSION_COOKIE_NAME, expiredSessionCookieOptions)
    res.json(new ApiResponse(200, "Signed out from all devices"))
})

export const setPassword = asyncHandler(async (req, res) => {
    const result = await replacePassword({
        userId: req.user.id,
        ...req.validatedBody,
        sessionContext: getSessionContext(req),
    })
    setSessionCookie(res, result.token)
    res.json(
        new ApiResponse(200, "Password updated", {
            expiresAt: result.expiresAt,
        })
    )
})

export const updateCurrentProfile = asyncHandler(async (req, res) => {
    const user = await updateProfile(req.user.id, req.validatedBody)
    res.json(new ApiResponse(200, "Profile updated", { user }))
})
