import jwt from "jsonwebtoken"
import { ApiError } from "../utils/apiError.js"
import {env} from "../utils/env.js"
import { de } from "zod/v4/locales";

const verifyJWTToken = (req,res,next) => {

    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        throw new   ApiError(401,"Unauthorized ! No token provided");
    }

    const token = authHeader.trim().split(" ")[1];

    try {
        const payload = jwt.verify(token,env.JWT_SECRET_KEY);
        req.user = payload; // {userId, role, email}
        next();
    } catch (error) {
        throw new ApiError(401,"Unauthorized ! Invalid token | Token Expired");
    }
        
}

export default verifyJWTToken;