export type Role = "STUDENT" | "FACULTY" | "STAFF" | "ADMIN"
export type RoomStatus = "ACTIVE" | "INACTIVE"
export type RestrictionStatus = "ACTIVE" | "CANCELLED"
export type AcademicTermStatus = "PLANNED" | "CURRENT" | "CLOSED"
export type CalendarExceptionType = "NO_CLASSES" | "FOLLOW_DAY"
export type DayOfWeek =
    | "SUNDAY"
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"

export type SlotKind = "LECTURE" | "LAB" | "TUTORIAL" | "SPECIAL"
export type SlotGridStatus = "DRAFT" | "LOCKED" | "DISCARDED"

export type SlotOccurrence = {
    id: string
    slotId: string
    dayOfWeek: DayOfWeek
    startMinute: number
    endMinute: number
}

export type SlotDefinition = {
    id: string
    slotGridVersionId: string
    code: string
    slotKind: SlotKind
    occurrences: SlotOccurrence[]
}

export type SlotGridSummary = {
    id: string
    versionNumber: number
    status: SlotGridStatus
    dayStartMinute: number
    dayEndMinute: number
    createdAt: string
    lockedAt: string | null
    basedOnVersionId: string | null
    isPublished: boolean
    _count: { slots: number }
}

export type SlotSystem = {
    id: string
    code: string
    name: string
    description: string | null
    applicableFor: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    gridVersions: SlotGridSummary[]
}

export type SlotGrid = {
    id: string
    slotSystemId: string
    versionNumber: number
    status: SlotGridStatus
    dayStartMinute: number
    dayEndMinute: number
    basedOnVersionId: string | null
    createdAt: string
    lockedAt: string | null
    discardedAt: string | null
    slotSystem: Pick<SlotSystem, "id" | "code" | "name" | "isActive">
    basedOn: Pick<SlotGridSummary, "id" | "versionNumber" | "status"> | null
    slots: SlotDefinition[]
    isPublished: boolean
    publications: Array<{
        id: string
        revisionNumber: number | null
        academicTerm: { id: string; termCode: string; name: string }
    }>
    overlapWarnings: Array<{
        dayOfWeek: DayOfWeek
        first: {
            slotId: string
            slotCode: string
            startMinute: number
            endMinute: number
        }
        second: {
            slotId: string
            slotCode: string
            startMinute: number
            endMinute: number
        }
    }>
}

