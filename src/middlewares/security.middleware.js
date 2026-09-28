import { env } from "../config/env.js"
import ApiError from "../utils/ApiError.js"

export function requireTrustedOrigin(req, _res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next()

    const origin = req.get("origin")

    if (origin && !env.corsOrigins.includes(origin)) {
        return next(
            new ApiError(403, "Request origin is not allowed", {
                code: "UNTRUSTED_ORIGIN",
            })
        )
    }

    return next()
}
