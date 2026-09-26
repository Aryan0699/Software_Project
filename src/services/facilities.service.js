import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import { institutionNow, parseDateOnly } from "../utils/dateTime.js"
import {
    acquireOccupancyLock,
    findIntervalConflicts,
    findRoomDeactivationBlockers,
} from "./occupancy.service.js"

const referenceSelect = {
    id: true,
    code: true,
    name: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
}

const buildingSelect = {
    id: true,
    code: true,
    name: true,
    location: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { rooms: true, staffAssignments: true } },
}

const roomSelect = {
    id: true,
    buildingId: true,
    roomTypeId: true,
    roomNumber: true,
    fullCode: true,
    displayName: true,
    capacity: true,
    isAccessible: true,
    features: true,
    status: true,
    statusReason: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    building: {
        select: { id: true, code: true, name: true, isActive: true },
    },
    roomType: { select: referenceSelect },
}

const restrictionSelect = {
    id: true,
    roomId: true,
    restrictionDate: true,
    startMinute: true,
    endMinute: true,
    reason: true,
    status: true,
    cancelledAt: true,
    createdAt: true,
    updatedAt: true,
    room: {
        select: {
            id: true,
            fullCode: true,
            displayName: true,
            building: { select: { id: true, code: true, name: true } },
        },
    },
    createdBy: { select: { id: true, name: true, email: true } },
    cancelledBy: { select: { id: true, name: true, email: true } },
}

function pagination(page, pageSize, total) {
    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
    }
}

function pageOffset(page, pageSize) {
    return (page - 1) * pageSize
}

function normalizeNullable(value) {
    if (value === undefined) return undefined
    if (value === null || value.trim() === "") return null
    return value.trim()
}

function normalizeFeatures(features) {
    if (features === undefined) return undefined
    return [
        ...new Map(
            features.map((feature) => {
                const normalized = feature.trim()
                return [normalized.toLowerCase(), normalized]
            })
        ).values(),
    ].sort((left, right) => left.localeCompare(right))
}

function normalizeRoomNumber(roomNumber) {
    return roomNumber.trim().toUpperCase()
}

function roomFullCode(buildingCode, roomNumber) {
    return `${buildingCode} ${normalizeRoomNumber(roomNumber)}`
}

function buildReferenceWhere({ search, isActive }, user) {
    return {
        ...(search
            ? {
                  OR: [
                      { code: { contains: search, mode: "insensitive" } },
                      { name: { contains: search, mode: "insensitive" } },
                  ],
              }
            : {}),
        ...(user.role === "ADMIN"
            ? isActive === undefined
                ? {}
                : { isActive }
            : { isActive: true }),
    }
}

async function listReference(delegate, query, user) {
    const where = buildReferenceWhere(query, user)
    const [records, total] = await prisma.$transaction([
        delegate.findMany({
            where,
            select: referenceSelect,
            orderBy: [{ code: "asc" }, { id: "asc" }],
            skip: pageOffset(query.page, query.pageSize),
            take: query.pageSize,
        }),
        delegate.count({ where }),
    ])
    return {
        records,
        pagination: pagination(query.page, query.pageSize, total),
    }
}

export function listDepartments(query, user) {
    return listReference(prisma.department, query, user)
}

export function listRoomTypes(query, user) {
    return listReference(prisma.roomType, query, user)
}

export function createDepartment(data) {
    return prisma.department.create({ data, select: referenceSelect })
}

export function createRoomType(data) {
    return prisma.roomType.create({ data, select: referenceSelect })
}

async function updateReference(delegate, id, changes, notFoundMessage, code) {
    const record = await delegate.findUnique({
        where: { id },
        select: { id: true },
    })
    if (!record) {
        throw new ApiError(404, notFoundMessage, { code })
    }
    return delegate.update({
        where: { id },
        data: changes,
        select: referenceSelect,
    })
}

export function updateDepartment(id, changes) {
    return updateReference(
        prisma.department,
        id,
        changes,
        "Department was not found",
        "DEPARTMENT_NOT_FOUND"
    )
}

export function updateRoomType(id, changes) {
    return updateReference(
        prisma.roomType,
        id,
        changes,
        "Room type was not found",
        "ROOM_TYPE_NOT_FOUND"
    )
}

function buildingScope(user) {
    if (user.role === "ADMIN") return {}
    if (user.role === "STAFF") {
        return { staffAssignments: { some: { staffUserId: user.id } } }
    }
    return { isActive: true }
}