export type Department = {
    id: string
    code: string
    name: string
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export type RoomTypeRecord = Department

export type StudentProfile = {
    id: string
    userId: string
    rollNumber: string | null
    batchYear: number | null
    departmentId: string | null
    department?: Department | null
}

export type FacultyProfile = {
    id: string
    userId: string
    designation: string | null
    departmentId: string | null
    department?: Department | null
}

export type StaffProfile = {
    id: string
    userId: string
    designation: string | null
}

export type BasicUser = {
    id: string
    name: string
    email: string
    role: Role
    isActive: boolean
    avatarUrl?: string | null
}

export type CurrentUser = BasicUser & {
    lastLoginAt?: string | null
    createdAt?: string
    studentProfile?: StudentProfile | null
    facultyProfile?: FacultyProfile | null
    staffProfile?: StaffProfile | null
    institutionalApprover?: {
        id: string
        title: string
        isActive: boolean
        assignedAt: string
    } | null
    staffBuildings?: Array<{
        assignedAt: string
        building: { id: string; code: string; name: string; isActive: boolean }
    }>
}

export type Pagination = {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

export type ApprovedIdentity = {
    id: string
    email: string
    initialRole: Role
    isActive: boolean
    createdAt: string
    updatedAt: string
    invitedBy: Pick<BasicUser, "id" | "name" | "email"> | null
    registeredUser: BasicUser | null
}

export type AdminUser = CurrentUser & {
    updatedAt: string
    staffBuildings: Array<{
        id: string
        assignedAt: string
        building: { id: string; code: string; name: string; isActive: boolean }
    }>
}

export type InstitutionalApprover = {
    id: string
    title: string
    isActive: boolean
    assignedAt: string
    deactivatedAt: string | null
    updatedAt: string
    user: BasicUser
    assignedBy: Pick<BasicUser, "id" | "name" | "email"> | null
}

export type StaffAssignment = {
    id: string
    assignedAt: string
    building: { id: string; code: string; name: string; isActive: boolean }
    staffUser: BasicUser
    assignedBy: Pick<BasicUser, "id" | "name" | "email"> | null
}

export type AssignmentOptions = {
    buildings: Array<{ id: string; code: string; name: string }>
    staffUsers: Array<Pick<BasicUser, "id" | "name" | "email">>
}

export type Building = {
    id: string
    code: string
    name: string
    location: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    canManageRestrictions?: boolean
    _count: { rooms: number; staffAssignments: number }
}

export type Room = {
    id: string
    buildingId: string
    roomTypeId: string | null
    roomNumber: string
    fullCode: string
    displayName: string | null
    capacity: number | null
    isAccessible: boolean
    features: string[]
    status: RoomStatus
    statusReason: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
    canManageRestrictions?: boolean
    building: Pick<Building, "id" | "code" | "name" | "isActive">
    roomType: RoomTypeRecord | null
}

export type RoomRestriction = {
    id: string
    roomId: string
    restrictionDate: string
    startMinute: number
    endMinute: number
    reason: string
    status: RestrictionStatus
    cancelledAt: string | null
    createdAt: string
    updatedAt: string
    room: {
        id: string
        fullCode: string
        displayName: string | null
        building: Pick<Building, "id" | "code" | "name">
    }
    createdBy: Pick<BasicUser, "id" | "name" | "email"> | null
    cancelledBy: Pick<BasicUser, "id" | "name" | "email"> | null
}

export type AcademicTerm = {
    id: string
    termCode: string
    name: string
    startDate: string
    endDate: string
    status: AcademicTermStatus
    createdAt: string
    updatedAt: string
    _count: {
        calendarExceptions: number
        imports: number
        slotOccupancies: number
    }
}

export type CalendarException = {
    id: string
    academicTermId: string
    name: string
    exceptionType: CalendarExceptionType
    startDate: string
    endDate: string
    targetDayOfWeek: DayOfWeek | null
    isActive: boolean
    deactivatedAt: string | null
    createdAt: string
    updatedAt: string
    academicTerm: Pick<
        AcademicTerm,
        "id" | "termCode" | "name" | "status" | "startDate" | "endDate"
    >
    createdBy: Pick<BasicUser, "id" | "name" | "email"> | null
    updatedBy: Pick<BasicUser, "id" | "name" | "email"> | null
}

export type CalendarExceptionInput = {
    academicTermId: string
    name: string
    exceptionType: CalendarExceptionType
    startDate: string
    endDate: string
    targetDayOfWeek?: DayOfWeek | null
}

export type CalendarImpact = {
    bookingId: string
    title: string
    date: string
    startMinute: number
    endMinute: number
    requester: Pick<BasicUser, "id" | "name" | "email">
    room: {
        id: string
        fullCode: string
        displayName: string | null
        building: Pick<Building, "id" | "code" | "name">
    }
    academicConflicts: Array<{
        occupancyId: string
        courseCode: string
        courseName: string | null
        startMinute: number
        endMinute: number
    }>
}

type ApiEnvelope<T> = {
    success: boolean
    message: string
    data: T
}

type ApiErrorEnvelope = {
    success: false
    error?: { code?: string; message?: string; details?: unknown }
    requestId?: string
}

export class ApiClientError extends Error {
    status: number
    code: string
    details?: unknown

    constructor(
        status: number,
        code: string,
        message: string,
        details?: unknown
    ) {
        super(message)
        this.name = "ApiClientError"
        this.status = status
        this.code = code
        this.details = details
    }
}

const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "")

export async function download(path: string, filename: string) {
    const response = await fetch(`${API_URL}${path}`, {
        credentials: "include",
    })
    if (!response.ok) {
        const payload = (await response
            .json()
            .catch(() => null)) as ApiErrorEnvelope | null
        throw new ApiClientError(
            response.status,
            payload?.error?.code || "REQUEST_FAILED",
            payload?.error?.message || "The download could not be completed",
            payload?.error?.details
        )
    }
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
}

export async function request<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            ...(init.body && !(init.body instanceof FormData)
                ? { "Content-Type": "application/json" }
                : {}),
            ...init.headers,
        },
    })

    const payload = (await response.json().catch(() => null)) as
        | ApiEnvelope<T>
        | ApiErrorEnvelope
        | null

    if (!response.ok) {
        const failure = payload as ApiErrorEnvelope | null
        throw new ApiClientError(
            response.status,
            failure?.error?.code || "REQUEST_FAILED",
            failure?.error?.message || "The request could not be completed",
            failure?.error?.details
        )
    }

    return (payload as ApiEnvelope<T>).data
}

