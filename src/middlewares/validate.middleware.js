import ApiError from "../utils/ApiError.js"

function validateRequestPart({ schema, source, target }) {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source])

        if (!result.success) {
            return next(
                new ApiError(400, "Request validation failed", {
                    code: "VALIDATION_ERROR",
                    details: result.error.issues.map((issue) => ({
                        path: issue.path.join("."),
                        message: issue.message,
                    })),
                })
            )
        }

        req[target] = result.data
        return next()
    }
}

export function validateBody(schema) {
    return validateRequestPart({
        schema,
        source: "body",
        target: "validatedBody",
    })
}

export function validateParams(schema) {
    return validateRequestPart({
        schema,
        source: "params",
        target: "validatedParams",
    })
}

export function validateQuery(schema) {
    return validateRequestPart({
        schema,
        source: "query",
        target: "validatedQuery",
    })
}
