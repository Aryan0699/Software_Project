import { z } from "zod"

const id = z.string().trim().min(1).max(64)

export const importParamsSchema = z.object({ id }).strict()
export const rowParamsSchema = z.object({ id, rowId: id }).strict()

export const uploadFieldsSchema = z
    .object({
        academicTermId: id,
        slotSystemId: id,
        slotGridVersionId: id,
    })
    .strict()

export const listRowsQuerySchema = z
    .object({
        view: z.enum(["ALL", "READY", "ATTENTION", "SKIPPED"]).default("ALL"),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
    })
    .strict()

export const resolveRowSchema = z
    .object({
        resolvedSlotId: id.optional(),
        resolvedRoomId: id.optional(),
        resolutionNote: z.string().trim().max(500).nullable().optional(),
    })
    .strict()

export const rowActionSchema = z
    .object({
        action: z.enum(["SKIP", "KEEP_DUPLICATE", "KEEP_ALLOCATION"]),
    })
    .strict()
