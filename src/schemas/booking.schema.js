import { z } from "zod"

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

const paginationFields = {
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
}

export const bookingRequestParamsSchema = z.object({ id: recordId }).strict()

export const facultyVerifierQuerySchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(1000).default(250),
        search: z.string().trim().max(100).optional(),
    })
    .strict()

export const listBookingRequestsQuerySchema = z
    .object({
        ...paginationFields,
        status: z
            .enum([
                "PENDING_FACULTY",
                "PENDING_INSTITUTIONAL",
                "APPROVED",
                "REJECTED",
                "CANCELLED",
            ])
            .optional(),
        search: z.string().trim().max(100).optional(),
        dateFrom: isoDate.optional(),
        dateTo: isoDate.optional(),
        buildingId: recordId.optional(),
        roomId: recordId.optional(),
        requester: z.string().trim().max(100).optional(),
    })
    .strict()
    .refine(
        (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
        { path: ["dateTo"], message: "End date must be on or after start date" }
    )

export const cancelBookingRequestSchema = z
    .object({ reason: z.string().trim().min(3).max(1000) })
    .strict()

export const createBookingRequestSchema = z
    .object({
        clientRequestId: z.string().uuid(),
        roomId: recordId,
        bookingDate: isoDate,
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
        title: z.string().trim().min(3).max(160),
        purpose: z.string().trim().min(10).max(3000),
        eventType: z.enum([
            "ACADEMIC",
            "CLUB",
            "MEETING",
            "WORKSHOP",
            "SEMINAR",
            "OTHER",
        ]),
        expectedParticipants: z.number().int().min(1).max(100000).optional(),
        requiredFeatures: z
            .array(z.string().trim().min(1).max(80))
            .max(20)
            .default([])
            .transform((items) => [...new Set(items)]),
        specialRequirements: z.string().trim().max(2000).optional(),
        facultyVerifierUserId: recordId.optional(),
        acknowledgePendingCompetition: z.boolean().default(false),
    })
    .strict()
    .refine((value) => value.startMinute < value.endMinute, {
        path: ["endMinute"],
        message: "End time must be after start time",
    })

export const approvalParamsSchema = z.object({ approvalId: recordId }).strict()

export const listApprovalsQuerySchema = z
    .object({
        ...paginationFields,
        view: z.enum(["pending", "completed"]).default("pending"),
        search: z.string().trim().max(100).optional(),
    })
    .strict()

export const approvalDecisionSchema = z
    .object({
        decision: z.enum(["APPROVE", "REJECT"]),
        note: z.string().trim().max(2000).optional(),
        expectedRequestVersion: z.number().int().min(1),
        expectedCompetitorIds: z.array(recordId).max(100).optional(),
        sharedConflictNote: z.string().trim().max(1000).optional(),
    })
    .strict()
    .superRefine((value, context) => {
        if (value.decision === "REJECT" && !value.note) {
            context.addIssue({
                code: "custom",
                path: ["note"],
                message: "A rejection reason is required",
            })
        }
    })
