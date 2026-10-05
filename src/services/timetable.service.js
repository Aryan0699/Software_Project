import { createHash } from "node:crypto"
import ExcelJS from "exceljs"
import { prisma } from "../db/index.js"
import { env } from "../config/env.js"
import ApiError from "../utils/ApiError.js"
import { pagination, pageOffset } from "../utils/pagination.js"
import { effectiveAcademicDay, formatDateOnly } from "../utils/dateTime.js"
import { acquireOccupancyLock } from "./occupancy.service.js"

const TEMPLATE_HEADERS = [
    "Course Code*",
    "Course Name",
    "Slot*",
    "Classroom*",
    "Instructor",
    "Department",
    "Student Count",
    "Batch",
    "Remarks",
]

const logicalHeaders = new Map(
    TEMPLATE_HEADERS.map((header) => [
        header.replace(/\*$/, "").trim().toLowerCase(),
        header.replace(/\*$/, "").trim(),
    ])
)

function textValue(cell) {
    if (cell.value === null || cell.value === undefined) return ""
    return cell.text.trim()
}

function normalized(value) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
}

function rowSummarySelect() {
    return {
        id: true,
        rowIndex: true,
        rowHash: true,
        rawRow: true,
        auxiliaryData: true,
        rawCourseCode: true,
        rawSlot: true,
        rawClassroom: true,
        rawInstructor: true,
        initialClassification: true,
        adminDecision: true,
        isResolved: true,
        issues: true,
        resolutionNote: true,
        resolvedSlot: { select: { id: true, code: true, slotKind: true } },
        resolvedRoom: {
            select: {
                id: true,
                fullCode: true,
                displayName: true,
                building: { select: { code: true, name: true } },
            },
        },
        resolvedBy: { select: { id: true, name: true, email: true } },
        resolvedAt: true,
    }
}

const batchInclude = {
    academicTerm: {
        select: {
            id: true,
            termCode: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
        },
    },
    slotSystem: { select: { id: true, code: true, name: true } },
    slotGridVersion: {
        select: {
            id: true,
            versionNumber: true,
            status: true,
            slots: {
                orderBy: { code: "asc" },
                select: { id: true, code: true, slotKind: true },
            },
        },
    },
    createdBy: { select: { id: true, name: true, email: true } },
}

async function batchOrThrow(db, id) {
    const batch = await db.timetableImportBatch.findUnique({
        where: { id },
        include: batchInclude,
    })
    if (!batch) {
        throw new ApiError(404, "Timetable import was not found", {
            code: "TIMETABLE_IMPORT_NOT_FOUND",
        })
    }
    return batch
}

function requirePreview(batch) {
    if (batch.status !== "PREVIEWED") {
        throw new ApiError(409, "Only an active preview can be changed", {
            code: "TIMETABLE_IMPORT_READ_ONLY",
        })
    }
}

async function refreshCounts(db, batchId) {
    const [ready, attention, skipped] = await Promise.all([
        db.timetableImportRow.count({
            where: {
                batchId,
                isResolved: true,
                adminDecision: { not: "SKIP" },
            },
        }),
        db.timetableImportRow.count({ where: { batchId, isResolved: false } }),
        db.timetableImportRow.count({
            where: { batchId, adminDecision: "SKIP" },
        }),
    ])
    return db.timetableImportBatch.update({
        where: { id: batchId },
        data: { validRows: ready, errorRows: attention, skippedRows: skipped },
        include: batchInclude,
    })
}

export async function createTemplate() {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Timetable")
    sheet.addRow(TEMPLATE_HEADERS)
    sheet.views = [{ state: "frozen", ySplit: 1 }]
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
    sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF365A73" },
    }
    sheet.columns = [18, 34, 14, 20, 28, 18, 16, 16, 34].map((width) => ({
        width,
    }))
    sheet.autoFilter = { from: "A1", to: "I1" }
    return workbook.xlsx.writeBuffer()
}

export async function getImportOptions() {
    const [terms, systems, rooms] = await Promise.all([
        prisma.academicTerm.findMany({
            where: { status: { in: ["PLANNED", "CURRENT"] } },
            orderBy: [{ status: "asc" }, { startDate: "desc" }],
            select: { id: true, termCode: true, name: true, status: true },
        }),
        prisma.slotSystem.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                code: true,
                name: true,
                gridVersions: {
                    where: { status: "LOCKED" },
                    orderBy: { versionNumber: "desc" },
                    select: { id: true, versionNumber: true, lockedAt: true },
                },
            },
        }),
        prisma.room.findMany({
            where: { status: "ACTIVE", building: { isActive: true } },
            orderBy: { fullCode: "asc" },
            select: {
                id: true,
                fullCode: true,
                displayName: true,
                roomNumber: true,
                building: { select: { code: true, name: true } },
            },
        }),
    ])
    return { terms, systems, rooms }
}

