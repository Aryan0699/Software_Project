import {
    queryString,
    request,
    type Building,
    type DayOfWeek,
    type Pagination,
    type Room,
    type RoomTypeRecord,
} from "./api"

export type AvailabilitySource =
    | "BUILDING_INACTIVE"
    | "ROOM_INACTIVE"
    | "ACADEMIC_TIMETABLE"
    | "ROOM_RESTRICTION"
    | "APPROVED_BOOKING"
    | "PENDING_REQUEST"

export type AvailabilityInterval = {
    source: AvailabilitySource
    startMinute: number
    endMinute: number
    label: string
}

export type AvailabilityRoom = Omit<
    Room,
    | "buildingId"
    | "roomTypeId"
    | "createdAt"
    | "updatedAt"
    | "notes"
    | "building"
    | "roomType"
> & {
    building: Pick<Building, "id" | "code" | "name" | "location" | "isActive">
    roomType: Pick<RoomTypeRecord, "id" | "code" | "name" | "isActive"> | null
}

export type RoomAvailabilityRecord = {
    room: AvailabilityRoom
    isAvailable: boolean | null
    blockingConflicts: AvailabilityInterval[]
    pendingWarnings: AvailabilityInterval[]
    pendingRequestCount: number
}

export type AcademicContext = {
    mode: "OUTSIDE_TERM" | "NORMAL_DAY" | "NO_CLASSES" | "FOLLOW_DAY"
    dayOfWeek: DayOfWeek | null
    term: { id: string; termCode: string; name: string } | null
    exception: { name: string; type: "NO_CLASSES" | "FOLLOW_DAY" } | null
}

export type AvailabilitySearch = {
    date: string
    startMinute: number | null
    endMinute: number | null
    records: RoomAvailabilityRecord[]
    summary: {
        suitableRooms: number
        availableRooms: number | null
        unavailableRooms: number | null
        roomsWithPendingRequests: number | null
    }
    academicContext: AcademicContext | null
    pagination: Pagination
}

export type RoomTimeline = RoomAvailabilityRecord & {
    date: string
    academicContext: AcademicContext
}

export type AvailabilityTimelineConfig = {
    date: string
    windowStartMinute: number
    windowEndMinute: number
    minimumDurationMinutes: number
    selectionStepMinutes: number
    defaultDurationMinutes: number
}

export type AvailabilitySearchParams = {
    date: string
    startMinute?: number
    endMinute?: number
    page?: number
    pageSize?: number
    search?: string
    buildingId?: string
    roomTypeId?: string
    minCapacity?: number
    isAccessible?: boolean
    availableOnly?: boolean
    features?: string
}

export const availabilityApi = {
    timelineConfig(date: string) {
        return request<AvailabilityTimelineConfig>(
            `/availability/timeline-config${queryString({ date })}`
        )
    },
    search(values: AvailabilitySearchParams) {
        return request<AvailabilitySearch>(
            `/availability/rooms${queryString(values)}`
        )
    },
    timeline(roomId: string, date: string) {
        return request<{ timeline: RoomTimeline }>(
            `/availability/rooms/${roomId}/timeline${queryString({ date })}`
        )
    },
}
