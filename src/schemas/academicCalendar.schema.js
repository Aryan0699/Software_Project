import { z } from "zod"

const recordId = z.string().trim().min(1).max(64)
const statuses = ["PLANNED", "CURRENT", "CLOSED"]
const exceptionTypes = ["NO_CLASSES", "FOLLOW_DAY"]
const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
]
const paginationFields = {
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
}
const optionalBooleanQuery = z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
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
const termCode = z
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
                "Term code may contain uppercase letters, numbers, underscores, and hyphens"
            )
    )

export const recordIdParamsSchema = z.object({ id: recordId }).strict()

export const listTermsQuerySchema = z
    .object({
        ...paginationFields,
        search: z.string().trim().max(100).optional(),
        status: z.enum(statuses).optional(),
    })
    .strict()

export const createTermSchema = z
    .object({
        termCode,
        name: z.string().trim().min(2).max(120),
        startDate: isoDate,
        endDate: isoDate,
    })
    .strict()
    .refine((value) => value.startDate <= value.endDate, {
        path: ["endDate"],
        message: "End date must not be before start date",
    })

export const updateTermSchema = z
    .object({
        termCode: termCode.optional(),
        name: z.string().trim().min(2).max(120).optional(),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    })

export const listExceptionsQuerySchema = z
    .object({
        ...paginationFields,
        academicTermId: recordId.optional(),
        exceptionType: z.enum(exceptionTypes).optional(),
        isActive: optionalBooleanQuery,
        dateFrom: isoDate.optional(),
        dateTo: isoDate.optional(),
    })
    .strict()
    .refine(
        (value) =>
            !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
        { path: ["dateTo"], message: "End date must not be before start date" }
    )

const calendarExceptionFields = z
    .object({
        academicTermId: recordId,
        name: z.string().trim().min(2).max(160),
        exceptionType: z.enum(exceptionTypes),
        startDate: isoDate,
        endDate: isoDate,
        targetDayOfWeek: z.enum(days).nullable().optional(),
    })
    .strict()
    .superRefine((value, context) => {
        if (value.startDate > value.endDate) {
            context.addIssue({
                code: "custom",
                path: ["endDate"],
                message: "End date must not be before start date",
            })
        }
        if (value.exceptionType === "FOLLOW_DAY") {
            if (value.startDate !== value.endDate) {
                context.addIssue({
                    code: "custom",
                    path: ["endDate"],
                    message: "A follow-day exception must apply to one date",
                })
            }
            if (!value.targetDayOfWeek) {
                context.addIssue({
                    code: "custom",
                    path: ["targetDayOfWeek"],
                    message: "A target weekday is required",
                })
            }
        } else if (value.targetDayOfWeek) {
            context.addIssue({
                code: "custom",
                path: ["targetDayOfWeek"],
                message: "A no-class exception cannot have a target weekday",
            })
        }
    })

export const createExceptionSchema = calendarExceptionFields
export const updateExceptionSchema = calendarExceptionFields

export const previewExceptionImpactSchema = z
    .object({
        operation: z.enum(["CREATE", "UPDATE", "DEACTIVATE"]),
        exceptionId: recordId.optional(),
        candidate: calendarExceptionFields.optional(),
    })
    .strict()
    .superRefine((value, context) => {
        if (value.operation === "CREATE" && !value.candidate) {
            context.addIssue({
                code: "custom",
                path: ["candidate"],
                message: "Candidate data is required",
            })
        }
        if (value.operation !== "CREATE" && !value.exceptionId) {
            context.addIssue({
                code: "custom",
                path: ["exceptionId"],
                message: "Exception ID is required",
            })
        }
        if (value.operation === "UPDATE" && !value.candidate) {
            context.addIssue({
                code: "custom",
                path: ["candidate"],
                message: "Candidate data is required",
            })
        }
        if (value.operation === "DEACTIVATE" && value.candidate) {
            context.addIssue({
                code: "custom",
                path: ["candidate"],
                message: "Candidate data is not allowed",
            })
        }
    })
