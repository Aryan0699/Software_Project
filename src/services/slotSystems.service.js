import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"

const gridInclude = {
    slotSystem: {
        select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
        },
    },
    basedOn: { select: { id: true, versionNumber: true, status: true } },
    slots: {
        orderBy: [{ code: "asc" }],
        include: {
            occurrences: {
                orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
            },
        },
    },
    imports: {
        where: { status: "PUBLISHED" },
        select: {
            id: true,
            revisionNumber: true,
            academicTerm: { select: { id: true, termCode: true, name: true } },
        },
    },
}

function overlapWarnings(slots) {
    const occurrences = slots.flatMap((slot) =>
        slot.occurrences.map((occurrence) => ({
            ...occurrence,
            slotId: slot.id,
            slotCode: slot.code,
        }))
    )
    const warnings = []
    for (let index = 0; index < occurrences.length; index += 1) {
        for (let other = index + 1; other < occurrences.length; other += 1) {
            const left = occurrences[index]
            const right = occurrences[other]
            if (
                left.dayOfWeek === right.dayOfWeek &&
                left.startMinute < right.endMinute &&
                left.endMinute > right.startMinute
            ) {
                warnings.push({
                    dayOfWeek: left.dayOfWeek,
                    first: {
                        slotId: left.slotId,
                        slotCode: left.slotCode,
                        startMinute: left.startMinute,
                        endMinute: left.endMinute,
                    },
                    second: {
                        slotId: right.slotId,
                        slotCode: right.slotCode,
                        startMinute: right.startMinute,
                        endMinute: right.endMinute,
                    },
                })
            }
        }
    }
    return warnings
}

function presentGrid(grid) {
    const { imports, ...rest } = grid
    return {
        ...rest,
        isPublished: imports.length > 0,
        publications: imports,
        overlapWarnings: overlapWarnings(grid.slots),
    }
}

async function gridOrThrow(db, id) {
    const grid = await db.slotGridVersion.findUnique({
        where: { id },
        include: gridInclude,
    })
    if (!grid) {
        throw new ApiError(404, "Slot grid version was not found", {
            code: "SLOT_GRID_NOT_FOUND",
        })
    }
    return grid
}

function requireDraft(grid) {
    if (grid.status !== "DRAFT") {
        throw new ApiError(409, "Only a draft grid can be changed", {
            code: "SLOT_GRID_READ_ONLY",
        })
    }
}

export async function listSlotSystems() {
    const systems = await prisma.slotSystem.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: {
            gridVersions: {
                orderBy: { versionNumber: "desc" },
                select: {
                    id: true,
                    versionNumber: true,
                    status: true,
                    dayStartMinute: true,
                    dayEndMinute: true,
                    createdAt: true,
                    lockedAt: true,
                    basedOnVersionId: true,
                    _count: { select: { slots: true } },
                    imports: {
                        where: { status: "PUBLISHED" },
                        select: { id: true },
                    },
                },
            },
        },
    })
    return systems.map((system) => ({
        ...system,
        gridVersions: system.gridVersions.map(({ imports, ...grid }) => ({
            ...grid,
            isPublished: imports.length > 0,
        })),
    }))
}

export function createSlotSystem(data) {
    return prisma.slotSystem.create({ data })
}

export async function updateSlotSystem(id, data) {
    if (data.isActive === false) {
        const blockers = await prisma.slotSystem.findUnique({
            where: { id },
            select: {
                _count: {
                    select: {
                        gridVersions: { where: { status: "DRAFT" } },
                        imports: { where: { status: "PUBLISHED" } },
                    },
                },
            },
        })
        if (!blockers) {
            throw new ApiError(404, "Slot system was not found", {
                code: "SLOT_SYSTEM_NOT_FOUND",
            })
        }
        if (blockers._count.gridVersions || blockers._count.imports) {
            throw new ApiError(
                409,
                "Discard its draft and replace any published timetable before deactivating this slot system",
                { code: "SLOT_SYSTEM_IN_USE" }
            )
        }
    }
    return prisma.slotSystem.update({ where: { id }, data })
}

export async function getGrid(id) {
    return presentGrid(await gridOrThrow(prisma, id))
}

