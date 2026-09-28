import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import { pagination, pageOffset } from "../utils/pagination.js"

const systemSelect = {
    id: true,
    code: true,
    name: true,
    description: true,
    applicableFor: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    gridVersions: {
        select: {
            id: true,
            versionNumber: true,
            status: true,
            basedOnVersionId: true,
            createdAt: true,
            lockedAt: true,
            discardedAt: true,
            _count: { select: { slots: true, imports: true } },
        },
        orderBy: { versionNumber: "desc" },
    },
    _count: { select: { imports: true } },
}

const gridSelect = {
    id: true,
    slotSystemId: true,
    versionNumber: true,
    status: true,
    basedOnVersionId: true,
    createdAt: true,
    lockedAt: true,
    discardedAt: true,
    createdBy: { select: { id: true, name: true, email: true } },
    slotSystem: {
        select: { id: true, code: true, name: true, isActive: true },
    },
    slots: {
        select: {
            id: true,
            code: true,
            slotKind: true,
            createdAt: true,
            occurrences: {
                select: {
                    id: true,
                    dayOfWeek: true,
                    startMinute: true,
                    endMinute: true,
                },
                orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
            },
        },
        orderBy: [{ code: "asc" }, { id: "asc" }],
    },
    _count: { select: { imports: true } },
}

export function findGridOverlaps(slots) {
    const occurrences = slots.flatMap((slot) =>
        slot.occurrences.map((occurrence) => ({
            ...occurrence,
            slotId: slot.id,
            slotCode: slot.code,
        }))
    )
    const overlaps = []
    for (let left = 0; left < occurrences.length; left += 1) {
        for (let right = left + 1; right < occurrences.length; right += 1) {
            const first = occurrences[left]
            const second = occurrences[right]
            if (
                first.dayOfWeek === second.dayOfWeek &&
                first.startMinute < second.endMinute &&
                second.startMinute < first.endMinute
            ) {
                overlaps.push({ first, second })
            }
        }
    }
    return overlaps
}

function withGridAnalysis(grid) {
    return { ...grid, overlaps: findGridOverlaps(grid.slots) }
}

async function getGridOrThrow(client, systemId, gridId, select = gridSelect) {
    const grid = await client.slotGridVersion.findFirst({
        where: { id: gridId, slotSystemId: systemId },
        select,
    })
    if (!grid) {
        throw new ApiError(404, "Slot grid version was not found", {
            code: "SLOT_GRID_NOT_FOUND",
        })
    }
    return grid
}

async function requireDraft(client, systemId, gridId) {
    const locked = await client.$queryRaw`
        SELECT "id"
        FROM "SlotGridVersion"
        WHERE "id" = ${gridId} AND "slotSystemId" = ${systemId}
        FOR UPDATE
    `
    if (locked.length === 0) {
        throw new ApiError(404, "Slot grid version was not found", {
            code: "SLOT_GRID_NOT_FOUND",
        })
    }
    const grid = await getGridOrThrow(client, systemId, gridId, {
        id: true,
        status: true,
        _count: { select: { imports: true } },
    })
    if (grid.status !== "DRAFT") {
        throw new ApiError(409, "Only a draft slot grid can be edited", {
            code: "SLOT_GRID_IMMUTABLE",
        })
    }
    return grid
}

