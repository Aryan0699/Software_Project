import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .default("info"),
    SESSION_COOKIE_NAME: z.string().min(1).default("uras_session"),
    SESSION_TTL_HOURS: z.coerce
        .number()
        .int()
        .min(1)
        .max(24 * 90)
        .default(24 * 7),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    AUTH_RATE_LIMIT_PER_15_MIN: z.coerce
        .number()
        .int()
        .min(1)
        .max(500)
        .default(20),
    GOOGLE_CLIENT_ID: z.string().trim().optional(),
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    const errors = parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
    )
    throw new Error(`Invalid environment configuration:\n${errors.join("\n")}`)
}

const values = parsed.data

export const env = Object.freeze({
    ...values,
    // there are several settings like pino logger structured json and also session cookie settings wanting https only in production
    isProduction: values.NODE_ENV === "production",
    // because in production you will have nginx and it might think all req coming from same ip and rate limit it so we need to tell him to inspect teh x-forwarded-for header and get the real ip address from there
    trustProxy: values.TRUST_PROXY === "true", 
    corsOrigins: values.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    googleClientId: values.GOOGLE_CLIENT_ID || null,
    sessionTtlMs: values.SESSION_TTL_HOURS * 60 * 60 * 1000,
})
