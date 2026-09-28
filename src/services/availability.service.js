import { prisma } from "../db/index.js"
import { env } from "../config/env.js"
import ApiError from "../utils/ApiError.js"
import { formatDateOnly, parseDateOnly } from "../utils/dateTime.js"
import { pagination } from "../utils/pagination.js"
import {
    freeWindowsWithin,
    halfOpenOverlapWhere,
} from "../utils/timeInterval.js"
import { resolveAcademicDate } from "./occupancy.service.js"

const roomSelect = {
    id: true,
    roomNumber: true,
    fullCode: true,
    displayName: true,
    capacity: true,
    isAccessible: true,
    features: true,
    status: true,
    statusReason: true,
    building: {
        select: {
            id: true,
            code: true,
            name: true,
            location: true,
            isActive: true,
        },
    },
    roomType: {
        select: { id: true, code: true, name: true, isActive: true },
    },
}

function roomWhere(query) {
    return {
        status: "ACTIVE",
        building: { isActive: true },
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
        ...(query.minCapacity ? { capacity: { gte: query.minCapacity } } : {}),
        ...(query.isAccessible === undefined
            ? {}
            : { isAccessible: query.isAccessible }),
    }
}

function privateDetailsAllowed(item, viewer, staffBuildingIds) {
    return (
        viewer.role === "ADMIN" ||
        item.requesterUserId === viewer.id ||
        staffBuildingIds.has(item.room.buildingId) ||
        item.approvals.some((approval) => approval.reviewerUserId === viewer.id)
    )
}

function sortIntervals(items) {
    return items.sort(
        (first, second) =>
            first.startMinute - second.startMinute ||
            first.endMinute - second.endMinute
    )
}

async function evaluateRooms({ rooms, date, startMinute, endMinute, viewer }) {
    const academicDate = await resolveAcademicDate(prisma, date)
    if (!rooms.length) {
        return {
            records: [],
            academicContext: {
                mode: academicDate.mode,
                dayOfWeek: academicDate.dayOfWeek,
                term: academicDate.academicTerm,
                exception: academicDate.exception
                    ? {
                          name: academicDate.exception.name,
                          type: academicDate.exception.exceptionType,
                      }
                    : null,
            },
        }
    }

    const roomIds = rooms.map((room) => room.id)
    const overlap = halfOpenOverlapWhere(startMinute, endMinute)

    const [academic, restrictions, bookings, staffAssignments] =
        await Promise.all([
            academicDate.academicTerm && academicDate.dayOfWeek
                ? prisma.roomSlotOccupancy.findMany({
                      where: {
                          roomId: { in: roomIds },
                          academicTermId: academicDate.academicTerm.id,
                          dayOfWeek: academicDate.dayOfWeek,
                          timetableBatch: { status: "PUBLISHED" },
                          ...overlap,
                      },
                      select: {
                          id: true,
                          roomId: true,
                          startMinute: true,
                          endMinute: true,
                          courseSlotAssignment: {
                              select: {
                                  course: {
                                      select: { code: true, name: true },
                                  },
                              },
                          },
                      },
                  })
                : Promise.resolve([]),
            prisma.roomRestriction.findMany({
                where: {
                    roomId: { in: roomIds },
                    restrictionDate: date,
                    status: "ACTIVE",
                    ...overlap,
                },
                select: {
                    id: true,
                    roomId: true,
                    startMinute: true,
                    endMinute: true,
                    reason: true,
                },
            }),
            prisma.bookingRequest.findMany({
                where: {
                    roomId: { in: roomIds },
                    bookingDate: date,
                    status: {
                        in: ["APPROVED", "PENDING_FACULTY", "PENDING_DEANS"],
                    },
                    ...overlap,
                },
                select: {
                    id: true,
                    roomId: true,
                    requesterUserId: true,
                    status: true,
                    title: true,
                    startMinute: true,
                    endMinute: true,
                    room: { select: { buildingId: true } },
                    approvals: { select: { reviewerUserId: true } },
                },
            }),
            viewer.role === "STAFF"
                ? prisma.buildingStaffAssignment.findMany({
                      where: { staffUserId: viewer.id },
                      select: { buildingId: true },
                  })
                : Promise.resolve([]),
        ])

    const staffBuildingIds = new Set(
        staffAssignments.map((assignment) => assignment.buildingId)
    )
    const byRoom = new Map(
        rooms.map((room) => [room.id, { blocking: [], pending: [], room }])
    )

    for (const room of rooms) {
        const entry = byRoom.get(room.id)
        if (!room.building.isActive) {
            entry.blocking.push({
                source: "BUILDING_INACTIVE",
                startMinute: 0,
                endMinute: 1440,
                label: "Building unavailable",
            })
        } else if (room.status !== "ACTIVE") {
            entry.blocking.push({
                source: "ROOM_INACTIVE",
                startMinute: 0,
                endMinute: 1440,
                label: room.statusReason || "Room unavailable",
            })
        }
    }

    for (const item of academic) {
        const room = byRoom.get(item.roomId).room
        const canSeeDetails =
            viewer.role === "ADMIN" || staffBuildingIds.has(room.building.id)
        byRoom.get(item.roomId).blocking.push({
            source: "ACADEMIC_TIMETABLE",
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            label: canSeeDetails
                ? item.courseSlotAssignment.course.code
                : "Academic timetable",
        })
    }
    for (const item of restrictions) {
        const room = byRoom.get(item.roomId).room
        const canSeeReason =
            viewer.role === "ADMIN" || staffBuildingIds.has(room.building.id)
        byRoom.get(item.roomId).blocking.push({
            source: "ROOM_RESTRICTION",
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            label: canSeeReason ? item.reason : "Room restriction",
        })
    }
    for (const item of bookings) {
        const canSeeDetails = privateDetailsAllowed(
            item,
            viewer,
            staffBuildingIds
        )
        const interval = {
            source:
                item.status === "APPROVED"
                    ? "APPROVED_BOOKING"
                    : "PENDING_REQUEST",
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            label: canSeeDetails
                ? item.title
                : item.status === "APPROVED"
                  ? "Approved event"
                  : "Pending request",
        }
        if (item.status === "APPROVED") {
            byRoom.get(item.roomId).blocking.push(interval)
        } else {
            byRoom.get(item.roomId).pending.push(interval)
        }
    }

    const records = rooms.map((room) => {
        const entry = byRoom.get(room.id)
        const blockingConflicts = sortIntervals(entry.blocking)
        const pendingWarnings = sortIntervals(entry.pending)
        return {
            room,
            isAvailable: blockingConflicts.length === 0,
            blockingConflicts,
            pendingWarnings,
            pendingRequestCount: pendingWarnings.length,
        }
    })

    return {
        records,
        academicContext: {
            mode: academicDate.mode,
            dayOfWeek: academicDate.dayOfWeek,
            term: academicDate.academicTerm,
            exception: academicDate.exception
                ? {
                      name: academicDate.exception.name,
                      type: academicDate.exception.exceptionType,
                  }
                : null,
        },
    }
}