function roomAliases(room) {
    return [
        room.fullCode,
        room.displayName,
        `${room.building.code} ${room.roomNumber}`,
        `${room.building.name} ${room.roomNumber}`,
    ]
        .filter(Boolean)
        .map(normalized)
}

export async function createImport(fields, file, userId) {
    if (!file) {
        throw new ApiError(400, "Choose an .xlsx workbook", {
            code: "WORKBOOK_REQUIRED",
        })
    }
    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
        throw new ApiError(400, "Only .xlsx workbooks are accepted", {
            code: "INVALID_WORKBOOK_TYPE",
        })
    }
    if (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) {
        throw new ApiError(
            400,
            "The uploaded file is not a valid .xlsx workbook",
            {
                code: "INVALID_WORKBOOK_SIGNATURE",
            }
        )
    }
    const [term, grid, rooms] = await Promise.all([
        prisma.academicTerm.findFirst({
            where: {
                id: fields.academicTermId,
                status: { in: ["PLANNED", "CURRENT"] },
            },
            select: { id: true },
        }),
        prisma.slotGridVersion.findFirst({
            where: {
                id: fields.slotGridVersionId,
                slotSystemId: fields.slotSystemId,
                status: "LOCKED",
                slotSystem: { isActive: true },
            },
            include: { slots: true },
        }),
        prisma.room.findMany({
            where: { status: "ACTIVE", building: { isActive: true } },
            select: {
                id: true,
                fullCode: true,
                displayName: true,
                roomNumber: true,
                building: { select: { code: true, name: true } },
            },
        }),
    ])
    if (!term)
        throw new ApiError(400, "Choose a current or planned academic term")
    if (!grid)
        throw new ApiError(400, "Choose a locked grid from this slot system")

    let workbook
    try {
        workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(file.buffer)
    } catch {
        throw new ApiError(400, "The workbook could not be read", {
            code: "INVALID_WORKBOOK",
        })
    }
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new ApiError(400, "The workbook has no worksheet")
    const headers = new Map()
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
        const source = textValue(cell)
        const key = source.replace(/\*$/, "").trim().toLowerCase()
        if (headers.has(key)) {
            throw new ApiError(400, `Header "${source}" appears more than once`)
        }
        headers.set(key, {
            column,
            source,
            logical: logicalHeaders.get(key) || source,
        })
    })
    for (const required of ["course code", "slot", "classroom"]) {
        if (!headers.has(required)) {
            throw new ApiError(
                400,
                `Required column "${required}" is missing`,
                {
                    code: "WORKBOOK_COLUMN_MISSING",
                }
            )
        }
    }

    const slotMap = new Map(
        grid.slots.map((slot) => [normalized(slot.code), slot])
    )
    const roomMap = new Map()
    for (const room of rooms) {
        for (const alias of roomAliases(room)) {
            const matches = roomMap.get(alias) || []
            if (!matches.some((match) => match.id === room.id)) {
                matches.push(room)
            }
            roomMap.set(alias, matches)
        }
    }
    const parsedRows = []
    const seen = new Set()
    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
        const row = sheet.getRow(rowIndex)
        const raw = {}
        for (const { column, logical } of headers.values()) {
            raw[logical] = textValue(row.getCell(column))
        }
        if (Object.values(raw).every((value) => !value)) continue
        if (parsedRows.length >= env.TIMETABLE_IMPORT_MAX_ROWS) {
            throw new ApiError(
                400,
                `A workbook may contain at most ${env.TIMETABLE_IMPORT_MAX_ROWS} rows`,
                {
                    code: "WORKBOOK_TOO_MANY_ROWS",
                }
            )
        }
        const course = raw["Course Code"] || ""
        const rawSlot = raw.Slot || ""
        const classroom = raw.Classroom || ""
        const courseKey = normalized(course)
        const slotKey = normalized(rawSlot)
        const roomKey = normalized(classroom)
        const duplicateKey = `${courseKey}|${slotKey}|${roomKey}`
        const rowHash = createHash("sha256").update(duplicateKey).digest("hex")
        const matchedSlot = slotMap.get(slotKey) || null
        const roomMatches = roomMap.get(roomKey) || []
        const matchedRoom = roomMatches.length === 1 ? roomMatches[0] : null
        const missing = [
            !course ? "Course Code" : null,
            !rawSlot ? "Slot" : null,
            !classroom ? "Classroom" : null,
        ].filter(Boolean)
        let classification = "READY"
        const issues = []
        if (missing.length) {
            classification = "MISSING_REQUIRED_FIELD"
            issues.push(`Missing ${missing.join(", ")}`)
        } else if (seen.has(duplicateKey)) {
            classification = "DUPLICATE_ROW"
            issues.push(
                "An earlier row has the same course, slot, and classroom"
            )
        } else if (!matchedSlot) {
            classification = "UNRESOLVED_SLOT"
            issues.push("Slot does not exist in the selected grid")
        } else if (!matchedRoom) {
            classification = "UNRESOLVED_ROOM"
            issues.push(
                roomMatches.length > 1
                    ? "Classroom matches more than one active room"
                    : "Classroom was not found"
            )
        }
        seen.add(duplicateKey)
        const known = new Set([
            "Course Code",
            "Course Name",
            "Slot",
            "Classroom",
            "Instructor",
        ])
        const auxiliaryData = Object.fromEntries(
            Object.entries(raw).filter(
                ([key, value]) => !known.has(key) && value
            )
        )
        parsedRows.push({
            rowIndex,
            rowHash,
            rawRow: raw,
            auxiliaryData,
            rawCourseCode: course || null,
            rawSlot: rawSlot || null,
            rawClassroom: classroom || null,
            rawInstructor: raw.Instructor || null,
            normalizedCourseCode: courseKey || null,
            normalizedSlot: slotKey || null,
            normalizedClassroom: roomKey || null,
            initialClassification: classification,
            isResolved: classification === "READY",
            issues,
            resolvedSlotId: matchedSlot?.id || null,
            resolvedRoomId: matchedRoom?.id || null,
            ...(classification === "READY"
                ? { resolvedAt: new Date(), resolvedByUserId: userId }
                : {}),
        })
    }
    if (!parsedRows.length)
        throw new ApiError(400, "The workbook contains no timetable rows")
    const fileHash = createHash("sha256").update(file.buffer).digest("hex")
    const duplicateImport = await prisma.timetableImportBatch.findFirst({
        where: {
            academicTermId: fields.academicTermId,
            slotSystemId: fields.slotSystemId,
            fileHash,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true },
    })
    const batch = await prisma.timetableImportBatch.create({
        data: {
            ...fields,
            fileName: file.originalname,
            fileHash,
            fileSizeBytes: file.size,
            mimeType: file.mimetype,
            totalRows: parsedRows.length,
            validRows: parsedRows.filter((row) => row.isResolved).length,
            errorRows: parsedRows.filter((row) => !row.isResolved).length,
            createdByUserId: userId,
            rows: { create: parsedRows },
        },
        include: batchInclude,
    })
    return { batch, duplicateImport }
}

