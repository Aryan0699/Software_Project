import { download, queryString, request, type Pagination, type Role } from "./api"

export type BookingStatus =
    | "PENDING_FACULTY"
    | "PENDING_INSTITUTIONAL"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"

export type BookingEventType =
    | "ACADEMIC"
    | "CLUB"
    | "MEETING"
    | "WORKSHOP"
    | "SEMINAR"
    | "OTHER"

export type ReviewerKind = "FACULTY" | "INSTITUTIONAL"
export type ApprovalStatus =
    | "NOT_STARTED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CLOSED"

export type BookingPerson = {
    id: string
    name: string
    email?: string
    role?: Role
}

export type BookingRoom = {
    id: string
    fullCode: string
    displayName: string | null
    capacity: number | null
    isAccessible: boolean
    features: string[]
    status: "ACTIVE" | "INACTIVE"
    building: { id: string; code: string; name: string; isActive: boolean }
    roomType: { id: string; code: string; name: string } | null
}

export type BookingApproval = {
    id: string
    bookingRequestId: string
    reviewerKind: ReviewerKind
    reviewerLabel: string
    reviewerUserId: string
    status: Exclude<ApprovalStatus, "NOT_STARTED">
    decisionNote: string | null
    assignedAt: string
    decidedAt: string | null
    closedAt: string | null
    reviewer: BookingPerson
}

export type WorkflowTask = {
    kind: ReviewerKind
    label: string
    status: ApprovalStatus
    approvalId: string | null
    reviewer: BookingPerson | null
    decisionNote: string | null
    assignedAt: string | null
    decidedAt: string | null
    closedAt: string | null
}

export type BookingAction = {
    id: string
    actionType: string
    previousStatus: BookingStatus | null
    newStatus: BookingStatus | null
    note: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
    performedBy: BookingPerson | null
}

export type BookingRequest = {
    id: string
    requesterUserId: string
    requesterRoleSnapshot: Role
    roomId: string
    bookingDate: string
    startMinute: number
    endMinute: number
    title: string
    purpose: string
    eventType: BookingEventType
    expectedParticipants: number | null
    requiredFeatures: string[]
    specialRequirements: string | null
    status: BookingStatus
    statusReason: string | null
    submittedAt: string
    approvedAt: string | null
    rejectedAt: string | null
    cancelledAt: string | null
    cancelledByUserId: string | null
    cancellationReason: string | null
    version: number
    requester: BookingPerson
    room: BookingRoom
    approvals: BookingApproval[]
    actions: BookingAction[]
    capacityUnverified: boolean
    pendingCompetitorCount: number
    workflow: Array<{ key: string; label: string; tasks: WorkflowTask[] }>
}

export type BookingRequestSummary = Pick<
    BookingRequest,
    | "id"
    | "requesterUserId"
    | "requesterRoleSnapshot"
    | "roomId"
    | "bookingDate"
    | "startMinute"
    | "endMinute"
    | "title"
    | "status"
    | "statusReason"
    | "submittedAt"
    | "version"
    | "requester"
    | "capacityUnverified"
    | "pendingCompetitorCount"
> & {
    room: Pick<BookingRoom, "id" | "fullCode" | "displayName" | "capacity"> & {
        building: Pick<BookingRoom["building"], "id" | "code" | "name">
    }
}

export type FacultyVerifier = {
    id: string
    name: string
    email: string
    facultyProfile: {
        designation: string | null
        department: { id: string; code: string; name: string } | null
    }
}

export type ApprovalQueueItem = {
    id: string
    reviewerKind: ReviewerKind
    reviewerLabel: string
    status: Exclude<ApprovalStatus, "NOT_STARTED">
    decisionNote: string | null
    assignedAt: string
    decidedAt: string | null
    closedAt: string | null
    reviewer: BookingPerson
    request: BookingRequestSummary
}

export type FinalizationPreview = {
    requiresFinalizationConfirmation: boolean
    requestVersion: number
    competitors: Array<{
        id: string
        title: string
        status: BookingStatus
        submittedAt: string
        startMinute: number
        endMinute: number
        version: number
        requester: { id: string; name: string }
    }>
    systemReason: string
}

export type CreateBookingInput = {
    clientRequestId: string
    roomId: string
    bookingDate: string
    startMinute: number
    endMinute: number
    title: string
    purpose: string
    eventType: BookingEventType
    expectedParticipants?: number
    requiredFeatures: string[]
    specialRequirements?: string
    facultyVerifierUserId?: string
    acknowledgePendingCompetition: boolean
}

export type BookingListFilters = {
    status?: BookingStatus
    search?: string
    dateFrom?: string
    dateTo?: string
    buildingId?: string
    roomId?: string
    requester?: string
}

export type BookingFilterOptions = {
    buildings: Array<{ id: string; code: string; name: string }>
    rooms: Array<{
        id: string
        fullCode: string
        building: { id: string; code: string; name: string }
    }>
    requesters: BookingPerson[]
}

export type BookingDashboard = {
    counts: Partial<Record<BookingStatus, number>>
    upcoming: BookingRequestSummary[]
    pendingReviewCount: number
    unreadCount: number
    activeApproverCount: number
}

export const bookingApi = {
    facultyVerifiers(
        values: { search?: string; page?: number; pageSize?: number } = {}
    ) {
        return request<{ records: FacultyVerifier[]; pagination: Pagination }>(
            `/booking-requests/faculty-verifiers${queryString(values)}`
        )
    },
    create(input: CreateBookingInput) {
        return request<{ request: BookingRequest }>("/booking-requests", {
            method: "POST",
            body: JSON.stringify(input),
        })
    },
    list(values: BookingListFilters & { page?: number; pageSize?: number } = {}) {
        return request<{
            records: BookingRequestSummary[]
            pagination: Pagination
        }>(`/booking-requests${queryString(values)}`)
    },
    get(id: string) {
        return request<{ request: BookingRequest }>(`/booking-requests/${id}`)
    },
    filterOptions() {
        return request<{ options: BookingFilterOptions }>(
            "/booking-requests/filter-options"
        )
    },
    dashboard() {
        return request<{ dashboard: BookingDashboard }>(
            "/booking-requests/dashboard"
        )
    },
    cancel(id: string, reason: string) {
        return request<{ request: BookingRequest }>(
            `/booking-requests/${id}/cancel`,
            { method: "POST", body: JSON.stringify({ reason }) }
        )
    },
    export(filters: BookingListFilters) {
        return download(
            `/booking-requests/export${queryString(filters)}`,
            `uras-bookings-${new Date().toISOString().slice(0, 10)}.csv`
        )
    },
    approvals(values: {
        view: "pending" | "completed"
        search?: string
        page?: number
        pageSize?: number
    }) {
        return request<{
            records: ApprovalQueueItem[]
            pagination: Pagination
        }>(`/approvals/me${queryString(values)}`)
    },
    finalizationPreview(approvalId: string) {
        return request<{ preview: FinalizationPreview }>(
            `/approvals/${approvalId}/finalization-preview`
        )
    },
    decide(
        approvalId: string,
        input: {
            decision: "APPROVE" | "REJECT"
            note?: string
            expectedRequestVersion: number
            expectedCompetitorIds?: string[]
            sharedConflictNote?: string
        }
    ) {
        return request<{
            approval: ApprovalQueueItem
            request: BookingRequest
        }>(`/approvals/${approvalId}/decision`, {
            method: "POST",
            body: JSON.stringify(input),
        })
    },
}
