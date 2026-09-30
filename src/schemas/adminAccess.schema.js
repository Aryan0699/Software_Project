import { z } from "zod"

const roles = ["STUDENT", "FACULTY", "STAFF", "ADMIN"]

const recordId = z.string().trim().min(1).max(64)
const email = z.string().trim().toLowerCase().email().max(320)

const optionalBooleanQuery = z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()

const paginationFields = {
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
}

export const recordIdParamsSchema = z
    .object({
        id: recordId,
    })
    .strict()

export const listApprovedUsersQuerySchema = z
    .object({
        ...paginationFields,
        search: z.string().trim().max(100).optional(),
        role: z.enum(roles).optional(),
        isActive: optionalBooleanQuery,
    })
    .strict()

export const createApprovedUserSchema = z
    .object({
        email,
        initialRole: z.enum(roles),
    })
    .strict()

export const updateApprovedUserSchema = z
    .object({
        initialRole: z.enum(roles).optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const listUsersQuerySchema = z
    .object({
        ...paginationFields,
        search: z.string().trim().max(100).optional(),
        role: z.enum(roles).optional(),
        isActive: optionalBooleanQuery,
    })
    .strict()

export const updateUserAccessSchema = z
    .object({
        role: z.enum(roles).optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const createInstitutionalApproverSchema = z
    .object({
        userId: recordId,
        title: z.string().trim().min(2).max(100),
    })
    .strict()

export const updateInstitutionalApproverSchema = z
    .object({
        title: z.string().trim().min(2).max(100).optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const listStaffAssignmentsQuerySchema = z
    .object({
        ...paginationFields,
        buildingId: recordId.optional(),
        staffUserId: recordId.optional(),
    })
    .strict()

export const createStaffAssignmentSchema = z
    .object({
        buildingId: recordId,
        staffUserId: recordId,
    })
    .strict()