export async function listImports() {
    return prisma.timetableImportBatch.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: batchInclude,
    })
}

export async function getImport(id) {
    return batchOrThrow(prisma, id)
}

export async function listImportRows(id, { view, issue, page, pageSize }) {
    const batch = await batchOrThrow(prisma, id)
    const conflictReview = await computeTimetableConflicts(prisma, id, {
        includeOperational: false,
    })
    const conflictPairs = conflictReview.internalConflicts
    const conflictsByRow = new Map()
    for (const conflict of conflictPairs) {
        const addConflict = (row, otherRow) => {
            const current = conflictsByRow.get(row.id) || []
            current.push({
                otherRow,
                occurrences: conflict.occurrences,
            })
            conflictsByRow.set(row.id, current)
        }
        addConflict(conflict.firstRow, conflict.secondRow)
        addConflict(conflict.secondRow, conflict.firstRow)
    }
    const publishedConflictsByRow = new Map()
    for (const conflict of conflictReview.publishedConflicts) {
        const current =
            publishedConflictsByRow.get(conflict.candidateRow.id) || []
        current.push(conflict)
        publishedConflictsByRow.set(conflict.candidateRow.id, current)
    }
    const conflictRowIds = [
        ...new Set([
            ...conflictsByRow.keys(),
            ...publishedConflictsByRow.keys(),
        ]),
    ]
    const issueConflictRowIds =
        issue === "INTERNAL"
            ? [...conflictsByRow.keys()]
            : issue === "PUBLISHED"
              ? [...publishedConflictsByRow.keys()]
              : conflictRowIds
    const where = {
        batchId: id,
        ...(view === "READY"
            ? {
                  isResolved: true,
                  adminDecision: { not: "SKIP" },
                  ...(conflictRowIds.length
                      ? { id: { notIn: conflictRowIds } }
                      : {}),
              }
            : {}),
        ...(view === "ATTENTION"
            ? issue === "ALL"
                ? {
                      OR: [
                          { isResolved: false },
                          ...(conflictRowIds.length
                              ? [{ id: { in: conflictRowIds } }]
                              : []),
                      ],
                  }
                : { id: { in: issueConflictRowIds } }
            : {}),
        ...(view === "SKIPPED" ? { adminDecision: "SKIP" } : {}),
    }
    const [records, total] = await prisma.$transaction([
        prisma.timetableImportRow.findMany({
            where,
            orderBy: { rowIndex: "asc" },
            skip: pageOffset(page, pageSize),
            take: pageSize,
            select: rowSummarySelect(),
        }),
        prisma.timetableImportRow.count({ where }),
    ])
    return {
        records: records.map((row) => ({
            ...row,
            allocationConflicts: conflictsByRow.get(row.id) || [],
            publishedConflicts: publishedConflictsByRow.get(row.id) || [],
        })),
        pagination: pagination(page, pageSize, total),
        summary: {
            ready: Math.max(0, batch.validRows - conflictRowIds.length),
            attention: batch.errorRows + conflictRowIds.length,
            skipped: batch.skippedRows,
            allocationConflicts: conflictPairs.length,
            publishedConflicts: conflictReview.publishedConflicts.length,
        },
    }
}