export async function createDraft(slotSystemId, input, userId) {
    return prisma.$transaction(async (tx) => {
        const system = await tx.slotSystem.findUnique({
            where: { id: slotSystemId },
            select: { id: true, isActive: true },
        })
        if (!system) {
            throw new ApiError(404, "Slot system was not found", {
                code: "SLOT_SYSTEM_NOT_FOUND",
            })
        }
        if (!system.isActive) {
            throw new ApiError(
                409,
                "Activate the slot system before creating a grid",
                {
                    code: "SLOT_SYSTEM_INACTIVE",
                }
            )
        }
        const existingDraft = await tx.slotGridVersion.findFirst({
            where: { slotSystemId, status: "DRAFT" },
            select: { id: true, versionNumber: true },
        })
        if (existingDraft) {
            throw new ApiError(409, "This slot system already has a draft", {
                code: "SLOT_GRID_DRAFT_EXISTS",
                details: existingDraft,
            })
        }
        const latest = await tx.slotGridVersion.aggregate({
            where: { slotSystemId },
            _max: { versionNumber: true },
        })
        let source = null
        if (input.sourceGridVersionId) {
            source = await tx.slotGridVersion.findFirst({
                where: {
                    id: input.sourceGridVersionId,
                    slotSystemId,
                    status: "LOCKED",
                },
                include: { slots: { include: { occurrences: true } } },
            })
            if (!source) {
                throw new ApiError(
                    400,
                    "Only a locked grid from this system can be cloned",
                    {
                        code: "INVALID_CLONE_SOURCE",
                    }
                )
            }
        }
        const grid = await tx.slotGridVersion.create({
            data: {
                slotSystemId,
                versionNumber: (latest._max.versionNumber || 0) + 1,
                createdByUserId: userId,
                basedOnVersionId: source?.id || null,
                dayStartMinute: source?.dayStartMinute ?? input.dayStartMinute,
                dayEndMinute: source?.dayEndMinute ?? input.dayEndMinute,
                ...(source
                    ? {
                          slots: {
                              create: source.slots.map((slot) => ({
                                  code: slot.code,
                                  slotKind: slot.slotKind,
                                  occurrences: {
                                      create: slot.occurrences.map((item) => ({
                                          dayOfWeek: item.dayOfWeek,
                                          startMinute: item.startMinute,
                                          endMinute: item.endMinute,
                                      })),
                                  },
                              })),
                          },
                      }
                    : {}),
            },
            include: gridInclude,
        })
        return presentGrid(grid)
    })
}

export async function updateGridRange(id, input) {
    return prisma.$transaction(async (tx) => {
        const grid = await gridOrThrow(tx, id)
        requireDraft(grid)
        const invalid = grid.slots
            .flatMap((slot) => slot.occurrences)
            .find(
                (item) =>
                    item.startMinute < input.dayStartMinute ||
                    item.endMinute > input.dayEndMinute ||
                    (item.startMinute - input.dayStartMinute) % 60 !== 0 ||
                    (item.endMinute - item.startMinute - 50) % 60 !== 0
            )
        if (invalid) {
            throw new ApiError(
                409,
                "Clear occurrences outside the new range before changing grid hours",
                { code: "GRID_RANGE_EXCLUDES_OCCURRENCES" }
            )
        }
        const updated = await tx.slotGridVersion.update({
            where: { id },
            data: input,
            include: gridInclude,
        })
        return presentGrid(updated)
    })
}

export async function createSlot(gridId, input) {
    return prisma.$transaction(async (tx) => {
        const grid = await gridOrThrow(tx, gridId)
        requireDraft(grid)
        await tx.slot.create({
            data: { slotGridVersionId: gridId, ...input },
        })
        return presentGrid(await gridOrThrow(tx, gridId))
    })
}

export async function updateSlot(gridId, slotId, input) {
    return prisma.$transaction(async (tx) => {
        const grid = await gridOrThrow(tx, gridId)
        requireDraft(grid)
        if (!grid.slots.some((slot) => slot.id === slotId)) {
            throw new ApiError(404, "Slot was not found in this grid", {
                code: "SLOT_NOT_FOUND",
            })
        }
        await tx.slot.update({ where: { id: slotId }, data: input })
        return presentGrid(await gridOrThrow(tx, gridId))
    })
}

export async function deleteSlot(gridId, slotId) {
    return prisma.$transaction(async (tx) => {
        const grid = await gridOrThrow(tx, gridId)
        requireDraft(grid)
        if (!grid.slots.some((slot) => slot.id === slotId)) {
            throw new ApiError(404, "Slot was not found in this grid", {
                code: "SLOT_NOT_FOUND",
            })
        }
        await tx.slot.delete({ where: { id: slotId } })
        return presentGrid(await gridOrThrow(tx, gridId))
    })
}

