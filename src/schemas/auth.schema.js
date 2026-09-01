import { z } from "zod"

const email = z.string().trim().toLowerCase().email().max(320)

const password = z
    .string()
    .min(10, "Password must contain at least 10 characters")
    .max(72, "Password must contain at most 72 characters")
    .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Password must contain at most 72 UTF-8 bytes"
    )
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number")

export const registerSchema = z
    .object({
        name: z.string().trim().min(2).max(100),
        email,
        password,
    })
    .strict()

export const loginSchema = z
    .object({
        email,
        password: z.string().min(1).max(72),
    })
    .strict()

export const googleLoginSchema = z
    .object({
        credential: z.string().min(100).max(10_000),
    })
    .strict()

export const setPasswordSchema = z
    .object({
        currentPassword: z.string().min(1).max(72).optional(),
        newPassword: password,
    })
    .strict()
