import ApiError from "../utils/apiError";

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.user || !req.user.role)
        {
            throw new ApiError(401,"Unauthorized");
        }
        const userRole = req.user.role;
        if(!allowedRoles.includes(userRole)){
            throw new ApiError(403,"Forbidden ! You don't have permission to access this resource");
        }
        next();
    }
}
export default authorizeRoles;