export async function resolveImportRow(batchId, rowId, input, userId) {
    return prisma.$transaction(
        async (tx) => {
            const batch = await batchOrThrow(tx, batchId)
            requirePreview(batch)
            const row = await tx.timetableImportRow.findFirst({
                where: { id: rowId, batchId },
            })
            if (!row) throw new ApiError(404, "Import row was not found")
            if (!row.rawCourseCode) {
                throw new ApiError(
                    409,
                    "A missing course code must be corrected in the workbook or skipped"
                )
            }
            const slotId = input.resolvedSlotId || row.resolvedSlotId
            const roomId = input.resolvedRoomId || row.resolvedRoomId
            if (!slotId || !roomId)
                throw new ApiError(400, "Choose both a slot and a classroom")
            const [slot, room] = await Promise.all([
                tx.slot.findFirst({
                    where: {
                        id: slotId,
                        slotGridVersionId: batch.slotGridVersionId,
                    },
                }),
                tx.room.findFirst({
                    where: {
                        id: roomId,
                        status: "ACTIVE",
                        building: { isActive: true },
                    },
                }),
            ])
            if (!slot)
                throw new ApiError(400, "Choose a slot from the selected grid")
            if (!room) throw new ApiError(400, "Choose an active classroom")
            await tx.timetableImportRow.update({
                where: { id: rowId },
                data: {
                    resolvedSlotId: slotId,
                    resolvedRoomId: roomId,
                    adminDecision: "RESOLVE",
                    isResolved: true,
                    resolvedByUserId: userId,
                    resolvedAt: new Date(),
                    resolutionNote: input.resolutionNote || null,
                },
            })
            const updatedBatch = await refreshCounts(tx, batchId)
            const review = await computeTimetableConflicts(tx, batchId, {
                focusRowId: rowId,
            })
            return {
                batch: updatedBatch,
                review: conflictResponse(review),
            }
        },
        { timeout: 30000 }
    )
}

export async function actOnImportRow(batchId, rowId, action, userId) {
    return prisma.$transaction(
        async (tx) => {
            const batch = await batchOrThrow(tx, batchId)
            requirePreview(batch)
            const row = await tx.timetableImportRow.findFirst({
                where: { id: rowId, batchId },
            })
            if (!row) throw new ApiError(404, "Import row was not found")
            if (action === "KEEP_DUPLICATE") {
                if (
                    row.initialClassification !== "DUPLICATE_ROW" ||
                    !row.rowHash
                ) {
                    throw new ApiError(
                        409,
                        "This row is not an exact duplicate"
                    )
                }
                if (
                    !row.rawCourseCode ||
                    !row.resolvedSlotId ||
                    !row.resolvedRoomId
                ) {
                    throw new ApiError(
                        409,
                        "Resolve the slot and classroom before keeping this row"
                    )
                }
                await tx.timetableImportRow.updateMany({
                    where: {
                        batchId,
                        rowHash: row.rowHash,
                        id: { not: row.id },
                    },
                    data: {
                        adminDecision: "SKIP",
                        isResolved: true,
                        resolvedByUserId: userId,
                        resolvedAt: new Date(),
                        resolutionNote:
                            "Skipped because another duplicate row was kept",
                    },
                })
                await tx.timetableImportRow.update({
                    where: { id: row.id },
                    data: {
                        adminDecision: "RESOLVE",
                        isResolved: true,
                        resolvedByUserId: userId,
                        resolvedAt: new Date(),
                        resolutionNote: "Kept as the accepted duplicate row",
                    },
                })
            } else if (action === "KEEP_ALLOCATION") {
                if (
                    !row.isResolved ||
                    row.adminDecision === "SKIP" ||
                    !row.resolvedSlotId ||
                    !row.resolvedRoomId
                ) {
                    throw new ApiError(
                        409,
                        "Resolve this row before keeping its allocation"
                    )
                }
                const conflicts = internalConflicts(
                    await candidateSchedule(tx, batchId)
                )
                const conflictingRowIds = [
                    ...new Set(
                        conflicts.flatMap(({ left, right }) => {
                            if (left.rowId === row.id) return [right.rowId]
                            if (right.rowId === row.id) return [left.rowId]
                            return []
                        })
                    ),
                ]
                if (!conflictingRowIds.length) {
                    throw new ApiError(
                        409,
                        "This allocation no longer conflicts with another row"
                    )
                }
                await tx.timetableImportRow.updateMany({
                    where: { id: { in: conflictingRowIds }, batchId },
                    data: {
                        adminDecision: "SKIP",
                        isResolved: true,
                        resolvedByUserId: userId,
                        resolvedAt: new Date(),
                        resolutionNote: `Skipped because row ${row.rowIndex} was kept for the overlapping room and time`,
                    },
                })
                await tx.timetableImportRow.update({
                    where: { id: row.id },
                    data: {
                        adminDecision: "RESOLVE",
                        resolvedByUserId: userId,
                        resolvedAt: new Date(),
                        resolutionNote:
                            "Kept as the accepted allocation for the overlapping room and time",
                    },
                })
            } else {
                await tx.timetableImportRow.update({
                    where: { id: row.id },
                    data: {
                        adminDecision: "SKIP",
                        isResolved: true,
                        resolvedByUserId: userId,
                        resolvedAt: new Date(),
                    },
                })
            }
            const updatedBatch = await refreshCounts(tx, batchId)
            const review = await computeTimetableConflicts(tx, batchId, {
                focusRowId: rowId,
            })
            return {
                batch: updatedBatch,
                review: conflictResponse(review),
            }
        },
        { timeout: 30000 }
    )
}