export async function searchRoomAvailability(query, viewer) {
    const date = parseDateOnly(query.date)
    const candidateRooms = await prisma.room.findMany({
        where: roomWhere(query),
        select: roomSelect,
        orderBy: [
            { building: { code: "asc" } },
            { roomNumber: "asc" },
            { id: "asc" },
        ],
    })
    const requiredFeatures = (query.features || []).map((feature) =>
        feature.toLocaleLowerCase()
    )
    const rooms = requiredFeatures.length
        ? candidateRooms.filter((room) => {
              const roomFeatures = new Set(
                  room.features.map((feature) => feature.toLocaleLowerCase())
              )
              return requiredFeatures.every((feature) =>
                  roomFeatures.has(feature)
              )
          })
        : candidateRooms

    if (query.startMinute === undefined || query.endMinute === undefined) {
        const offset = (query.page - 1) * query.pageSize
        const pageRooms = rooms.slice(offset, offset + query.pageSize)
        return {
            date: formatDateOnly(date),
            startMinute: null,
            endMinute: null,
            records: pageRooms.map((room) => ({
                room,
                isAvailable: null,
                blockingConflicts: [],
                pendingWarnings: [],
                pendingRequestCount: 0,
            })),
            summary: {
                suitableRooms: rooms.length,
                availableRooms: null,
                unavailableRooms: null,
                roomsWithPendingRequests: null,
            },
            academicContext: null,
            pagination: pagination(query.page, query.pageSize, rooms.length),
        }
    }

    const evaluated = await evaluateRooms({
        rooms,
        date,
        startMinute: query.startMinute,
        endMinute: query.endMinute,
        viewer,
    })
    evaluated.records.sort(
        (first, second) =>
            Number(second.isAvailable) - Number(first.isAvailable) ||
            first.pendingRequestCount - second.pendingRequestCount ||
            first.room.fullCode.localeCompare(second.room.fullCode)
    )

    const availableCount = evaluated.records.filter(
        (record) => record.isAvailable
    ).length
    const filteredRecords = query.availableOnly
        ? evaluated.records.filter((record) => record.isAvailable)
        : evaluated.records
    const offset = (query.page - 1) * query.pageSize
    const pageRecords = filteredRecords.slice(offset, offset + query.pageSize)

    return {
        date: formatDateOnly(date),
        startMinute: query.startMinute,
        endMinute: query.endMinute,
        records: pageRecords,
        summary: {
            suitableRooms: evaluated.records.length,
            availableRooms: availableCount,
            unavailableRooms: evaluated.records.length - availableCount,
            roomsWithPendingRequests: evaluated.records.filter(
                (record) => record.pendingRequestCount > 0
            ).length,
        },
        academicContext: evaluated.academicContext,
        pagination: pagination(
            query.page,
            query.pageSize,
            filteredRecords.length
        ),
    }
}

export async function getRoomTimeline(roomId, dateValue, viewer) {
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: roomSelect,
    })
    if (!room) {
        throw new ApiError(404, "Room was not found", {
            code: "ROOM_NOT_FOUND",
        })
    }

    const date = parseDateOnly(dateValue)
    const evaluated = await evaluateRooms({
        rooms: [room],
        date,
        startMinute: 0,
        endMinute: 1440,
        viewer,
    })
    const record = evaluated.records[0]
    return {
        date: formatDateOnly(date),
        ...record,
        freeWindows: freeWindowsWithin(
            env.BOOKING_TIMELINE_START_MINUTE,
            env.BOOKING_TIMELINE_END_MINUTE,
            record.blockingConflicts,
            env.BOOKING_MIN_DURATION_MINUTES
        ),
        academicContext: evaluated.academicContext,
    }
}

export async function getAvailabilityTimelineConfig(dateValue) {
    return {
        date: dateValue,
        windowStartMinute: env.BOOKING_TIMELINE_START_MINUTE,
        windowEndMinute: env.BOOKING_TIMELINE_END_MINUTE,
        minimumDurationMinutes: env.BOOKING_MIN_DURATION_MINUTES,
        selectionStepMinutes: env.BOOKING_SELECTION_STEP_MINUTES,
        defaultDurationMinutes: env.BOOKING_DEFAULT_DURATION_MINUTES,
    }
}
