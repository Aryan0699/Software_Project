import { env } from "../config/env.js"
import { expiredSessionCookieOptions } from "../config/session.js"
import { findActiveSession } from "../services/session.service.js"
import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"

export const requireAuth = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[env.SESSION_COOKIE_NAME]
    const session = await findActiveSession(token)

    if (!session) {
        if (token)
            res.clearCookie(
                env.SESSION_COOKIE_NAME,
                expiredSessionCookieOptions
            )
        throw new ApiError(401, "Authentication is required", {
            code: "UNAUTHENTICATED",
        })
    }

    req.auth = {
        sessionId: session.id,
        expiresAt: session.expiresAt,
    }
    req.user = session.user
    next()
})

export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(
                new ApiError(
                    403,
                    "You do not have permission to perform this action",
                    { code: "FORBIDDEN" }
                )
            )
        }
        return next()
    }
}