export async function cancelImport(id) {
    const batch = await batchOrThrow(prisma, id)
    requirePreview(batch)
    return prisma.timetableImportBatch.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
        include: batchInclude,
    })
}

async function candidateSchedule(db, batchId) {
    const rows = await db.timetableImportRow.findMany({
        where: {
            batchId,
            isResolved: true,
            adminDecision: { not: "SKIP" },
        },
        include: {
            resolvedSlot: { include: { occurrences: true } },
            resolvedRoom: { select: { id: true, fullCode: true } },
        },
        orderBy: { rowIndex: "asc" },
    })
    return rows.flatMap((row) =>
        row.resolvedSlot.occurrences.map((occurrence) => ({
            rowId: row.id,
            rowIndex: row.rowIndex,
            courseCode: row.rawCourseCode,
            courseName: row.rawRow?.["Course Name"] || null,
            slotId: row.resolvedSlotId,
            slotCode: row.resolvedSlot.code,
            roomId: row.resolvedRoomId,
            roomCode: row.resolvedRoom.fullCode,
            occurrenceId: occurrence.id,
            dayOfWeek: occurrence.dayOfWeek,
            startMinute: occurrence.startMinute,
            endMinute: occurrence.endMinute,
        }))
    )
}

function internalConflicts(schedule, focusRowId = null) {
    const conflicts = []
    const groups = new Map()
    for (const item of schedule) {
        const key = `${item.roomId}|${item.dayOfWeek}`
        const group = groups.get(key) || []
        group.push(item)
        groups.set(key, group)
    }
    for (const group of groups.values()) {
        group.sort(
            (left, right) =>
                left.startMinute - right.startMinute ||
                left.endMinute - right.endMinute ||
                left.rowIndex - right.rowIndex
        )
        for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
            const left = group[leftIndex]
            for (
                let rightIndex = leftIndex + 1;
                rightIndex < group.length;
                rightIndex += 1
            ) {
                const right = group[rightIndex]
                if (right.startMinute >= left.endMinute) break
                if (
                    left.rowId !== right.rowId &&
                    (!focusRowId ||
                        left.rowId === focusRowId ||
                        right.rowId === focusRowId)
                ) {
                    conflicts.push({ left, right })
                }
            }
        }
    }
    return conflicts
}

function summarizeInternalConflicts(conflicts) {
    const pairs = new Map()
    for (const { left, right } of conflicts) {
        const ordered =
            left.rowIndex < right.rowIndex ||
            (left.rowIndex === right.rowIndex && left.rowId < right.rowId)
                ? [left, right]
                : [right, left]
        const [first, second] = ordered
        const key = `${first.rowId}|${second.rowId}`
        const summary = pairs.get(key) || {
            firstRow: {
                id: first.rowId,
                rowIndex: first.rowIndex,
                courseCode: first.courseCode,
                courseName: first.courseName,
                slotCode: first.slotCode,
                roomCode: first.roomCode,
            },
            secondRow: {
                id: second.rowId,
                rowIndex: second.rowIndex,
                courseCode: second.courseCode,
                courseName: second.courseName,
                slotCode: second.slotCode,
                roomCode: second.roomCode,
            },
            occurrences: [],
        }
        const occurrence = {
            dayOfWeek: left.dayOfWeek,
            startMinute: Math.max(left.startMinute, right.startMinute),
            endMinute: Math.min(left.endMinute, right.endMinute),
        }
        if (
            !summary.occurrences.some(
                (item) =>
                    item.dayOfWeek === occurrence.dayOfWeek &&
                    item.startMinute === occurrence.startMinute &&
                    item.endMinute === occurrence.endMinute
            )
        ) {
            summary.occurrences.push(occurrence)
        }
        pairs.set(key, summary)
    }
    return [...pairs.values()]
}