export async function listBuildings(query, user) {
    const where = {
        ...buildingScope(user),
        ...(query.search
            ? {
                  OR: [
                      {
                          code: {
                              contains: query.search,
                              mode: "insensitive",
                          },
                      },
                      {
                          name: {
                              contains: query.search,
                              mode: "insensitive",
                          },
                      },
                      {
                          location: {
                              contains: query.search,
                              mode: "insensitive",
                          },
                      },
                  ],
              }
            : {}),
        ...(user.role === "ADMIN" && query.isActive !== undefined
            ? { isActive: query.isActive }
            : {}),
    }
    const [records, total] = await prisma.$transaction([
        prisma.building.findMany({
            where,
            select: buildingSelect,
            orderBy: [{ code: "asc" }, { id: "asc" }],
            skip: pageOffset(query.page, query.pageSize),
            take: query.pageSize,
        }),
        prisma.building.count({ where }),
    ])
    return {
        records: records.map((record) => ({
            ...record,
            canManageRestrictions:
                user.role === "ADMIN" || user.role === "STAFF",
        })),
        pagination: pagination(query.page, query.pageSize, total),
    }
}

export function createBuilding(data) {
    return prisma.building.create({
        data: { ...data, location: normalizeNullable(data.location) },
        select: buildingSelect,
    })
}

export async function updateBuilding(id, changes) {
    return prisma.$transaction(async (tx) => {
        const building = await tx.building.findUnique({
            where: { id },
            select: {
                id: true,
                code: true,
                isActive: true,
                rooms: { select: { id: true, fullCode: true } },
            },
        })
        if (!building) {
            throw new ApiError(404, "Building was not found", {
                code: "BUILDING_NOT_FOUND",
            })
        }

        if (
            changes.code &&
            changes.code !== building.code &&
            building.rooms.length > 0
        ) {
            throw new ApiError(
                409,
                "Building code cannot change after rooms have been created",
                { code: "BUILDING_CODE_IN_USE" }
            )
        }

        if (changes.isActive === false && building.isActive) {
            await acquireOccupancyLock(tx)
            const blockers = await findRoomDeactivationBlockers(
                tx,
                building.rooms.map((room) => room.id)
            )
            const blockedRooms = building.rooms
                .map((room) => ({
                    roomId: room.id,
                    fullCode: room.fullCode,
                    blockers: blockers.get(room.id) || [],
                }))
                .filter((room) => room.blockers.length > 0)
            if (blockedRooms.length) {
                throw new ApiError(
                    409,
                    "Building cannot be deactivated while its rooms have future occupancy or restrictions",
                    {
                        code: "BUILDING_DEACTIVATION_BLOCKED",
                        details: { rooms: blockedRooms },
                    }
                )
            }
        }

        return tx.building.update({
            where: { id },
            data: {
                ...changes,
                ...(changes.location !== undefined
                    ? { location: normalizeNullable(changes.location) }
                    : {}),
            },
            select: buildingSelect,
        })
    })
}

function roomScope(user) {
    if (user.role === "ADMIN") return {}
    if (user.role === "STAFF") {
        return {
            building: {
                staffAssignments: { some: { staffUserId: user.id } },
            },
        }
    }
    return { status: "ACTIVE", building: { isActive: true } }
}

export async function listRooms(query, user) {
    const where = {
        ...roomScope(user),
        ...(query.search
            ? {
                  OR: [
                      {
                          fullCode: {
                              contains: query.search,
                              mode: "insensitive",
                          },
                      },
                      {
                          displayName: {
                              contains: query.search,
                              mode: "insensitive",
                          },
                      },
                      {
                          building: {
                              name: {
                                  contains: query.search,
                                  mode: "insensitive",
                              },
                          },
                      },
                  ],
              }
            : {}),
        ...(query.buildingId ? { buildingId: query.buildingId } : {}),
        ...(query.roomTypeId ? { roomTypeId: query.roomTypeId } : {}),
        ...(user.role === "ADMIN" && query.status
            ? { status: query.status }
            : {}),
        ...(query.minCapacity ? { capacity: { gte: query.minCapacity } } : {}),
        ...(query.isAccessible === undefined
            ? {}
            : { isAccessible: query.isAccessible }),
    }
    const [records, total] = await prisma.$transaction([
        prisma.room.findMany({
            where,
            select: roomSelect,
            orderBy: [
                { building: { code: "asc" } },
                { roomNumber: "asc" },
                { id: "asc" },
            ],
            skip: pageOffset(query.page, query.pageSize),
            take: query.pageSize,
        }),
        prisma.room.count({ where }),
    ])
    return {
        records: records.map((record) => ({
            ...record,
            canManageRestrictions:
                user.role === "ADMIN" || user.role === "STAFF",
        })),
        pagination: pagination(query.page, query.pageSize, total),
    }
}

