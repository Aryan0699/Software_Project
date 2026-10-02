import { z } from "zod"

const recordId = z.string().trim().min(1).max(64)
const minute = z.coerce.number().int().min(0).max(1440)
const slotKinds = ["LECTURE", "LAB", "TUTORIAL", "SPECIAL"]

const gridRange = {
    dayStartMinute: minute.default(480),
    dayEndMinute: minute.default(1130),
}

function validGridRange(value, context) {
    const length = value.dayEndMinute - value.dayStartMinute
    if (length < 50 || (length - 50) % 60 !== 0) {
        context.addIssue({
            code: "custom",
            path: ["dayEndMinute"],
            message:
                "The range must contain complete 50-minute periods separated by 10-minute gaps",
        })
    }
}

export const idParamsSchema = z.object({ id: recordId }).strict()
export const slotParamsSchema = z
    .object({ id: recordId, slotId: recordId })
    .strict()

export const createSlotSystemSchema = z
    .object({
        code: z
            .string()
            .trim()
            .min(1)
            .max(40)
            .transform((value) => value.toUpperCase())
            .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]*$/)),
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(500).nullable().optional(),
        applicableFor: z.string().trim().max(200).nullable().optional(),
    })
    .strict()

export const updateSlotSystemSchema = z
    .object({
        name: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().max(500).nullable().optional(),
        applicableFor: z.string().trim().max(200).nullable().optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const createDraftSchema = z
    .object({
        sourceGridVersionId: recordId.optional(),
        ...gridRange,
    })
    .strict()
    .superRefine(validGridRange)

export const updateGridRangeSchema = z
    .object(gridRange)
    .strict()
    .superRefine(validGridRange)

export const createSlotSchema = z
    .object({
        code: z
            .string()
            .trim()
            .min(1)
            .max(30)
            .transform((v) => v.toUpperCase()),
        slotKind: z.enum(slotKinds).default("LECTURE"),
    })
    .strict()

export const updateSlotSchema = z
    .object({
        code: z
            .string()
            .trim()
            .min(1)
            .max(30)
            .transform((v) => v.toUpperCase())
            .optional(),
        slotKind: z.enum(slotKinds).optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const toggleCellSchema = z
    .object({
        slotId: recordId,
        dayOfWeek: z.enum([
            "SUNDAY",
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
        ]),
        startMinute: minute.max(1390),
    })
    .strict()
