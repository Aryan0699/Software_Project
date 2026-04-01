import jwt from "jsonwebtoken"
import ApiError  from "../utils/apiError.js"
import {env} from "../utils/env.js"
import logger from "../utils/logger.js";

const verifyJWTToken = (req,res,next) => {
    logger.info("Verifying JWT token for incoming request");
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        return next(new ApiError(401, "Unauthorized: No token provided"));
    }

    try {
        const payload = jwt.verify(token,env.JWT_SECRET_KEY);
        req.user = payload; // {userId, role, email}
        logger.info(`Token verification successful for user ID: ${payload.userId}`);
        next();
    } catch (error) {
        logger.warn("Token verification failed: Invalid token or expired");
        throw new ApiError(401,"Unauthorized ! Invalid token | Token Expired");
    }
        
}

export default verifyJWTToken;