function summarizePublishedConflicts(candidateSchedule, occupancies) {
    const occupancyByRoomDay = new Map()
    for (const occupancy of occupancies) {
        const key = `${occupancy.roomId}|${occupancy.dayOfWeek}`
        const group = occupancyByRoomDay.get(key) || []
        group.push(occupancy)
        occupancyByRoomDay.set(key, group)
    }

    const summaries = new Map()
    for (const candidate of candidateSchedule) {
        const matches =
            occupancyByRoomDay.get(
                `${candidate.roomId}|${candidate.dayOfWeek}`
            ) || []
        for (const published of matches) {
            if (
                candidate.startMinute >= published.endMinute ||
                candidate.endMinute <= published.startMinute
            ) {
                continue
            }
            const key = `${candidate.rowId}|${published.courseSlotAssignment.id}|${published.roomId}`
            const summary = summaries.get(key) || {
                candidateRow: {
                    id: candidate.rowId,
                    rowIndex: candidate.rowIndex,
                    courseCode: candidate.courseCode,
                    courseName: candidate.courseName,
                    slotCode: candidate.slotCode,
                    roomCode: candidate.roomCode,
                },
                publishedTimetable: {
                    batchId: published.timetableBatch.id,
                    slotSystemName: published.timetableBatch.slotSystem.name,
                    revisionNumber: published.timetableBatch.revisionNumber,
                },
                publishedCourse: {
                    code:
                        published.courseSlotAssignment.course.code ||
                        published.courseSlotAssignment.rawCourseCode,
                    name: published.courseSlotAssignment.course.name,
                },
                roomCode: candidate.roomCode,
                occurrences: [],
            }
            const occurrence = {
                dayOfWeek: candidate.dayOfWeek,
                startMinute: Math.max(
                    candidate.startMinute,
                    published.startMinute
                ),
                endMinute: Math.min(candidate.endMinute, published.endMinute),
            }
            if (
                !summary.occurrences.some(
                    (item) =>
                        item.dayOfWeek === occurrence.dayOfWeek &&
                        item.startMinute === occurrence.startMinute &&
                        item.endMinute === occurrence.endMinute
                )
            ) {
                summary.occurrences.push(occurrence)
            }
            summaries.set(key, summary)
        }
    }
    return [...summaries.values()]
}

async function findPublishedConflicts(db, batch, schedule) {
    if (!schedule.length) return []
    const occupancies = await db.roomSlotOccupancy.findMany({
        where: {
            academicTermId: batch.academicTermId,
            roomId: { in: [...new Set(schedule.map((item) => item.roomId))] },
            dayOfWeek: {
                in: [...new Set(schedule.map((item) => item.dayOfWeek))],
            },
            timetableBatch: {
                status: "PUBLISHED",
                slotSystemId: { not: batch.slotSystemId },
            },
        },
        select: {
            roomId: true,
            dayOfWeek: true,
            startMinute: true,
            endMinute: true,
            timetableBatch: {
                select: {
                    id: true,
                    revisionNumber: true,
                    slotSystem: { select: { name: true } },
                },
            },
            courseSlotAssignment: {
                select: {
                    id: true,
                    rawCourseCode: true,
                    course: { select: { code: true, name: true } },
                },
            },
        },
    })
    return summarizePublishedConflicts(schedule, occupancies)
}

function matchScheduleForDate(schedule, item, date, exceptions) {
    const effectiveDay = effectiveAcademicDay(date, exceptions)
    if (!effectiveDay) return []
    return schedule.filter(
        (entry) =>
            entry.roomId === item.roomId &&
            entry.dayOfWeek === effectiveDay &&
            entry.startMinute < item.endMinute &&
            entry.endMinute > item.startMinute
    )
}