async function requireBuilding(db, buildingId) {
    const building = await db.building.findUnique({
        where: { id: buildingId },
        select: { id: true, code: true, name: true, isActive: true },
    })
    if (!building) {
        throw new ApiError(404, "Building was not found", {
            code: "BUILDING_NOT_FOUND",
        })
    }
    return building
}

async function requireActiveBuilding(db, buildingId) {
    const building = await requireBuilding(db, buildingId)
    if (!building.isActive) {
        throw new ApiError(
            409,
            "Rooms cannot be assigned to an inactive building",
            { code: "BUILDING_INACTIVE" }
        )
    }
    return building
}

async function requireActiveRoomType(db, roomTypeId) {
    if (roomTypeId === null || roomTypeId === undefined) return
    const roomType = await db.roomType.findUnique({
        where: { id: roomTypeId },
        select: { id: true, isActive: true },
    })
    if (!roomType) {
        throw new ApiError(404, "Room type was not found", {
            code: "ROOM_TYPE_NOT_FOUND",
        })
    }
    if (!roomType.isActive) {
        throw new ApiError(409, "An inactive room type cannot be assigned", {
            code: "ROOM_TYPE_INACTIVE",
        })
    }
}

export function createRoom(data) {
    return prisma.$transaction(async (tx) => {
        const building = await requireActiveBuilding(tx, data.buildingId)
        await requireActiveRoomType(tx, data.roomTypeId)
        const roomNumber = normalizeRoomNumber(data.roomNumber)

        return tx.room.create({
            data: {
                ...data,
                roomNumber,
                fullCode: roomFullCode(building.code, roomNumber),
                displayName: normalizeNullable(data.displayName),
                notes: normalizeNullable(data.notes),
                features: normalizeFeatures(data.features) || [],
            },
            select: roomSelect,
        })
    })
}

export function updateRoom(id, changes) {
    return prisma.$transaction(async (tx) => {
        const room = await tx.room.findUnique({
            where: { id },
            select: {
                id: true,
                buildingId: true,
                roomNumber: true,
                status: true,
                statusReason: true,
            },
        })
        if (!room) {
            throw new ApiError(404, "Room was not found", {
                code: "ROOM_NOT_FOUND",
            })
        }

        const targetBuildingId = changes.buildingId || room.buildingId
        const targetBuilding = await requireBuilding(tx, targetBuildingId)
        if (changes.roomTypeId !== undefined) {
            await requireActiveRoomType(tx, changes.roomTypeId)
        }

        const targetStatus = changes.status || room.status
        if (
            !targetBuilding.isActive &&
            (changes.buildingId !== undefined || changes.status === "ACTIVE")
        ) {
            throw new ApiError(
                409,
                "A room cannot be moved to or reactivated inside an inactive building",
                { code: "BUILDING_INACTIVE" }
            )
        }
        if (changes.status === "INACTIVE" && room.status === "ACTIVE") {
            await acquireOccupancyLock(tx)
            const blockers = await findRoomDeactivationBlockers(tx, [id])
            const roomBlockers = blockers.get(id) || []
            if (roomBlockers.length) {
                throw new ApiError(
                    409,
                    "Room cannot be deactivated while it has future occupancy or restrictions",
                    {
                        code: "ROOM_DEACTIVATION_BLOCKED",
                        details: { blockers: roomBlockers },
                    }
                )
            }
        }

        const roomNumber = normalizeRoomNumber(
            changes.roomNumber || room.roomNumber
        )
        return tx.room.update({
            where: { id },
            data: {
                ...changes,
                ...(changes.roomNumber !== undefined ? { roomNumber } : {}),
                ...(changes.buildingId !== undefined ||
                changes.roomNumber !== undefined
                    ? {
                          fullCode: roomFullCode(
                              targetBuilding.code,
                              roomNumber
                          ),
                      }
                    : {}),
                ...(changes.displayName !== undefined
                    ? { displayName: normalizeNullable(changes.displayName) }
                    : {}),
                ...(changes.notes !== undefined
                    ? { notes: normalizeNullable(changes.notes) }
                    : {}),
                ...(changes.features !== undefined
                    ? { features: normalizeFeatures(changes.features) }
                    : {}),
                statusReason:
                    targetStatus === "ACTIVE"
                        ? null
                        : normalizeNullable(
                              changes.statusReason ?? room.statusReason
                          ),
            },
            select: roomSelect,
        })
    })
}

