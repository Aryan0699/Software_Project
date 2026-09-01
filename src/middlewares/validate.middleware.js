import ApiError from "../utils/ApiError.js"

// This is for validating the request body against a Zod schema. If the validation fails, it will throw an ApiError with status code 400 and details about the validation errors. If the validation succeeds, it will attach the validated data to req.validatedBody for use in subsequent middleware or route handlers.
export function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body)

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

        req.validatedBody = result.data
        return next()
    }
}
