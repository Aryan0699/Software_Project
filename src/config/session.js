import { env } from "./env.js"

export const sessionCookieOptions = Object.freeze({
    httpOnly: true, // Prevent JS from accessing the cookie
    secure: env.isProduction, // Only send cookie over HTTPS in production
    sameSite: env.isProduction ? "none" : "lax", // Prevent cross site request forgery (CSRF) attacks
    path: "/", // send cookie for all routes
    maxAge: env.sessionTtlMs, // Set cookie expiration to match session TTL
})

export const expiredSessionCookieOptions = Object.freeze({
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/",
})
