import { z } from "zod";

export const cuidSchema = z.string().cuid();

export const minuteSchema = z.number().int().min(0).max(1439);

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");

export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
}).partial();

export const idParamSchema = z.object({
    id: cuidSchema,
});

export const bookingIdParamSchema = z.object({
    bookingId: cuidSchema,
});