export async function listSlotSystems({ page, pageSize, search, isActive }) {
    const where = {
        ...(search
            ? {
                  OR: [
                      { code: { contains: search, mode: "insensitive" } },
                      { name: { contains: search, mode: "insensitive" } },
                      {
                          applicableFor: {
                              contains: search,
                              mode: "insensitive",
                          },
                      },
                  ],
              }
            : {}),
        ...(isActive === undefined ? {} : { isActive }),
    }
    const [records, total] = await prisma.$transaction([
        prisma.slotSystem.findMany({
            where,
            select: systemSelect,
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.slotSystem.count({ where }),
    ])
    return { records, pagination: pagination(page, pageSize, total) }
}

export function createSlotSystem(data) {
    return prisma.slotSystem.create({ data, select: systemSelect })
}

export async function updateSlotSystem(id, changes) {
    return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`slot-grid:${id}`}, 0))::text AS acquired`
        const system = await tx.slotSystem.findUnique({
            where: { id },
            select: {
                id: true,
                isActive: true,
                gridVersions: {
                    where: { status: "DRAFT" },
                    select: { id: true },
                    take: 1,
                },
                imports: {
                    where: {
                        status: "PUBLISHED",
                        academicTerm: { status: "CURRENT" },
                    },
                    select: { id: true },
                    take: 1,
                },
            },
        })
        if (!system) {
            throw new ApiError(404, "Slot system was not found", {
                code: "SLOT_SYSTEM_NOT_FOUND",
            })
        }
        if (
            changes.isActive === false &&
            system.isActive &&
            (system.gridVersions.length > 0 || system.imports.length > 0)
        ) {
            throw new ApiError(
                409,
                "Discard its draft and remove its current published timetable before deactivating this slot system",
                {
                    code: "SLOT_SYSTEM_IN_USE",
                    details: {
                        hasDraft: system.gridVersions.length > 0,
                        hasPublishedTimetable: system.imports.length > 0,
                    },
                }
            )
        }
        return tx.slotSystem.update({
            where: { id },
            data: changes,
            select: systemSelect,
        })
    })
}

export async function getGridVersion(systemId, gridId) {
    return withGridAnalysis(await getGridOrThrow(prisma, systemId, gridId))
}

export async function createGridVersion(
    systemId,
    { basedOnVersionId },
    actorUserId
) {
    const gridId = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`slot-grid:${systemId}`}, 0))::text AS acquired`
        const system = await tx.slotSystem.findUnique({
            where: { id: systemId },
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
                "Reactivate the slot system before creating a draft",
                { code: "SLOT_SYSTEM_INACTIVE" }
            )
        }
        const existingDraft = await tx.slotGridVersion.findFirst({
            where: { slotSystemId: systemId, status: "DRAFT" },
            select: { id: true, versionNumber: true },
        })
        if (existingDraft) {
            throw new ApiError(
                409,
                `Version ${existingDraft.versionNumber} is already the active draft`,
                {
                    code: "SLOT_GRID_DRAFT_EXISTS",
                    details: { draftId: existingDraft.id },
                }
            )
        }

        let base = null
        if (basedOnVersionId) {
            base = await tx.slotGridVersion.findFirst({
                where: {
                    id: basedOnVersionId,
                    slotSystemId: systemId,
                    status: "LOCKED",
                },
                select: {
                    id: true,
                    slots: {
                        select: {
                            code: true,
                            slotKind: true,
                            occurrences: {
                                select: {
                                    dayOfWeek: true,
                                    startMinute: true,
                                    endMinute: true,
                                },
                            },
                        },
                    },
                },
            })
            if (!base) {
                throw new ApiError(
                    409,
                    "A draft can only be cloned from a locked version in this slot system",
                    { code: "INVALID_SLOT_GRID_BASE" }
                )
            }
        }
        const latest = await tx.slotGridVersion.aggregate({
            where: { slotSystemId: systemId },
            _max: { versionNumber: true },
        })
        const created = await tx.slotGridVersion.create({
            data: {
                slotSystemId: systemId,
                versionNumber: (latest._max.versionNumber || 0) + 1,
                basedOnVersionId: base?.id,
                createdByUserId: actorUserId,
                ...(base
                    ? {
                          slots: {
                              create: base.slots.map((slot) => ({
                                  code: slot.code,
                                  slotKind: slot.slotKind,
                                  occurrences: {
                                      create: slot.occurrences,
                                  },
                              })),
                          },
                      }
                    : {}),
            },
            select: { id: true },
        })
        return created.id
    })
    return getGridVersion(systemId, gridId)
}

