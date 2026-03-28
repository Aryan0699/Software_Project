import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";

export const validate = (schema, source = "body") => {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            const errors = result.error.errors.map(e => ({
                field: e.path.join("."),
                message: e.message,
            }));

            logger.warn(`Validation failed for ${source}:`, { errors });
            throw new ApiError(400, "Validation failed", errors);
        }

        // Replace with parsed/sanitized data
        req[source] = result.data;
        next();
    };
};

export const validateMultiple = (schemas) => {
    return (req, res, next) => {
        const allErrors = [];

        for (const [source, schema] of Object.entries(schemas)) {
            const result = schema.safeParse(req[source]);

            if (!result.success) {
                const errors = result.error.errors.map(e => ({
                    field: `${source}.${e.path.join(".")}`,
                    message: e.message,
                }));
                allErrors.push(...errors);
            } else {
                req[source] = result.data;
            }
        }

        if (allErrors.length > 0) {
            logger.warn("Validation failed:", { errors: allErrors });
            throw new ApiError(400, "Validation failed", allErrors);
        }

        next();
    };
};
