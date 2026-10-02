import "dotenv/config"
import { z } from "zod"

const envSchema = z
    .object({
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
        BOOKING_TIMELINE_START_MINUTE: z.coerce
            .number()
            .int()
            .min(0)
            .max(1439)
            .default(480),
        BOOKING_TIMELINE_END_MINUTE: z.coerce
            .number()
            .int()
            .min(1)
            .max(1440)
            .default(1320),
        BOOKING_MIN_DURATION_MINUTES: z.coerce
            .number()
            .int()
            .min(30)
            .max(1440)
            .default(30),
        BOOKING_SELECTION_STEP_MINUTES: z.coerce
            .number()
            .int()
            .min(1)
            .max(60)
            .default(10),
        BOOKING_DEFAULT_DURATION_MINUTES: z.coerce
            .number()
            .int()
            .min(30)
            .max(1440)
            .default(60),
        TIMETABLE_IMPORT_MAX_BYTES: z.coerce
            .number()
            .int()
            .min(1024)
            .max(25 * 1024 * 1024)
            .default(5 * 1024 * 1024),
        TIMETABLE_IMPORT_MAX_ROWS: z.coerce
            .number()
            .int()
            .min(1)
            .max(20000)
            .default(5000),
    })
    .superRefine((values, context) => {
        if (
            values.BOOKING_TIMELINE_START_MINUTE >=
            values.BOOKING_TIMELINE_END_MINUTE
        ) {
            context.addIssue({
                code: "custom",
                path: ["BOOKING_TIMELINE_END_MINUTE"],
                message: "must be later than BOOKING_TIMELINE_START_MINUTE",
            })
        }
        if (
            values.BOOKING_DEFAULT_DURATION_MINUTES <
            values.BOOKING_MIN_DURATION_MINUTES
        ) {
            context.addIssue({
                code: "custom",
                path: ["BOOKING_DEFAULT_DURATION_MINUTES"],
                message: "must be at least BOOKING_MIN_DURATION_MINUTES",
            })
        }
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
