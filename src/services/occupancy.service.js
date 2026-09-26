import {
    addDays,
    dayOfWeek,
    formatDateOnly,
    institutionNow,
} from "../utils/dateTime.js"

const OCCUPANCY_LOCK_KEY = 864_001n

export async function acquireOccupancyLock(tx) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${OCCUPANCY_LOCK_KEY})::text AS acquired`
}

async function resolveAcademicDay(db, academicTermId, date) {
    const exception = await db.calendarException.findFirst({
        where: {
            academicTermId,
            isActive: true,
            startDate: { lte: date },
            endDate: { gte: date },
        },
        select: { exceptionType: true, targetDayOfWeek: true },
    })

    if (exception?.exceptionType === "NO_CLASSES") return null
    return exception?.targetDayOfWeek || dayOfWeek(date)
}

export async function findIntervalConflicts(
    db,
    { roomId, date, startMinute, endMinute, includeRestrictions = true }
) {
    const academicTerm = await db.academicTerm.findFirst({
        where: {
            status: "CURRENT",
            startDate: { lte: date },
            endDate: { gte: date },
        },
        select: { id: true, termCode: true },
    })

    let academic = []
    if (academicTerm) {
        const effectiveDay = await resolveAcademicDay(db, academicTerm.id, date)
        if (effectiveDay) {
            academic = await db.roomSlotOccupancy.findMany({
                where: {
                    roomId,
                    academicTermId: academicTerm.id,
                    dayOfWeek: effectiveDay,
                    startMinute: { lt: endMinute },
                    endMinute: { gt: startMinute },
                    timetableBatch: { status: "PUBLISHED" },
                },
                select: {
                    id: true,
                    startMinute: true,
                    endMinute: true,
                    courseSlotAssignment: {
                        select: { course: { select: { code: true } } },
                    },
                },
                take: 10,
            })
        }
    }

    const [bookings, restrictions] = await Promise.all([
        db.bookingRequest.findMany({
            where: {
                roomId,
                bookingDate: date,
                status: "APPROVED",
                startMinute: { lt: endMinute },
                endMinute: { gt: startMinute },
            },
            select: {
                id: true,
                title: true,
                bookingDate: true,
                startMinute: true,
                endMinute: true,
            },
            take: 10,
        }),
        includeRestrictions
            ? db.roomRestriction.findMany({
                  where: {
                      roomId,
                      restrictionDate: date,
                      status: "ACTIVE",
                      startMinute: { lt: endMinute },
                      endMinute: { gt: startMinute },
                  },
                  select: {
                      id: true,
                      reason: true,
                      restrictionDate: true,
                      startMinute: true,
                      endMinute: true,
                  },
                  take: 10,
              })
            : Promise.resolve([]),
    ])

    return {
        academic: academic.map((item) => ({
            id: item.id,
            label: item.courseSlotAssignment.course.code,
            date: formatDateOnly(date),
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            termCode: academicTerm?.termCode,
        })),
        bookings: bookings.map((item) => ({
            id: item.id,
            title: item.title,
            date: formatDateOnly(item.bookingDate),
            startMinute: item.startMinute,
            endMinute: item.endMinute,
        })),
        restrictions: restrictions.map((item) => ({
            id: item.id,
            reason: item.reason,
            date: formatDateOnly(item.restrictionDate),
            startMinute: item.startMinute,
            endMinute: item.endMinute,
        })),
    }
}

export async function findRoomDeactivationBlockers(db, roomIds) {
    if (!roomIds.length) return new Map()

    const now = institutionNow()
    const term = await db.academicTerm.findFirst({
        where: { status: "CURRENT", endDate: { gte: now.dateValue } },
        select: { id: true, termCode: true, startDate: true, endDate: true },
    })

    const [bookings, restrictions, occupancies, exceptions] = await Promise.all(
        [
            db.bookingRequest.findMany({
                where: {
                    roomId: { in: roomIds },
                    status: "APPROVED",
                    OR: [
                        { bookingDate: { gt: now.dateValue } },
                        {
                            bookingDate: now.dateValue,
                            endMinute: { gt: now.minute },
                        },
                    ],
                },
                select: {
                    id: true,
                    roomId: true,
                    bookingDate: true,
                    startMinute: true,
                    endMinute: true,
                    title: true,
                },
                orderBy: [{ bookingDate: "asc" }, { startMinute: "asc" }],
            }),
            db.roomRestriction.findMany({
                where: {
                    roomId: { in: roomIds },
                    status: "ACTIVE",
                    OR: [
                        { restrictionDate: { gt: now.dateValue } },
                        {
                            restrictionDate: now.dateValue,
                            endMinute: { gt: now.minute },
                        },
                    ],
                },
                select: {
                    id: true,
                    roomId: true,
                    restrictionDate: true,
                    startMinute: true,
                    endMinute: true,
                    reason: true,
                },
                orderBy: [{ restrictionDate: "asc" }, { startMinute: "asc" }],
            }),
            term
                ? db.roomSlotOccupancy.findMany({
                      where: {
                          roomId: { in: roomIds },
                          academicTermId: term.id,
                          timetableBatch: { status: "PUBLISHED" },
                      },
                      select: {
                          id: true,
                          roomId: true,
                          dayOfWeek: true,
                          startMinute: true,
                          endMinute: true,
                          courseSlotAssignment: {
                              select: { course: { select: { code: true } } },
                          },
                      },
                  })
                : Promise.resolve([]),
            term
                ? db.calendarException.findMany({
                      where: {
                          academicTermId: term.id,
                          isActive: true,
                          endDate: { gte: now.dateValue },
                      },
                      select: {
                          startDate: true,
                          endDate: true,
                          exceptionType: true,
                          targetDayOfWeek: true,
                      },
                  })
                : Promise.resolve([]),
        ]
    )

    const blockers = new Map(roomIds.map((roomId) => [roomId, []]))
    for (const booking of bookings) {
        blockers.get(booking.roomId).push({
            source: "APPROVED_BOOKING",
            id: booking.id,
            date: formatDateOnly(booking.bookingDate),
            startMinute: booking.startMinute,
            endMinute: booking.endMinute,
            label: booking.title,
        })
    }
    for (const restriction of restrictions) {
        blockers.get(restriction.roomId).push({
            source: "ROOM_RESTRICTION",
            id: restriction.id,
            date: formatDateOnly(restriction.restrictionDate),
            startMinute: restriction.startMinute,
            endMinute: restriction.endMinute,
            label: restriction.reason,
        })
    }

    if (term && occupancies.length) {
        const byDay = new Map()
        for (const occupancy of occupancies) {
            const key = occupancy.dayOfWeek
            if (!byDay.has(key)) byDay.set(key, [])
            byDay.get(key).push(occupancy)
        }
        const exceptionFor = (date) =>
            exceptions.find(
                (item) => item.startDate <= date && item.endDate >= date
            )
        const academicRoomsFound = new Set()
        let date =
            term.startDate > now.dateValue ? term.startDate : now.dateValue

        while (
            date <= term.endDate &&
            academicRoomsFound.size < roomIds.length
        ) {
            const exception = exceptionFor(date)
            const effectiveDay =
                exception?.exceptionType === "NO_CLASSES"
                    ? null
                    : exception?.targetDayOfWeek || dayOfWeek(date)
            const matches = effectiveDay ? byDay.get(effectiveDay) || [] : []

            for (const occupancy of matches) {
                if (academicRoomsFound.has(occupancy.roomId)) continue
                if (
                    date.getTime() === now.dateValue.getTime() &&
                    occupancy.endMinute <= now.minute
                ) {
                    continue
                }
                blockers.get(occupancy.roomId).push({
                    source: "ACADEMIC_TIMETABLE",
                    id: occupancy.id,
                    date: formatDateOnly(date),
                    startMinute: occupancy.startMinute,
                    endMinute: occupancy.endMinute,
                    label: occupancy.courseSlotAssignment.course.code,
                    termCode: term.termCode,
                })
                academicRoomsFound.add(occupancy.roomId)
            }
            date = addDays(date, 1)
        }
    }

    return blockers
}
