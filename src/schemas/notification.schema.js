import { z } from "zod"

const recordId = z.string().trim().min(1).max(64)

export const notificationParamsSchema = z.object({ id: recordId }).strict()

export const listNotificationsQuerySchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
        view: z.enum(["all", "unread"]).default("all"),
    })
    .strict()
