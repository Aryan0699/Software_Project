import { Router } from "express"
import { rateLimit } from "express-rate-limit"
import { env } from "../config/env.js"
import {
    currentUser,
    googleLogin,
    login,
    logout,
    logoutAll,
    register,
    setPassword,
    updateCurrentProfile,
} from "../controllers/auth.controller.js"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import { validateBody } from "../middlewares/validate.middleware.js"
import {
    googleLoginSchema,
    loginSchema,
    registerSchema,
    setPasswordSchema,
} from "../schemas/auth.schema.js"
import { updateProfileSchema } from "../schemas/profile.schema.js"

const authRouter = Router()

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.AUTH_RATE_LIMIT_PER_15_MIN,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: "AUTH_RATE_LIMITED",
            message: "Too many authentication attempts. Try again later.",
        },
    },
})

authRouter.use(requireTrustedOrigin)

authRouter.post(
    "/register",
    authLimiter,
    validateBody(registerSchema),
    register
)
authRouter.post("/login", authLimiter, validateBody(loginSchema), login)
authRouter.post(
    "/google",
    authLimiter,
    validateBody(googleLoginSchema),
    googleLogin
)
authRouter.get("/me", requireAuth, currentUser)
authRouter.post("/logout", requireAuth, logout)
authRouter.post("/logout-all", requireAuth, logoutAll)
authRouter.put(
    "/password",
    requireAuth,
    validateBody(setPasswordSchema),
    setPassword
)
authRouter.patch(
    "/profile",
    requireAuth,
    validateBody(updateProfileSchema),
    updateCurrentProfile
)

export default authRouter