export function queryString(
    values: Record<string, string | number | boolean | undefined>
) {
    const query = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") query.set(key, String(value))
    })
    const encoded = query.toString()
    return encoded ? `?${encoded}` : ""
}

export const authApi = {
    login(email: string, password: string) {
        return request<{ user: BasicUser; expiresAt: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        })
    },
    register(name: string, email: string, password: string) {
        return request<{ user: BasicUser; expiresAt: string }>(
            "/auth/register",
            {
                method: "POST",
                body: JSON.stringify({ name, email, password }),
            }
        )
    },
    google(credential: string) {
        return request<{ user: BasicUser; expiresAt: string }>("/auth/google", {
            method: "POST",
            body: JSON.stringify({ credential }),
        })
    },
    me() {
        return request<{ user: CurrentUser; sessionExpiresAt: string }>(
            "/auth/me"
        )
    },
    logout() {
        return request<null>("/auth/logout", { method: "POST" })
    },
    logoutAll() {
        return request<null>("/auth/logout-all", { method: "POST" })
    },
    setPassword(currentPassword: string | undefined, newPassword: string) {
        return request<{ expiresAt: string }>("/auth/password", {
            method: "PUT",
            body: JSON.stringify({
                ...(currentPassword ? { currentPassword } : {}),
                newPassword,
            }),
        })
    },
    updateProfile(changes: {
        name?: string
        departmentId?: string | null
        rollNumber?: string | null
        batchYear?: number | null
        designation?: string | null
    }) {
        return request<{ user: CurrentUser }>("/auth/profile", {
            method: "PATCH",
            body: JSON.stringify(changes),
        })
    },
}

