import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import {prisma} from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import {env} from "../utils/env.js"

const SALT_ROUNDS = 10;

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
            expiresIn: "1d"
        }    
    )
    return accessToken;
}

const signupService = async ({username,email,password}) => {
    email = email.toLowerCase().trim();
    username = username.toLowerCase().trim();
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
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
        data:{
            username,
            email,
            hashedPassword,
            role
        },
    })
    
    return user;
}



const loginService = async ({email,password}) => {
    email = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if(!user){
        throw new ApiError(401,"Invalid Credentials or User Not Found !");
    }

    if(!user.isActive){
        throw new ApiError(403,"Your Account is Deactivated. Please Contact Support.");
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if(!passwordMatch){
        throw new ApiError(401,"Password is Incorrect !");
    }

    const accessToken = generateAccessToken(user);

    return {user,accessToken};

}
