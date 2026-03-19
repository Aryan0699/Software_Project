import jwt from "jsonwebtoken"
import ApiError  from "../utils/apiError.js"
import {env} from "../utils/env.js"
import logger from "../utils/logger.js";

const verifyJWTToken = (req,res,next) => {
    logger.info("Verifying JWT token for incoming request");
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        logger.warn("Token verification failed: No token provided");
        throw new   ApiError(401,"Unauthorized ! No token provided");
    }

    const token = authHeader.trim().split(" ")[1];

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