export const adminAccessApi = {
    listApprovedUsers(values: {
        page?: number
        pageSize?: number
        search?: string
        role?: Role
        isActive?: boolean
    }) {
        return request<{ records: ApprovedIdentity[]; pagination: Pagination }>(
            `/admin/approved-users${queryString(values)}`
        )
    },
    createApprovedUser(email: string, initialRole: Role) {
        return request<{ approvedUser: ApprovedIdentity }>(
            "/admin/approved-users",
            {
                method: "POST",
                body: JSON.stringify({ email, initialRole }),
            }
        )
    },
    updateApprovedUser(
        id: string,
        changes: { initialRole?: Role; isActive?: boolean }
    ) {
        return request<{ approvedUser: ApprovedIdentity }>(
            `/admin/approved-users/${id}`,
            {
                method: "PATCH",
                body: JSON.stringify(changes),
            }
        )
    },
    listUsers(values: {
        page?: number
        pageSize?: number
        search?: string
        role?: Role
        isActive?: boolean
    }) {
        return request<{ records: AdminUser[]; pagination: Pagination }>(
            `/admin/users${queryString(values)}`
        )
    },
    updateUserAccess(id: string, changes: { role?: Role; isActive?: boolean }) {
        return request<{ user: AdminUser }>(`/admin/users/${id}/access`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        })
    },
    updateUserProfile(
        id: string,
        changes: {
            name?: string
            departmentId?: string | null
            rollNumber?: string | null
            batchYear?: number | null
            designation?: string | null
        }
    ) {
        return request<{ user: AdminUser }>(`/admin/users/${id}/profile`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        })
    },
    listInstitutionalApprovers() {
        return request<{ approvers: InstitutionalApprover[] }>(
            "/admin/institutional-approvers"
        )
    },
    getInstitutionalApproverOptions() {
        return request<{
            faculty: Array<Pick<BasicUser, "id" | "name" | "email">>
        }>("/admin/institutional-approver-options")
    },
    createInstitutionalApprover(userId: string, title: string) {
        return request<{ approver: InstitutionalApprover }>(
            "/admin/institutional-approvers",
            { method: "POST", body: JSON.stringify({ userId, title }) }
        )
    },
    updateInstitutionalApprover(
        id: string,
        changes: { title?: string; isActive?: boolean }
    ) {
        return request<{ approver: InstitutionalApprover }>(
            `/admin/institutional-approvers/${id}`,
            { method: "PATCH", body: JSON.stringify(changes) }
        )
    },
    listStaffAssignments(values: { page?: number; pageSize?: number } = {}) {
        return request<{ records: StaffAssignment[]; pagination: Pagination }>(
            `/admin/staff-building-assignments${queryString(values)}`
        )
    },
    getStaffAssignmentOptions() {
        return request<AssignmentOptions>(
            "/admin/staff-building-assignment-options"
        )
    },
    createStaffAssignment(buildingId: string, staffUserId: string) {
        return request<{ assignment: StaffAssignment }>(
            "/admin/staff-building-assignments",
            {
                method: "POST",
                body: JSON.stringify({ buildingId, staffUserId }),
            }
        )
    },
    deleteStaffAssignment(id: string) {
        return request<null>(`/admin/staff-building-assignments/${id}`, {
            method: "DELETE",
        })
    },
}

