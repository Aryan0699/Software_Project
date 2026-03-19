import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        logger.info("Checking role authorization for incoming request");
        if(!req.user || !req.user.role)
        {
            throw new ApiError(401,"Unauthorized");
        }
        const userRole = req.user.role;
        if(!allowedRoles.includes(userRole)){
            logger.warn(`Role authorization failed for user ID: ${req.user.userId} - Required roles: ${allowedRoles.join(", ")}`);
            throw new ApiError(403,"Forbidden ! You don't have permission to access this resource");
        }
        logger.info(`Role authorization successful for user ID: ${req.user.userId} with role: ${userRole}`);
        next();
    }
}
export default authorizeRoles;