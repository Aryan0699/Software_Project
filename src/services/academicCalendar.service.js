import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import {
    effectiveAcademicDay,
    formatDateOnly,
    parseDateOnly,
} from "../utils/dateTime.js"
import { pagination, pageOffset } from "../utils/pagination.js"
import { acquireOccupancyLock } from "./occupancy.service.js"

const termSelect = {
    id: true,
    termCode: true,
    name: true,
    startDate: true,
    endDate: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    _count: {
        select: {
            calendarExceptions: true,
            imports: true,
            slotOccupancies: true,
        },
    },
}

const exceptionSelect = {
    id: true,
    academicTermId: true,
    name: true,
    exceptionType: true,
    startDate: true,
    endDate: true,
    targetDayOfWeek: true,
    isActive: true,
    deactivatedAt: true,
    createdAt: true,
    updatedAt: true,
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
    createdBy: { select: { id: true, name: true, email: true } },
    updatedBy: { select: { id: true, name: true, email: true } },
}

function candidateToStored(candidate) {
    return {
        ...candidate,
        startDate: parseDateOnly(candidate.startDate),
        endDate: parseDateOnly(candidate.endDate),
        targetDayOfWeek:
            candidate.exceptionType === "FOLLOW_DAY"
                ? candidate.targetDayOfWeek
                : null,
    }
}

