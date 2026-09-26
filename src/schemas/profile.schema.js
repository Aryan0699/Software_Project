import { z } from "zod"

const nullableText = (maximum) =>
    z.union([z.string().trim().max(maximum), z.null()]).optional()

export const updateProfileSchema = z
    .object({
        name: z.string().trim().min(2).max(100).optional(),
        departmentId: z
            .union([z.string().trim().min(1).max(64), z.null()])
            .optional(),
        rollNumber: nullableText(50),
        batchYear: z
            .union([z.number().int().min(1900).max(2200), z.null()])
            .optional(),
        designation: nullableText(120),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })
