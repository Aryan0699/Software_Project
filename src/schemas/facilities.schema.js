import { z } from "zod"

const recordId = z.string().trim().min(1).max(64)
const code = z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value.toUpperCase())
    .pipe(
        z
            .string()
            .regex(
                /^[A-Z0-9][A-Z0-9_-]*$/,
                "Code may contain uppercase letters, numbers, underscores, and hyphens"
            )
    )
const name = z.string().trim().min(2).max(120)
const optionalText = (maximum) =>
    z.union([z.string().trim().max(maximum), z.null()]).optional()
const optionalBooleanQuery = z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
const paginationFields = {
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
}
const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
    .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`)
        return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    }, "Date is invalid")

export const recordIdParamsSchema = z.object({ id: recordId }).strict()

export const listReferenceQuerySchema = z
    .object({
        ...paginationFields,
        search: z.string().trim().max(100).optional(),
        isActive: optionalBooleanQuery,
    })
    .strict()

export const createReferenceSchema = z.object({ code, name }).strict()

export const updateReferenceSchema = z
    .object({ code: code.optional(), name: name.optional(), isActive: z.boolean().optional() })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const listBuildingsQuerySchema = z
    .object({
        ...paginationFields,
        search: z.string().trim().max(100).optional(),
        isActive: optionalBooleanQuery,
    })
    .strict()

export const createBuildingSchema = z
    .object({ code, name, location: optionalText(200) })
    .strict()

export const updateBuildingSchema = z
    .object({
        code: code.optional(),
        name: name.optional(),
        location: optionalText(200),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

const features = z
    .array(z.string().trim().min(1).max(60))
    .max(30)
    .optional()

export const listRoomsQuerySchema = z
    .object({
        ...paginationFields,
        search: z.string().trim().max(100).optional(),
        buildingId: recordId.optional(),
        roomTypeId: recordId.optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        minCapacity: z.coerce.number().int().min(1).optional(),
        isAccessible: optionalBooleanQuery,
    })
    .strict()

export const createRoomSchema = z
    .object({
        buildingId: recordId,
        roomTypeId: z.union([recordId, z.null()]).optional(),
        roomNumber: z.string().trim().min(1).max(40),
        displayName: optionalText(120),
        capacity: z.union([z.number().int().min(1).max(100_000), z.null()]).optional(),
        isAccessible: z.boolean().optional(),
        features,
        notes: optionalText(2_000),
    })
    .strict()

export const updateRoomSchema = z
    .object({
        buildingId: recordId.optional(),
        roomTypeId: z.union([recordId, z.null()]).optional(),
        roomNumber: z.string().trim().min(1).max(40).optional(),
        displayName: optionalText(120),
        capacity: z.union([z.number().int().min(1).max(100_000), z.null()]).optional(),
        isAccessible: z.boolean().optional(),
        features,
        notes: optionalText(2_000),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        statusReason: optionalText(500),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })
    .superRefine((value, context) => {
        if (value.status === "INACTIVE" && !value.statusReason?.trim()) {
            context.addIssue({
                code: "custom",
                path: ["statusReason"],
                message: "A reason is required when deactivating a room",
            })
        }
    })

export const listRestrictionsQuerySchema = z
    .object({
        ...paginationFields,
        buildingId: recordId.optional(),
        roomId: recordId.optional(),
        status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
        dateFrom: isoDate.optional(),
        dateTo: isoDate.optional(),
    })
    .strict()
    .refine(
        (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
        { path: ["dateTo"], message: "End date must not be before start date" }
    )

export const createRestrictionSchema = z
    .object({
        roomId: recordId,
        restrictionDate: isoDate,
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
        reason: z.string().trim().min(3).max(500),
    })
    .strict()
    .refine((value) => value.startMinute < value.endMinute, {
        path: ["endMinute"],
        message: "End time must be after start time",
    })