export async function listTerms({ page, pageSize, search, status }) {
    const where = {
        ...(search
            ? {
                  OR: [
                      { termCode: { contains: search, mode: "insensitive" } },
                      { name: { contains: search, mode: "insensitive" } },
                  ],
              }
            : {}),
        ...(status ? { status } : {}),
    }
    const [records, total] = await prisma.$transaction([
        prisma.academicTerm.findMany({
            where,
            select: termSelect,
            orderBy: [{ startDate: "desc" }, { id: "desc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.academicTerm.count({ where }),
    ])
    return { records, pagination: pagination(page, pageSize, total) }
}

export function createTerm(data) {
    return prisma.academicTerm.create({
        data: {
            ...data,
            startDate: parseDateOnly(data.startDate),
            endDate: parseDateOnly(data.endDate),
        },
        select: termSelect,
    })
}

export function updateTerm(id, changes) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const term = await tx.academicTerm.findUnique({
            where: { id },
            select: {
                id: true,
                termCode: true,
                name: true,
                startDate: true,
                endDate: true,
                status: true,
                _count: { select: { imports: true } },
            },
        })
        if (!term) {
            throw new ApiError(404, "Academic term was not found", {
                code: "ACADEMIC_TERM_NOT_FOUND",
            })
        }
        if (term.status === "CLOSED") {
            throw new ApiError(409, "A closed academic term cannot be edited", {
                code: "ACADEMIC_TERM_CLOSED",
            })
        }
        if (
            term.status === "CURRENT" &&
            (changes.termCode || changes.startDate || changes.endDate)
        ) {
            throw new ApiError(
                409,
                "Current term code and date boundaries cannot be changed",
                { code: "CURRENT_TERM_BOUNDARIES_LOCKED" }
            )
        }
        if (
            changes.termCode &&
            changes.termCode !== term.termCode &&
            term._count.imports > 0
        ) {
            throw new ApiError(
                409,
                "Term code cannot change after timetable imports have been created",
                { code: "TERM_CODE_IN_USE" }
            )
        }

        const startDate = changes.startDate
            ? parseDateOnly(changes.startDate)
            : term.startDate
        const endDate = changes.endDate
            ? parseDateOnly(changes.endDate)
            : term.endDate
        if (startDate > endDate) {
            throw new ApiError(400, "End date must not be before start date", {
                code: "INVALID_TERM_DATES",
            })
        }

        if (changes.startDate || changes.endDate) {
            const outsideException = await tx.calendarException.findFirst({
                where: {
                    academicTermId: id,
                    OR: [
                        { startDate: { lt: startDate } },
                        { endDate: { gt: endDate } },
                    ],
                },
                select: { id: true, name: true },
            })
            if (outsideException) {
                throw new ApiError(
                    409,
                    `The new boundaries would exclude calendar exception "${outsideException.name}"`,
                    { code: "TERM_DATES_EXCLUDE_EXCEPTION" }
                )
            }
        }

        return tx.academicTerm.update({
            where: { id },
            data: {
                ...changes,
                ...(changes.startDate ? { startDate } : {}),
                ...(changes.endDate ? { endDate } : {}),
            },
            select: termSelect,
        })
    })
}

async function findApprovedBookingImpacts(
    db,
    { term, startDate, endDate, candidate = null, excludeExceptionId = null }
) {
    if (term.status !== "CURRENT") return []
    const bookings = await db.bookingRequest.findMany({
        where: {
            status: "APPROVED",
            bookingDate: { gte: startDate, lte: endDate },
        },
        select: {
            id: true,
            roomId: true,
            bookingDate: true,
            startMinute: true,
            endMinute: true,
            title: true,
            requester: { select: { id: true, name: true, email: true } },
            room: {
                select: {
                    id: true,
                    fullCode: true,
                    displayName: true,
                    building: { select: { id: true, code: true, name: true } },
                },
            },
        },
        orderBy: [{ bookingDate: "asc" }, { startMinute: "asc" }],
    })
    if (!bookings.length) return []

    const otherExceptions = await db.calendarException.findMany({
        where: {
            academicTermId: term.id,
            isActive: true,
            startDate: { lte: endDate },
            endDate: { gte: startDate },
            ...(excludeExceptionId ? { id: { not: excludeExceptionId } } : {}),
        },
        orderBy: [{ startDate: "asc" }, { id: "asc" }],
        select: {
            startDate: true,
            endDate: true,
            exceptionType: true,
            targetDayOfWeek: true,
        },
    })
    const bookingDays = new Map(
        bookings.map((booking) => [
            booking.id,
            effectiveAcademicDay(
                booking.bookingDate,
                candidate ? [candidate, ...otherExceptions] : otherExceptions
            ),
        ])
    )
    const days = [...new Set([...bookingDays.values()].filter(Boolean))]
    if (!days.length) return []

    const occupancies = await db.roomSlotOccupancy.findMany({
        where: {
            academicTermId: term.id,
            roomId: { in: [...new Set(bookings.map((item) => item.roomId))] },
            dayOfWeek: { in: days },
            timetableBatch: { status: "PUBLISHED" },
        },
        select: {
            id: true,
            roomId: true,
            dayOfWeek: true,
            startMinute: true,
            endMinute: true,
            courseSlotAssignment: {
                select: { course: { select: { code: true, name: true } } },
            },
        },
    })

    const impacts = []
    for (const booking of bookings) {
        const effective = bookingDays.get(booking.id)
        if (!effective) continue
        const conflicts = occupancies.filter(
            (occupancy) =>
                occupancy.roomId === booking.roomId &&
                occupancy.dayOfWeek === effective &&
                occupancy.startMinute < booking.endMinute &&
                occupancy.endMinute > booking.startMinute
        )
        if (conflicts.length) {
            impacts.push({
                bookingId: booking.id,
                title: booking.title,
                date: formatDateOnly(booking.bookingDate),
                startMinute: booking.startMinute,
                endMinute: booking.endMinute,
                requester: booking.requester,
                room: booking.room,
                academicConflicts: conflicts.map((item) => ({
                    occupancyId: item.id,
                    courseCode: item.courseSlotAssignment.course.code,
                    courseName: item.courseSlotAssignment.course.name,
                    startMinute: item.startMinute,
                    endMinute: item.endMinute,
                })),
            })
        }
    }
    return impacts
}

async function termOrThrow(db, id) {
    const term = await db.academicTerm.findUnique({
        where: { id },
        select: {
            id: true,
            termCode: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
        },
    })
    if (!term) {
        throw new ApiError(404, "Academic term was not found", {
            code: "ACADEMIC_TERM_NOT_FOUND",
        })
    }
    return term
}

export function setCurrentTerm(id) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const term = await termOrThrow(tx, id)
        if (term.status !== "PLANNED") {
            throw new ApiError(409, "Only a planned term can become current", {
                code: "INVALID_TERM_TRANSITION",
            })
        }

        const impacts = await findApprovedBookingImpacts(tx, {
            term: { ...term, status: "CURRENT" },
            startDate: term.startDate,
            endDate: term.endDate,
        })
        if (impacts.length) {
            throw new ApiError(
                409,
                "This term cannot become current until conflicting approved events are resolved",
                { code: "TERM_ACTIVATION_EVENT_IMPACT", details: { impacts } }
            )
        }

        await tx.academicTerm.updateMany({
            where: { status: "CURRENT" },
            data: { status: "CLOSED" },
        })
        return tx.academicTerm.update({
            where: { id },
            data: { status: "CURRENT" },
            select: termSelect,
        })
    })
}

