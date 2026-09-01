import logger from "../utils/logger.js"

function normalizeError(error) {
    if (error?.type === "entity.parse.failed") {
        return {
            statusCode: 400,
            code: "INVALID_JSON",
            message: "Request body contains invalid JSON",
            details: null,
        }
    }

    if (error?.code === "P2002") {
        return {
            statusCode: 409,
            code: "DUPLICATE_RECORD",
            message: "A record with these unique values already exists",
            details: null,
        }
    }

    if (error?.code === "P2025") {
        return {
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "The requested record was not found",
            details: null,
        }
    }

    return {
        statusCode: error?.statusCode || 500,
        code: error?.code || "INTERNAL_ERROR",
        message: error?.message || "An unexpected error occurred",
        details: error?.details ?? null,
    }
}
// _res means i am not using it and to avoid eslint warning i am prefixing it with _ so that eslint does not complain about unused variable
export function notFoundHandler(req, _res, next) {
    const error = new Error(
        `Route ${req.method} ${req.originalUrl} was not found`
    )
    error.statusCode = 404
    error.code = "ROUTE_NOT_FOUND"
    next(error)
}

export function errorHandler(error, req, res, _next) {
    const normalized = normalizeError(error)
    const isServerError = normalized.statusCode >= 500

    const logContext = {
        err: error,
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id,
    }

    if (isServerError) {
        logger.error(logContext, "Request failed")
    } else {
        logger.warn(
            {
                requestId: req.id,
                method: req.method,
                path: req.originalUrl,
                userId: req.user?.id,
                statusCode: normalized.statusCode,
                errorCode: normalized.code,
            },
            "Request rejected"
        )
    }

    res.status(normalized.statusCode).json({
        success: false,
        error: {
            code: normalized.code,
            message: isServerError
                ? "An unexpected error occurred"
                : normalized.message,
            ...(normalized.details ? { details: normalized.details } : {}),
        },
        requestId: req.id,
    })
}
