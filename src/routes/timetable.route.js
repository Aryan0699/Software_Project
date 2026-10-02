import { Router } from "express"
import multer from "multer"
import { env } from "../config/env.js"
import {
    actOnImportRow,
    cancelImport,
    createImport,
    downloadTemplate,
    getImport,
    getImportOptions,
    listImportRows,
    listImports,
    previewPublication,
    publishImport,
    resolveImportRow,
} from "../controllers/timetable.controller.js"
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js"
import { requireTrustedOrigin } from "../middlewares/security.middleware.js"
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middlewares/validate.middleware.js"
import {
    importParamsSchema,
    listRowsQuerySchema,
    resolveRowSchema,
    rowActionSchema,
    rowParamsSchema,
    uploadFieldsSchema,
} from "../schemas/timetable.schema.js"

const timetableRouter = Router()
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: env.TIMETABLE_IMPORT_MAX_BYTES, fields: 10 },
})

timetableRouter.use(requireAuth, requireTrustedOrigin, requireRole("ADMIN"))
timetableRouter.get("/template", downloadTemplate)
timetableRouter.get("/options", getImportOptions)
timetableRouter.get("/imports", listImports)
timetableRouter.post(
    "/imports",
    upload.single("workbook"),
    validateBody(uploadFieldsSchema),
    createImport
)
timetableRouter.get(
    "/imports/:id",
    validateParams(importParamsSchema),
    getImport
)
timetableRouter.get(
    "/imports/:id/rows",
    validateParams(importParamsSchema),
    validateQuery(listRowsQuerySchema),
    listImportRows
)
timetableRouter.patch(
    "/imports/:id/rows/:rowId",
    validateParams(rowParamsSchema),
    validateBody(resolveRowSchema),
    resolveImportRow
)
timetableRouter.post(
    "/imports/:id/rows/:rowId/action",
    validateParams(rowParamsSchema),
    validateBody(rowActionSchema),
    actOnImportRow
)
timetableRouter.post(
    "/imports/:id/cancel",
    validateParams(importParamsSchema),
    cancelImport
)
timetableRouter.get(
    "/imports/:id/publication-preview",
    validateParams(importParamsSchema),
    previewPublication
)
timetableRouter.post(
    "/imports/:id/publish",
    validateParams(importParamsSchema),
    publishImport
)

export default timetableRouter