export function closeTerm(id) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const term = await termOrThrow(tx, id)
        if (term.status !== "CURRENT") {
            throw new ApiError(409, "Only the current term can be closed", {
                code: "INVALID_TERM_TRANSITION",
            })
        }
        return tx.academicTerm.update({
            where: { id },
            data: { status: "CLOSED" },
            select: termSelect,
        })
    })
}

export async function listExceptions({
    page,
    pageSize,
    academicTermId,
    exceptionType,
    isActive,
    dateFrom,
    dateTo,
}) {
    const where = {
        ...(academicTermId ? { academicTermId } : {}),
        ...(exceptionType ? { exceptionType } : {}),
        ...(isActive === undefined ? {} : { isActive }),
        ...(dateFrom || dateTo
            ? {
                  startDate: {
                      ...(dateTo ? { lte: parseDateOnly(dateTo) } : {}),
                  },
                  endDate: {
                      ...(dateFrom ? { gte: parseDateOnly(dateFrom) } : {}),
                  },
              }
            : {}),
    }
    const [records, total] = await prisma.$transaction([
        prisma.calendarException.findMany({
            where,
            select: exceptionSelect,
            orderBy: [{ startDate: "desc" }, { id: "desc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.calendarException.count({ where }),
    ])
    return { records, pagination: pagination(page, pageSize, total) }
}

async function validateExceptionCandidate(
    db,
    candidate,
    excludeExceptionId = null
) {
    const term = await termOrThrow(db, candidate.academicTermId)
    if (term.status === "CLOSED") {
        throw new ApiError(
            409,
            "Calendar exceptions cannot be changed for a closed term",
            { code: "ACADEMIC_TERM_CLOSED" }
        )
    }
    if (
        candidate.startDate < term.startDate ||
        candidate.endDate > term.endDate
    ) {
        throw new ApiError(
            400,
            "Calendar exception dates must be inside the academic term",
            { code: "EXCEPTION_OUTSIDE_TERM" }
        )
    }
    const overlap = await db.calendarException.findFirst({
        where: {
            academicTermId: term.id,
            isActive: true,
            startDate: { lte: candidate.endDate },
            endDate: { gte: candidate.startDate },
            ...(excludeExceptionId ? { id: { not: excludeExceptionId } } : {}),
        },
        select: { id: true, name: true, startDate: true, endDate: true },
    })
    if (overlap) {
        throw new ApiError(
            409,
            `The dates overlap active calendar exception "${overlap.name}"`,
            { code: "CALENDAR_EXCEPTION_OVERLAP" }
        )
    }
    return term
}

async function prepareExceptionChange(
    db,
    { operation, exceptionId, candidate }
) {
    let existing = null
    if (exceptionId) {
        existing = await db.calendarException.findUnique({
            where: { id: exceptionId },
            select: {
                id: true,
                academicTermId: true,
                name: true,
                exceptionType: true,
                startDate: true,
                endDate: true,
                targetDayOfWeek: true,
                isActive: true,
            },
        })
        if (!existing) {
            throw new ApiError(404, "Calendar exception was not found", {
                code: "CALENDAR_EXCEPTION_NOT_FOUND",
            })
        }
        if (!existing.isActive) {
            throw new ApiError(409, "Calendar exception is already inactive", {
                code: "CALENDAR_EXCEPTION_INACTIVE",
            })
        }
    }

    const storedCandidate = candidate ? candidateToStored(candidate) : null
    if (
        existing &&
        storedCandidate &&
        existing.academicTermId !== storedCandidate.academicTermId
    ) {
        throw new ApiError(
            400,
            "A calendar exception cannot be moved to another academic term",
            { code: "EXCEPTION_TERM_CHANGE_FORBIDDEN" }
        )
    }

    const termId = storedCandidate?.academicTermId || existing?.academicTermId
    const term = storedCandidate
        ? await validateExceptionCandidate(
              db,
              storedCandidate,
              operation === "UPDATE" ? exceptionId : null
          )
        : await termOrThrow(db, termId)
    if (term.status === "CLOSED") {
        throw new ApiError(
            409,
            "Calendar exceptions cannot be changed for a closed term",
            { code: "ACADEMIC_TERM_CLOSED" }
        )
    }

    const rangeStarts = [
        existing?.startDate,
        storedCandidate?.startDate,
    ].filter(Boolean)
    const rangeEnds = [existing?.endDate, storedCandidate?.endDate].filter(
        Boolean
    )
    const startDate = new Date(
        Math.min(...rangeStarts.map((date) => date.getTime()))
    )
    const endDate = new Date(
        Math.max(...rangeEnds.map((date) => date.getTime()))
    )
    const impacts = await findApprovedBookingImpacts(db, {
        term,
        startDate,
        endDate,
        candidate: operation === "DEACTIVATE" ? null : storedCandidate,
        excludeExceptionId: existing?.id || null,
    })

    return { existing, candidate: storedCandidate, term, impacts }
}

export function previewExceptionImpact(change) {
    return prepareExceptionChange(prisma, change).then(({ impacts }) => ({
        impacts,
    }))
}

function rejectImpactedChange(impacts) {
    if (impacts.length) {
        throw new ApiError(
            409,
            "Calendar change would conflict with approved event bookings",
            {
                code: "CALENDAR_EVENT_IMPACT_REQUIRES_DECISIONS",
                details: { impacts },
            }
        )
    }
}

export function createException(data, actorUserId) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const prepared = await prepareExceptionChange(tx, {
            operation: "CREATE",
            candidate: data,
        })
        rejectImpactedChange(prepared.impacts)
        return tx.calendarException.create({
            data: { ...prepared.candidate, createdByUserId: actorUserId },
            select: exceptionSelect,
        })
    })
}

export function updateException(id, data, actorUserId) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const prepared = await prepareExceptionChange(tx, {
            operation: "UPDATE",
            exceptionId: id,
            candidate: data,
        })
        rejectImpactedChange(prepared.impacts)
        return tx.calendarException.update({
            where: { id },
            data: { ...prepared.candidate, updatedByUserId: actorUserId },
            select: exceptionSelect,
        })
    })
}

export function deactivateException(id, actorUserId) {
    return prisma.$transaction(async (tx) => {
        await acquireOccupancyLock(tx)
        const prepared = await prepareExceptionChange(tx, {
            operation: "DEACTIVATE",
            exceptionId: id,
        })
        rejectImpactedChange(prepared.impacts)
        return tx.calendarException.update({
            where: { id },
            data: {
                isActive: false,
                deactivatedAt: new Date(),
                updatedByUserId: actorUserId,
            },
            select: exceptionSelect,
        })
    })
}
