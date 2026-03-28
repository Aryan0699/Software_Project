import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import {prisma} from "../db/index.js";
import ApiError from "../utils/apiError.js";
import {env} from "../utils/env.js"
import { SALT_ROUNDS } from "../constants.js";
import logger from "../utils/logger.js";

const generateAccessToken = (user) => {

    const payload = {
        userId: user.id,
        role: user.role,
        email: user.email
    }
    const accessToken = jwt.sign(
        payload,
        env.JWT_SECRET_KEY,
        {
            expiresIn: env.JWT_EXPIRES_IN || "1d"
        }    
    )
    logger.info(`Generated access token for user ID: ${user.id} with role: ${user.role}`);
    return accessToken;
}

const signupService = async ({name,email,password}) => {
    email = email.toLowerCase().trim();
    name = name.trim();
    logger.info("Signup service called for email: " + email);
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if(existingUser){
        throw new ApiError(409,"User Already Exists ! Please Login");
    }

    const approved = await prisma.approvedUser.findUnique({
        where: { email }
    })

    const role = approved ? approved.role : "USER";
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS || 10);

    const user = await prisma.user.create({
        data:{
            name,
            email,
            hashedPassword,
            role
        },
    })
    
    return user;
}



const loginService = async ({email,password}) => {
    email = email.toLowerCase().trim();
    logger.info("Login service called for email: " + email);
    const user = await prisma.user.findUnique({
        where: { email }
    })

    if(!user){
        logger.warn(`Login failed for email: ${email} - User not found`);

        throw new ApiError(401,"Invalid Credentials or User Not Found !");
    }

    if(!user.isActive){
        logger.warn(`Login failed for email: ${email} - Account is deactivated`);
        throw new ApiError(403,"Your Account is Deactivated. Please Contact Support.");
    }
    logger.info("User password is: " + user.hashedPassword);
    const currenthashpassword = await bcrypt.hash(password, SALT_ROUNDS || 10);
    logger.info("Current hash password is: " + currenthashpassword);
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if(!passwordMatch){
        logger.warn(`Login failed for email: ${email} - Incorrect password`);
        throw new ApiError(401,"Password is Incorrect !");
    }

    const accessToken = generateAccessToken(user);

    return {user,accessToken};

}

const getCurrentUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if(!user){
        throw new ApiError(404,"User Not Found !");
    }

    if(!user.isActive){
        logger.warn(`User fetch failed for ID: ${userId} - Account is deactivated`);
        throw new ApiError(403,"Your Account is Deactivated. Please Contact Support.");
    }
    logger.info(`User fetched successfully: ${user.email} (ID: ${user.id})`);
    return user;
};

export {signupService, loginService, getCurrentUser};