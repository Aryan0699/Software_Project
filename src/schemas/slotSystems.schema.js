import { z } from "zod"

const recordId = z.string().trim().min(1).max(64)
const slotKinds = ["LECTURE", "LAB", "TUTORIAL", "SPECIAL"]
const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
]

const optionalBooleanQuery = z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()

const code = z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((value) => value.toUpperCase())
    .pipe(
        z
            .string()
            .regex(
                /^[A-Z0-9][A-Z0-9_-]*$/,
                "Code may contain uppercase letters, numbers, underscores, and hyphens"
            )
    )

const nullableText = (maximum) =>
    z
        .union([z.string().trim().max(maximum), z.null()])
        .transform((value) => (value === "" ? null : value))

const occurrence = z
    .object({
        dayOfWeek: z.enum(days),
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
    })
    .strict()
    .refine((value) => value.startMinute < value.endMinute, {
        path: ["endMinute"],
        message: "End time must be after start time",
    })

const occurrences = z
    .array(occurrence)
    .max(28)
    .superRefine((values, context) => {
        const seen = new Set()
        values.forEach((value, index) => {
            const key = `${value.dayOfWeek}:${value.startMinute}:${value.endMinute}`
            if (seen.has(key)) {
                context.addIssue({
                    code: "custom",
                    path: [index],
                    message: "Duplicate weekly occurrence",
                })
            }
            seen.add(key)
        })
    })

export const recordIdParamsSchema = z.object({ id: recordId }).strict()

export const systemAndGridParamsSchema = z
    .object({ systemId: recordId, gridId: recordId })
    .strict()

export const systemGridAndSlotParamsSchema = z
    .object({ systemId: recordId, gridId: recordId, slotId: recordId })
    .strict()

export const listSlotSystemsQuerySchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25),
        search: z.string().trim().max(100).optional(),
        isActive: optionalBooleanQuery,
    })
    .strict()

export const createSlotSystemSchema = z
    .object({
        code,
        name: z.string().trim().min(2).max(120),
        description: nullableText(500).optional(),
        applicableFor: nullableText(200).optional(),
    })
    .strict()

export const updateSlotSystemSchema = z
    .object({
        code: code.optional(),
        name: z.string().trim().min(2).max(120).optional(),
        description: nullableText(500).optional(),
        applicableFor: nullableText(200).optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const createGridVersionSchema = z
    .object({ basedOnVersionId: recordId.optional() })
    .strict()

export const slotInputSchema = z
    .object({
        code,
        slotKind: z.enum(slotKinds),
        occurrences,
    })
    .strict()