async function computeTimetableConflicts(
    db,
    batchId,
    { focusRowId = null, includeOperational = true } = {}
) {
    const batch = await batchOrThrow(db, batchId)
    const schedule = await candidateSchedule(db, batchId)
    const focusedSchedule = focusRowId
        ? schedule.filter((item) => item.rowId === focusRowId)
        : schedule
    const internal = summarizeInternalConflicts(
        internalConflicts(schedule, focusRowId)
    )
    const operationalQueries = includeOperational
        ? [
              db.calendarException.findMany({
                  where: {
                      academicTermId: batch.academicTermId,
                      isActive: true,
                  },
                  orderBy: [{ startDate: "asc" }, { id: "asc" }],
                  select: {
                      startDate: true,
                      endDate: true,
                      exceptionType: true,
                      targetDayOfWeek: true,
                  },
              }),
              db.bookingRequest.findMany({
                  where: {
                      status: "APPROVED",
                      roomId: {
                          in: [
                              ...new Set(
                                  focusedSchedule.map((item) => item.roomId)
                              ),
                          ],
                      },
                      bookingDate: {
                          gte: batch.academicTerm.startDate,
                          lte: batch.academicTerm.endDate,
                      },
                  },
                  select: {
                      id: true,
                      title: true,
                      bookingDate: true,
                      roomId: true,
                      startMinute: true,
                      endMinute: true,
                      requester: { select: { id: true, name: true } },
                      room: { select: { fullCode: true } },
                  },
              }),
              db.roomRestriction.findMany({
                  where: {
                      status: "ACTIVE",
                      roomId: {
                          in: [
                              ...new Set(
                                  focusedSchedule.map((item) => item.roomId)
                              ),
                          ],
                      },
                      restrictionDate: {
                          gte: batch.academicTerm.startDate,
                          lte: batch.academicTerm.endDate,
                      },
                  },
                  select: {
                      id: true,
                      reason: true,
                      restrictionDate: true,
                      roomId: true,
                      startMinute: true,
                      endMinute: true,
                      room: { select: { fullCode: true } },
                  },
              }),
          ]
        : [Promise.resolve([]), Promise.resolve([]), Promise.resolve([])]
    const [publishedConflicts, [exceptions, bookings, restrictions]] =
        await Promise.all([
            findPublishedConflicts(db, batch, focusedSchedule),
            Promise.all(operationalQueries),
        ])
    const bookingConflicts = bookings.flatMap((booking) => {
        const matches = matchScheduleForDate(
            focusedSchedule,
            booking,
            booking.bookingDate,
            exceptions
        )
        return matches.length
            ? [
                  {
                      id: booking.id,
                      title: booking.title,
                      date: formatDateOnly(booking.bookingDate),
                      roomCode: booking.room.fullCode,
                      startMinute: booking.startMinute,
                      endMinute: booking.endMinute,
                      requester: {
                          id: booking.requester.id,
                          displayName: booking.requester.name,
                      },
                      courses: [
                          ...new Set(matches.map((item) => item.courseCode)),
                      ],
                  },
              ]
            : []
    })
    const restrictionConflicts = restrictions.flatMap((restriction) => {
        const matches = matchScheduleForDate(
            focusedSchedule,
            restriction,
            restriction.restrictionDate,
            exceptions
        )
        return matches.length
            ? [
                  {
                      id: restriction.id,
                      reason: restriction.reason,
                      date: formatDateOnly(restriction.restrictionDate),
                      roomCode: restriction.room.fullCode,
                      startMinute: restriction.startMinute,
                      endMinute: restriction.endMinute,
                  },
              ]
            : []
    })
    return {
        batch,
        schedule,
        internalConflicts: internal,
        publishedConflicts,
        bookingConflicts,
        restrictionConflicts,
        canPublish:
            !internal.length &&
            !publishedConflicts.length &&
            !bookingConflicts.length &&
            !restrictionConflicts.length,
    }
}

function conflictResponse(review) {
    return {
        internalConflicts: review.internalConflicts,
        publishedConflicts: review.publishedConflicts,
        bookingConflicts: review.bookingConflicts,
        restrictionConflicts: review.restrictionConflicts,
        hasConflicts: !review.canPublish,
    }
}

async function publicationPreview(db, batchId) {
    const batch = await batchOrThrow(db, batchId)
    requirePreview(batch)
    if (batch.errorRows > 0) {
        throw new ApiError(409, "Resolve or skip every row before publishing", {
            code: "IMPORT_ROWS_UNRESOLVED",
        })
    }
    const [review, currentPublication] = await Promise.all([
        computeTimetableConflicts(db, batchId),
        db.timetableImportBatch.findFirst({
            where: {
                academicTermId: batch.academicTermId,
                slotSystemId: batch.slotSystemId,
                status: "PUBLISHED",
            },
            select: {
                id: true,
                revisionNumber: true,
                publishedAt: true,
                fileName: true,
            },
        }),
    ])
    return { ...review, currentPublication }
}

export async function previewPublication(id) {
    const { schedule, ...preview } = await publicationPreview(prisma, id)
    return { ...preview, allocationOccurrences: schedule.length }
}