export const facilitiesApi = {
    listDepartments(
        values: {
            page?: number
            pageSize?: number
            search?: string
            isActive?: boolean
        } = {}
    ) {
        return request<{ records: Department[]; pagination: Pagination }>(
            `/facilities/departments${queryString(values)}`
        )
    },
    createDepartment(code: string, name: string) {
        return request<{ department: Department }>("/facilities/departments", {
            method: "POST",
            body: JSON.stringify({ code, name }),
        })
    },
    updateDepartment(
        id: string,
        changes: Partial<Pick<Department, "code" | "name" | "isActive">>
    ) {
        return request<{ department: Department }>(
            `/facilities/departments/${id}`,
            {
                method: "PATCH",
                body: JSON.stringify(changes),
            }
        )
    },
    listRoomTypes(
        values: {
            page?: number
            pageSize?: number
            search?: string
            isActive?: boolean
        } = {}
    ) {
        return request<{ records: RoomTypeRecord[]; pagination: Pagination }>(
            `/facilities/room-types${queryString(values)}`
        )
    },
    createRoomType(code: string, name: string) {
        return request<{ roomType: RoomTypeRecord }>("/facilities/room-types", {
            method: "POST",
            body: JSON.stringify({ code, name }),
        })
    },
    updateRoomType(
        id: string,
        changes: Partial<Pick<RoomTypeRecord, "code" | "name" | "isActive">>
    ) {
        return request<{ roomType: RoomTypeRecord }>(
            `/facilities/room-types/${id}`,
            {
                method: "PATCH",
                body: JSON.stringify(changes),
            }
        )
    },
    listBuildings(
        values: {
            page?: number
            pageSize?: number
            search?: string
            isActive?: boolean
        } = {}
    ) {
        return request<{ records: Building[]; pagination: Pagination }>(
            `/facilities/buildings${queryString(values)}`
        )
    },
    createBuilding(data: {
        code: string
        name: string
        location?: string | null
    }) {
        return request<{ building: Building }>("/facilities/buildings", {
            method: "POST",
            body: JSON.stringify(data),
        })
    },
    updateBuilding(
        id: string,
        changes: Partial<
            Pick<Building, "code" | "name" | "location" | "isActive">
        >
    ) {
        return request<{ building: Building }>(`/facilities/buildings/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        })
    },
    listRooms(
        values: {
            page?: number
            pageSize?: number
            search?: string
            buildingId?: string
            roomTypeId?: string
            status?: RoomStatus
            minCapacity?: number
            isAccessible?: boolean
        } = {}
    ) {
        return request<{ records: Room[]; pagination: Pagination }>(
            `/facilities/rooms${queryString(values)}`
        )
    },
    createRoom(data: {
        buildingId: string
        roomTypeId?: string | null
        roomNumber: string
        displayName?: string | null
        capacity?: number | null
        isAccessible?: boolean
        features?: string[]
        notes?: string | null
    }) {
        return request<{ room: Room }>("/facilities/rooms", {
            method: "POST",
            body: JSON.stringify(data),
        })
    },
    updateRoom(
        id: string,
        changes: Partial<{
            buildingId: string
            roomTypeId: string | null
            roomNumber: string
            displayName: string | null
            capacity: number | null
            isAccessible: boolean
            features: string[]
            notes: string | null
            status: RoomStatus
            statusReason: string | null
        }>
    ) {
        return request<{ room: Room }>(`/facilities/rooms/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        })
    },
    listRestrictions(
        values: {
            page?: number
            pageSize?: number
            buildingId?: string
            roomId?: string
            status?: RestrictionStatus
            dateFrom?: string
            dateTo?: string
        } = {}
    ) {
        return request<{ records: RoomRestriction[]; pagination: Pagination }>(
            `/facilities/restrictions${queryString(values)}`
        )
    },
    createRestriction(data: {
        roomId: string
        restrictionDate: string
        startMinute: number
        endMinute: number
        reason: string
    }) {
        return request<{ restriction: RoomRestriction }>(
            "/facilities/restrictions",
            {
                method: "POST",
                body: JSON.stringify(data),
            }
        )
    },
    cancelRestriction(id: string) {
        return request<{ restriction: RoomRestriction }>(
            `/facilities/restrictions/${id}/cancel`,
            {
                method: "PATCH",
            }
        )
    },
}

export const academicCalendarApi = {
    listTerms(
        values: {
            page?: number
            pageSize?: number
            search?: string
            status?: AcademicTermStatus
        } = {}
    ) {
        return request<{ records: AcademicTerm[]; pagination: Pagination }>(
            `/academic-calendar/terms${queryString(values)}`
        )
    },
    createTerm(data: {
        termCode: string
        name: string
        startDate: string
        endDate: string
    }) {
        return request<{ term: AcademicTerm }>("/academic-calendar/terms", {
            method: "POST",
            body: JSON.stringify(data),
        })
    },
    updateTerm(
        id: string,
        changes: Partial<
            Pick<AcademicTerm, "termCode" | "name" | "startDate" | "endDate">
        >
    ) {
        return request<{ term: AcademicTerm }>(
            `/academic-calendar/terms/${id}`,
            {
                method: "PATCH",
                body: JSON.stringify(changes),
            }
        )
    },
    setCurrentTerm(id: string) {
        return request<{ term: AcademicTerm }>(
            `/academic-calendar/terms/${id}/set-current`,
            {
                method: "POST",
            }
        )
    },
    closeTerm(id: string) {
        return request<{ term: AcademicTerm }>(
            `/academic-calendar/terms/${id}/close`,
            {
                method: "POST",
            }
        )
    },
    listExceptions(
        values: {
            page?: number
            pageSize?: number
            academicTermId?: string
            exceptionType?: CalendarExceptionType
            isActive?: boolean
            dateFrom?: string
            dateTo?: string
        } = {}
    ) {
        return request<{
            records: CalendarException[]
            pagination: Pagination
        }>(`/academic-calendar/exceptions${queryString(values)}`)
    },
    previewExceptionImpact(data: {
        operation: "CREATE" | "UPDATE" | "DEACTIVATE"
        exceptionId?: string
        candidate?: CalendarExceptionInput
    }) {
        return request<{ impacts: CalendarImpact[] }>(
            "/academic-calendar/exceptions/impact",
            {
                method: "POST",
                body: JSON.stringify(data),
            }
        )
    },
    createException(data: CalendarExceptionInput) {
        return request<{ calendarException: CalendarException }>(
            "/academic-calendar/exceptions",
            {
                method: "POST",
                body: JSON.stringify(data),
            }
        )
    },
    updateException(id: string, data: CalendarExceptionInput) {
        return request<{ calendarException: CalendarException }>(
            `/academic-calendar/exceptions/${id}`,
            { method: "PATCH", body: JSON.stringify(data) }
        )
    },
    deactivateException(id: string) {
        return request<{ calendarException: CalendarException }>(
            `/academic-calendar/exceptions/${id}/deactivate`,
            { method: "PATCH" }
        )
    },
}

