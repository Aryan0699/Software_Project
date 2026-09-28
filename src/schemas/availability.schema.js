import { z } from "zod"
import { env } from "../config/env.js"

const recordId = z.string().trim().min(1).max(64)
const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
    .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`)
        return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().startsWith(value)
        )
    }, "Date is invalid")
const optionalBooleanQuery = z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()

export const availabilityRoomParamsSchema = z.object({ id: recordId }).strict()

export const searchAvailabilityQuerySchema = z
    .object({
        date: isoDate,
        startMinute: z.coerce.number().int().min(0).max(1439).optional(),
        endMinute: z.coerce.number().int().min(1).max(1440).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
        search: z.string().trim().max(100).optional(),
        buildingId: recordId.optional(),
        roomTypeId: recordId.optional(),
        minCapacity: z.coerce.number().int().min(1).optional(),
        isAccessible: optionalBooleanQuery,
        availableOnly: optionalBooleanQuery,
        features: z
            .string()
            .trim()
            .max(500)
            .transform((value) =>
                [
                    ...new Set(value.split(",").map((item) => item.trim())),
                ].filter(Boolean)
            )
            .refine((value) => value.length <= 20, "Too many features")
            .optional(),
    })
    .strict()
    .refine(
        (value) =>
            (value.startMinute === undefined) ===
            (value.endMinute === undefined),
        {
            path: ["endMinute"],
            message: "Start and end time must be provided together",
        }
    )
    .refine(
        (value) =>
            value.startMinute === undefined ||
            value.endMinute === undefined ||
            value.startMinute < value.endMinute,
        {
            path: ["endMinute"],
            message: "End time must be after start time",
        }
    )
    .refine(
        (value) =>
            value.startMinute === undefined ||
            value.endMinute === undefined ||
            value.endMinute - value.startMinute >=
                env.BOOKING_MIN_DURATION_MINUTES,
        {
            path: ["endMinute"],
            message:
                "Availability intervals must meet the minimum booking duration",
        }
    )
    .refine(
        (value) => value.startMinute !== undefined || !value.availableOnly,
        {
            path: ["availableOnly"],
            message: "Available-only filtering requires a time range",
        }
    )

export const roomTimelineQuerySchema = z.object({ date: isoDate }).strict()

export const availabilityTimelineConfigQuerySchema = roomTimelineQuerySchema
