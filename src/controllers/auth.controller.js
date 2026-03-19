import asyncHandler from "../utils/asyncHandler.js";
import { signupService, loginService } from "../services/auth.service.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import {getCurrentUser}  from "../services/auth.service.js";
import logger from "../utils/logger.js";

const signup = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    logger.info(`Signup attempt for email: ${email}`);
    // Input validation - Check if all required fields are present and valid
    const fields = { username, email, password };

    for (let field in fields) {
        if (!fields[field] || typeof fields[field] !== "string" || fields[field].trim() === "") {
            logger.warn(`Signup failed: Missing or invalid field - ${field}`);
            throw new ApiError(400, `${field} is required`);
        }     
    }

    const user = await signupService({ username, email, password });
    
    logger.info(`User registered successfully: ${user.email} (ID: ${user.id})`);

    res.status(201).json(new ApiResponse(true, "User registered successfully", 
        { 
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        }
    ));
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    logger.info(`Login attempt for email: ${email}`);
    // Input validation - Check if all required fields are present and valid
    const fields = {email, password };

    for (let field in fields) {
        if (!fields[field] || typeof fields[field] !== "string" || fields[field].trim() === "") {
            logger.warn(`Login failed: Missing or invalid field - ${field}`);
            throw new ApiError(400, `${field} is required`);
        }     
    }

    const { user, accessToken } = await loginService({ email, password });
    logger.info(`Login successful for email: ${email} (User ID: ${user.id})`);
    return res.status(200).json(new ApiResponse(200,"Login successful",{
        accessToken,
        user:{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        }
    }));
});

const getUser = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await getCurrentUser(userId);  

    logger.info(`User fetched successfully: ${user.email} (ID: ${user.id})`);   
    return res.status(200).json(new ApiResponse(200,"User fetched successfully",user));
});

export {signup,login,getUser};

    




