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

            return next(new ApiError(400, "Validation failed", errors));
        }
        // since express's req.validated.query and req.params are getter-only so usko kuch assign nahi kar sakte 
        //basically we cant mutate req.validated.query so storing in other variable
        if (!req.validated) {
            req.validated = {};
        }

        req.validated[source] = result.data;

        next();
    };
};

export const validateMultiple = (schemas) => {
    return (req, res, next) => {
        const allErrors = [];

        if (!req.validated) {
            req.validated = {};
        }

        for (const [source, schema] of Object.entries(schemas)) {

            const result = schema.safeParse(req[source]);

            if (!result.success) {
                const errors = result.error.errors.map(e => ({
                    field: `${source}.${e.path.join(".")}`,
                    message: e.message,
                }));

                allErrors.push(...errors);
                continue;
            }

            // ✅ store validated values safely
            req.validated[source] = result.data;
        }

        if (allErrors.length > 0) {
            logger.warn("Validation failed:", { errors: allErrors });

            return next(new ApiError(400, "Validation failed", allErrors));
        }

        next();
    };
};