function cellStarts(occurrences) {
    const result = new Set()
    for (const occurrence of occurrences) {
        for (
            let minute = occurrence.startMinute;
            minute + 50 <= occurrence.endMinute;
            minute += 60
        ) {
            result.add(minute)
        }
    }
    return result
}

function mergedOccurrences(starts, dayOfWeek) {
    const sorted = [...starts].sort((left, right) => left - right)
    if (!sorted.length) return []
    const ranges = []
    let first = sorted[0]
    let last = sorted[0]
    for (const minute of sorted.slice(1)) {
        if (minute === last + 60) {
            last = minute
        } else {
            ranges.push({ dayOfWeek, startMinute: first, endMinute: last + 50 })
            first = minute
            last = minute
        }
    }
    ranges.push({ dayOfWeek, startMinute: first, endMinute: last + 50 })
    return ranges
}

export async function toggleGridCell(gridId, input) {
    return prisma.$transaction(async (tx) => {
        const grid = await gridOrThrow(tx, gridId)
        requireDraft(grid)
        const slot = grid.slots.find((item) => item.id === input.slotId)
        if (!slot) {
            throw new ApiError(404, "Slot was not found in this grid", {
                code: "SLOT_NOT_FOUND",
            })
        }
        const bandEnd = input.startMinute + 50
        if (
            input.startMinute < grid.dayStartMinute ||
            bandEnd > grid.dayEndMinute ||
            (input.startMinute - grid.dayStartMinute) % 60 !== 0
        ) {
            throw new ApiError(400, "The selected cell is outside this grid", {
                code: "INVALID_GRID_CELL",
            })
        }
        const dayOccurrences = grid.slots.flatMap((item) =>
            item.occurrences
                .filter(
                    (occurrence) => occurrence.dayOfWeek === input.dayOfWeek
                )
                .map((occurrence) => ({
                    ...occurrence,
                    slotId: item.id,
                    slotCode: item.code,
                }))
        )
        const occupying = dayOccurrences.find(
            (item) =>
                item.startMinute < bandEnd && item.endMinute > input.startMinute
        )
        if (occupying && occupying.slotId !== slot.id) {
            throw new ApiError(
                409,
                `This period is already assigned to slot ${occupying.slotCode}`,
                {
                    code: "GRID_CELL_OCCUPIED",
                    details: { slotId: occupying.slotId },
                }
            )
        }
        const existing = slot.occurrences.filter(
            (item) => item.dayOfWeek === input.dayOfWeek
        )
        const starts = cellStarts(existing)
        if (starts.has(input.startMinute)) starts.delete(input.startMinute)
        else starts.add(input.startMinute)

        await tx.slotOccurrence.deleteMany({
            where: { slotId: slot.id, dayOfWeek: input.dayOfWeek },
        })
        const ranges = mergedOccurrences(starts, input.dayOfWeek)
        if (ranges.length) {
            await tx.slotOccurrence.createMany({
                data: ranges.map((range) => ({ slotId: slot.id, ...range })),
            })
        }
        return presentGrid(await gridOrThrow(tx, gridId))
    })
}

export async function lockGrid(id) {
    return prisma.$transaction(async (tx) => {
        const grid = await gridOrThrow(tx, id)
        requireDraft(grid)
        if (!grid.slots.length) {
            throw new ApiError(
                409,
                "Add at least one slot before locking the grid",
                {
                    code: "EMPTY_SLOT_GRID",
                }
            )
        }
        const emptySlot = grid.slots.find((slot) => !slot.occurrences.length)
        if (emptySlot) {
            throw new ApiError(
                409,
                `Slot ${emptySlot.code} has no weekly periods`,
                {
                    code: "SLOT_WITHOUT_OCCURRENCES",
                }
            )
        }
        const warnings = overlapWarnings(grid.slots)
        if (warnings.length) {
            throw new ApiError(
                409,
                "Resolve every overlap before locking the grid",
                {
                    code: "SLOT_GRID_OVERLAPS",
                    details: warnings,
                }
            )
        }
        const updated = await tx.slotGridVersion.update({
            where: { id },
            data: { status: "LOCKED", lockedAt: new Date() },
            include: gridInclude,
        })
        return presentGrid(updated)
    })
}

export async function discardGrid(id) {
    const grid = await gridOrThrow(prisma, id)
    requireDraft(grid)
    return prisma.slotGridVersion.update({
        where: { id },
        data: { status: "DISCARDED", discardedAt: new Date() },
    })
}