async function assertRestrictionScope(db, user, roomId) {
    const room = await db.room.findUnique({
        where: { id: roomId },
        select: {
            id: true,
            status: true,
            fullCode: true,
            building: {
                select: {
                    id: true,
                    isActive: true,
                    staffAssignments: {
                        where: { staffUserId: user.id },
                        select: { id: true },
                    },
                },
            },
        },
    })
    if (!room) {
        throw new ApiError(404, "Room was not found", {
            code: "ROOM_NOT_FOUND",
        })
    }
    if (user.role !== "ADMIN" && !room.building.staffAssignments.length) {
        throw new ApiError(
            403,
            "You can manage restrictions only in assigned buildings",
            { code: "BUILDING_SCOPE_REQUIRED" }
        )
    }
    return room
}

export async function listRestrictions(query, user) {
    const where = {
        ...(query.roomId ? { roomId: query.roomId } : {}),
        ...(query.buildingId ? { room: { buildingId: query.buildingId } } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.dateFrom || query.dateTo
            ? {
                  restrictionDate: {
                      ...(query.dateFrom
                          ? { gte: parseDateOnly(query.dateFrom) }
                          : {}),
                      ...(query.dateTo
                          ? { lte: parseDateOnly(query.dateTo) }
                          : {}),
                  },
              }
            : {}),
        ...(user.role === "STAFF"
            ? {
                  room: {
                      ...(query.buildingId
                          ? { buildingId: query.buildingId }
                          : {}),
                      building: {
                          staffAssignments: {
                              some: { staffUserId: user.id },
                          },
                      },
                  },
              }
            : {}),
    }
    const [records, total] = await prisma.$transaction([
        prisma.roomRestriction.findMany({
            where,
            select: restrictionSelect,
            orderBy: [{ restrictionDate: "desc" }, { startMinute: "asc" }],
            skip: pageOffset(query.page, query.pageSize),
            take: query.pageSize,
        }),
        prisma.roomRestriction.count({ where }),
    ])
    return {
        records,
        pagination: pagination(query.page, query.pageSize, total),
    }
}

export function createRestriction(data, user) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const room = await assertRestrictionScope(tx, user, data.roomId)
        if (room.status !== "ACTIVE" || !room.building.isActive) {
            throw new ApiError(
                409,
                "Restrictions can be created only for an active room in an active building",
                { code: "ROOM_INACTIVE" }
            )
        }

        const restrictionDate = parseDateOnly(data.restrictionDate)
        const now = institutionNow()
        if (
            restrictionDate < now.dateValue ||
            (restrictionDate.getTime() === now.dateValue.getTime() &&
                data.endMinute <= now.minute)
        ) {
            throw new ApiError(400, "A restriction cannot end in the past", {
                code: "RESTRICTION_IN_PAST",
            })
        }

        const conflicts = await findIntervalConflicts(tx, {
            roomId: data.roomId,
            date: restrictionDate,
            startMinute: data.startMinute,
            endMinute: data.endMinute,
        })
        if (
            conflicts.academic.length ||
            conflicts.bookings.length ||
            conflicts.restrictions.length
        ) {
            throw new ApiError(
                409,
                "The restriction overlaps an existing room commitment",
                { code: "RESTRICTION_CONFLICT", details: { conflicts } }
            )
        }

        return tx.roomRestriction.create({
            data: {
                ...data,
                restrictionDate,
                createdByUserId: user.id,
            },
            select: restrictionSelect,
        })
    })
}

export function cancelRestriction(id, user) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const restriction = await tx.roomRestriction.findUnique({
            where: { id },
            select: { id: true, roomId: true, status: true },
        })
        if (!restriction) {
            throw new ApiError(404, "Room restriction was not found", {
                code: "RESTRICTION_NOT_FOUND",
            })
        }
        await assertRestrictionScope(tx, user, restriction.roomId)
        if (restriction.status === "CANCELLED") {
            throw new ApiError(409, "Room restriction is already cancelled", {
                code: "RESTRICTION_ALREADY_CANCELLED",
            })
        }

        return tx.roomRestriction.update({
            where: { id },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelledByUserId: user.id,
            },
            select: restrictionSelect,
        })
    })
}