export const slotSystemApi = {
    list() {
        return request<{ slotSystems: SlotSystem[] }>("/slot-systems")
    },
    create(data: {
        code: string
        name: string
        description?: string | null
        applicableFor?: string | null
    }) {
        return request<{ slotSystem: SlotSystem }>("/slot-systems", {
            method: "POST",
            body: JSON.stringify(data),
        })
    },
    getGrid(id: string) {
        return request<{ grid: SlotGrid }>(`/slot-systems/grid-versions/${id}`)
    },
    createDraft(
        systemId: string,
        data: {
            sourceGridVersionId?: string
            dayStartMinute: number
            dayEndMinute: number
        }
    ) {
        return request<{ grid: SlotGrid }>(`/slot-systems/${systemId}/drafts`, {
            method: "POST",
            body: JSON.stringify(data),
        })
    },
    updateRange(
        id: string,
        data: { dayStartMinute: number; dayEndMinute: number }
    ) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/grid-versions/${id}/range`,
            {
                method: "PATCH",
                body: JSON.stringify(data),
            }
        )
    },
    createSlot(id: string, data: { code: string; slotKind: SlotKind }) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/grid-versions/${id}/slots`,
            {
                method: "POST",
                body: JSON.stringify(data),
            }
        )
    },
    updateSlot(
        id: string,
        slotId: string,
        data: { code: string; slotKind: SlotKind }
    ) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/grid-versions/${id}/slots/${slotId}`,
            { method: "PATCH", body: JSON.stringify(data) }
        )
    },
    deleteSlot(id: string, slotId: string) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/grid-versions/${id}/slots/${slotId}`,
            { method: "DELETE" }
        )
    },
    toggleCell(
        id: string,
        data: { slotId: string; dayOfWeek: DayOfWeek; startMinute: number }
    ) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/grid-versions/${id}/cells/toggle`,
            { method: "POST", body: JSON.stringify(data) }
        )
    },
    lock(id: string) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/grid-versions/${id}/lock`,
            {
                method: "POST",
            }
        )
    },
    discard(id: string) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/grid-versions/${id}/discard`,
            { method: "POST" }
        )
    },
}

export function errorMessage(error: unknown) {
    if (error instanceof ApiClientError && Array.isArray(error.details)) {
        const messages = error.details
            .map((detail) =>
                typeof detail === "object" &&
                detail !== null &&
                "message" in detail
                    ? String(detail.message)
                    : null
            )
            .filter((message): message is string => Boolean(message))

        if (messages.length > 0) return [...new Set(messages)].join(". ")
    }
    return error instanceof Error
        ? error.message
        : "The request could not be completed"
}
