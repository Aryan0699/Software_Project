import dotenv from "dotenv";
dotenv.config(
    {
        path:"./.env"
    }
);

const requiredEnvVars = ["PORT", "DATABASE_URL", "JWT_SECRET_KEY"];

requiredEnvVars.forEach((envVar)=>
{
    if( !process.env[envVar] )
    {
        throw new Error(`Environment variable not set: ${envVar}`);
    }
})

export const env ={
    PORT:process.env.PORT,
    DATABASE_URL:process.env.DATABASE_URL,
    JWT_SECRET_KEY:process.env.JWT_SECRET_KEY,
    CORS_ORIGIN:process.env.CORS_ORIGIN,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
}