export async function getPublicationImpact(id) {
    const review = await computeTimetableConflicts(prisma, id)
    requirePreview(review.batch)
    return {
        publishedConflicts: review.publishedConflicts,
        bookingConflicts: review.bookingConflicts,
        restrictionConflicts: review.restrictionConflicts,
        hasImpact: Boolean(
            review.publishedConflicts.length ||
            review.bookingConflicts.length ||
            review.restrictionConflicts.length
        ),
    }
}

function parsedStudentCount(rawRow) {
    const value = Number(rawRow?.["Student Count"])
    return Number.isInteger(value) && value >= 0 ? value : null
}

export async function publishImport(id, userId) {
    return prisma.$transaction(
        async (tx) => {
            await acquireOccupancyLock(tx)
            const preview = await publicationPreview(tx, id)
            if (!preview.canPublish) {
                throw new ApiError(
                    409,
                    "Timetable conflicts changed. Review the latest publication preview.",
                    {
                        code: "TIMETABLE_PUBLICATION_CONFLICT",
                        details: {
                            conflicts: {
                                internal: preview.internalConflicts,
                                publishedTimetable: preview.publishedConflicts,
                                approvedBookings: preview.bookingConflicts,
                                roomRestrictions: preview.restrictionConflicts,
                            },
                        },
                    }
                )
            }
            const rows = await tx.timetableImportRow.findMany({
                where: {
                    batchId: id,
                    isResolved: true,
                    adminDecision: { not: "SKIP" },
                },
                orderBy: { rowIndex: "asc" },
            })
            const revision = await tx.timetableImportBatch.aggregate({
                where: {
                    academicTermId: preview.batch.academicTermId,
                    slotSystemId: preview.batch.slotSystemId,
                    revisionNumber: { not: null },
                },
                _max: { revisionNumber: true },
            })
            if (preview.currentPublication) {
                await tx.roomSlotOccupancy.deleteMany({
                    where: { timetableBatchId: preview.currentPublication.id },
                })
            }
            const groups = new Map()
            for (const row of rows) {
                const key = `${row.normalizedCourseCode}|${row.resolvedSlotId}`
                const group = groups.get(key) || []
                group.push(row)
                groups.set(key, group)
            }
            for (const groupRows of groups.values()) {
                const first = groupRows[0]
                const courseName = first.rawRow?.["Course Name"] || null
                const course = await tx.course.upsert({
                    where: { code: first.normalizedCourseCode },
                    update: { isActive: true },
                    create: {
                        code: first.normalizedCourseCode,
                        name: courseName || null,
                    },
                })
                const roomIds = [
                    ...new Set(groupRows.map((row) => row.resolvedRoomId)),
                ]
                const assignment = await tx.courseSlotAssignment.create({
                    data: {
                        timetableBatchId: id,
                        courseId: course.id,
                        slotId: first.resolvedSlotId,
                        rawCourseCode: first.rawCourseCode,
                        rawSlotCode: first.rawSlot,
                        rawInstructor: first.rawInstructor,
                        registeredCount: parsedStudentCount(first.rawRow),
                        auxiliaryData: first.auxiliaryData,
                        roomAllocations: {
                            create: roomIds.map((roomId) => ({ roomId })),
                        },
                    },
                })
                await tx.timetableImportRow.updateMany({
                    where: { id: { in: groupRows.map((row) => row.id) } },
                    data: { publishedAssignmentId: assignment.id },
                })
            }
            if (preview.currentPublication) {
                await tx.timetableImportBatch.update({
                    where: { id: preview.currentPublication.id },
                    data: {
                        status: "SUPERSEDED",
                        supersededAt: new Date(),
                        supersededById: id,
                    },
                })
            }
            const published = await tx.timetableImportBatch.update({
                where: { id },
                data: {
                    status: "PUBLISHED",
                    revisionNumber: (revision._max.revisionNumber || 0) + 1,
                    publishedByUserId: userId,
                    publishedAt: new Date(),
                },
                include: batchInclude,
            })
            const assignments = await tx.courseSlotAssignment.findMany({
                where: { timetableBatchId: id },
                include: {
                    slot: { include: { occurrences: true } },
                    roomAllocations: true,
                },
            })
            const occupancyRows = assignments.flatMap((assignment) =>
                assignment.roomAllocations.flatMap((allocation) =>
                    assignment.slot.occurrences.map((occurrence) => ({
                        academicTermId: preview.batch.academicTermId,
                        timetableBatchId: id,
                        courseSlotAssignmentId: assignment.id,
                        roomId: allocation.roomId,
                        slotOccurrenceId: occurrence.id,
                        dayOfWeek: occurrence.dayOfWeek,
                        startMinute: occurrence.startMinute,
                        endMinute: occurrence.endMinute,
                    }))
                )
            )
            if (occupancyRows.length) {
                await tx.roomSlotOccupancy.createMany({ data: occupancyRows })
            }
            return published
        },
        { timeout: 30000 }
    )
}