export async function activateInitialGridVersion(systemId, gridId) {
    await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`slot-grid:${systemId}`}, 0))::text AS acquired`
        await requireDraft(tx, systemId, gridId)

        const system = await tx.slotSystem.findUnique({
            where: { id: systemId },
            select: {
                isActive: true,
                gridVersions: {
                    where: { status: "LOCKED" },
                    select: { id: true },
                    take: 1,
                },
                imports: { select: { id: true }, take: 1 },
            },
        })
        if (!system) {
            throw new ApiError(404, "Slot system was not found", {
                code: "SLOT_SYSTEM_NOT_FOUND",
            })
        }
        if (!system.isActive) {
            throw new ApiError(
                409,
                "Reactivate the slot system before activating its grid",
                { code: "SLOT_SYSTEM_INACTIVE" }
            )
        }
        if (system.gridVersions.length > 0 || system.imports.length > 0) {
            throw new ApiError(
                409,
                "A replacement grid becomes active only when its replacement timetable is published",
                { code: "SLOT_GRID_REQUIRES_TIMETABLE_PUBLICATION" }
            )
        }

        const grid = await getGridOrThrow(tx, systemId, gridId)
        if (grid.slots.length === 0) {
            throw new ApiError(
                409,
                "Add at least one slot before activating this grid",
                { code: "SLOT_GRID_EMPTY" }
            )
        }
        const incompleteSlots = grid.slots
            .filter((slot) => slot.occurrences.length === 0)
            .map((slot) => slot.code)
        if (incompleteSlots.length > 0) {
            throw new ApiError(
                409,
                "Assign every slot to at least one day and time before activation",
                {
                    code: "SLOT_GRID_INCOMPLETE",
                    details: { slotCodes: incompleteSlots },
                }
            )
        }
        const overlaps = findGridOverlaps(grid.slots)
        if (overlaps.length > 0) {
            throw new ApiError(
                409,
                "Resolve all overlapping slot occurrences before activation",
                {
                    code: "SLOT_GRID_OVERLAPS",
                    details: { overlapCount: overlaps.length },
                }
            )
        }

        await tx.slotGridVersion.update({
            where: { id: gridId },
            data: { status: "LOCKED", lockedAt: new Date() },
        })
    })
    return getGridVersion(systemId, gridId)
}

export async function discardGridVersion(systemId, gridId) {
    await prisma.$transaction(async (tx) => {
        const grid = await requireDraft(tx, systemId, gridId)
        if (grid._count.imports > 0) {
            throw new ApiError(
                409,
                "Cancel the timetable preview linked to this draft before discarding it",
                { code: "SLOT_GRID_HAS_IMPORTS" }
            )
        }
        await tx.slotGridVersion.update({
            where: { id: gridId },
            data: { status: "DISCARDED", discardedAt: new Date() },
        })
    })
    return getGridVersion(systemId, gridId)
}

export async function createSlot(systemId, gridId, data) {
    const slotId = await prisma.$transaction(async (tx) => {
        await requireDraft(tx, systemId, gridId)
        const slot = await tx.slot.create({
            data: {
                slotGridVersionId: gridId,
                code: data.code,
                slotKind: data.slotKind,
                occurrences: { create: data.occurrences },
            },
            select: { id: true },
        })
        return slot.id
    })
    const grid = await getGridVersion(systemId, gridId)
    return { slot: grid.slots.find((item) => item.id === slotId), grid }
}

export async function updateSlot(systemId, gridId, slotId, data) {
    await prisma.$transaction(async (tx) => {
        await requireDraft(tx, systemId, gridId)
        const slot = await tx.slot.findFirst({
            where: { id: slotId, slotGridVersionId: gridId },
            select: { id: true },
        })
        if (!slot) {
            throw new ApiError(404, "Slot was not found", {
                code: "SLOT_NOT_FOUND",
            })
        }
        await tx.slot.update({
            where: { id: slotId },
            data: {
                code: data.code,
                slotKind: data.slotKind,
                occurrences: {
                    deleteMany: {},
                    create: data.occurrences,
                },
            },
        })
    })
    const grid = await getGridVersion(systemId, gridId)
    return { slot: grid.slots.find((item) => item.id === slotId), grid }
}

export async function deleteSlot(systemId, gridId, slotId) {
    await prisma.$transaction(async (tx) => {
        await requireDraft(tx, systemId, gridId)
        const slot = await tx.slot.findFirst({
            where: { id: slotId, slotGridVersionId: gridId },
            select: {
                id: true,
                _count: {
                    select: {
                        courseAssignments: true,
                        resolvedImportRows: true,
                    },
                },
            },
        })
        if (!slot) {
            throw new ApiError(404, "Slot was not found", {
                code: "SLOT_NOT_FOUND",
            })
        }
        if (
            slot._count.courseAssignments > 0 ||
            slot._count.resolvedImportRows > 0
        ) {
            throw new ApiError(
                409,
                "This slot is referenced by timetable data and cannot be deleted",
                { code: "SLOT_IN_USE" }
            )
        }
        await tx.slot.delete({ where: { id: slotId } })
    })
}
