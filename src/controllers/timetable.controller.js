import {
    actOnImportRow as actOnImportRowService,
    cancelImport as cancelImportService,
    createImport as createImportService,
    createTemplate,
    getImport as getImportService,
    getImportOptions as getImportOptionsService,
    listImportRows as listImportRowsService,
    listImports as listImportsService,
    previewPublication as previewPublicationService,
    publishImport as publishImportService,
    resolveImportRow as resolveImportRowService,
} from "../services/timetable.service.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

export const downloadTemplate = asyncHandler(async (_req, res) => {
    const buffer = Buffer.from(await createTemplate())
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader(
        "Content-Disposition",
        'attachment; filename="URAS_Timetable_Template.xlsx"'
    )
    res.send(buffer)
})

export const getImportOptions = asyncHandler(async (_req, res) => {
    res.json(
        new ApiResponse(
            200,
            "Timetable import options",
            await getImportOptionsService()
        )
    )
})

export const createImport = asyncHandler(async (req, res) => {
    const result = await createImportService(
        req.validatedBody,
        req.file,
        req.user.id
    )
    res.status(201).json(new ApiResponse(201, "Workbook parsed", result))
})

export const listImports = asyncHandler(async (_req, res) => {
    res.json(
        new ApiResponse(200, "Timetable imports", {
            imports: await listImportsService(),
        })
    )
})

export const getImport = asyncHandler(async (req, res) => {
    res.json(
        new ApiResponse(200, "Timetable import", {
            batch: await getImportService(req.validatedParams.id),
        })
    )
})

export const listImportRows = asyncHandler(async (req, res) => {
    res.json(
        new ApiResponse(
            200,
            "Timetable rows",
            await listImportRowsService(
                req.validatedParams.id,
                req.validatedQuery
            )
        )
    )
})

export const resolveImportRow = asyncHandler(async (req, res) => {
    const batch = await resolveImportRowService(
        req.validatedParams.id,
        req.validatedParams.rowId,
        req.validatedBody,
        req.user.id
    )
    res.json(new ApiResponse(200, "Import row resolved", { batch }))
})

export const actOnImportRow = asyncHandler(async (req, res) => {
    const batch = await actOnImportRowService(
        req.validatedParams.id,
        req.validatedParams.rowId,
        req.validatedBody.action,
        req.user.id
    )
    res.json(new ApiResponse(200, "Import row updated", { batch }))
})

export const cancelImport = asyncHandler(async (req, res) => {
    const batch = await cancelImportService(req.validatedParams.id)
    res.json(new ApiResponse(200, "Import cancelled", { batch }))
})

export const previewPublication = asyncHandler(async (req, res) => {
    res.json(
        new ApiResponse(
            200,
            "Timetable publication preview",
            await previewPublicationService(req.validatedParams.id)
        )
    )
})

export const publishImport = asyncHandler(async (req, res) => {
    const batch = await publishImportService(
        req.validatedParams.id,
        req.user.id
    )
    res.json(new ApiResponse(200, "Timetable published", { batch }))
})
