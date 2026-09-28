import { queryString, request, type BasicUser, type Pagination } from "./api"

export type SlotGridStatus = "DRAFT" | "LOCKED" | "DISCARDED"
export type SlotKind = "LECTURE" | "LAB" | "TUTORIAL" | "SPECIAL"
export type SlotDay =
    | "SUNDAY"
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"

export type SlotOccurrence = {
    id: string
    dayOfWeek: SlotDay
    startMinute: number
    endMinute: number
}

export type Slot = {
    id: string
    code: string
    slotKind: SlotKind
    createdAt: string
    occurrences: SlotOccurrence[]
}

export type GridVersionSummary = {
    id: string
    versionNumber: number
    status: SlotGridStatus
    basedOnVersionId: string | null
    createdAt: string
    lockedAt: string | null
    discardedAt: string | null
    _count: { slots: number; imports: number }
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
    gridVersions: GridVersionSummary[]
    _count: { imports: number }
}

type OverlapOccurrence = Omit<SlotOccurrence, "id"> & {
    id: string
    slotId: string
    slotCode: string
}

export type GridOverlap = {
    first: OverlapOccurrence
    second: OverlapOccurrence
}

export type SlotGrid = Omit<GridVersionSummary, "_count"> & {
    slotSystemId: string
    slotSystem: Pick<SlotSystem, "id" | "code" | "name" | "isActive">
    createdBy: Pick<BasicUser, "id" | "name" | "email"> | null
    slots: Slot[]
    overlaps: GridOverlap[]
    _count: { imports: number }
}

export type SlotSystemInput = {
    code: string
    name: string
    description?: string | null
    applicableFor?: string | null
}

export type SlotInput = {
    code: string
    slotKind: SlotKind
    occurrences: Array<{
        dayOfWeek: SlotDay
        startMinute: number
        endMinute: number
    }>
}

export const slotSystemsApi = {
    list(
        values: {
            page?: number
            pageSize?: number
            search?: string
            isActive?: boolean
        } = {}
    ) {
        return request<{ records: SlotSystem[]; pagination: Pagination }>(
            `/slot-systems${queryString(values)}`
        )
    },
    create(data: SlotSystemInput) {
        return request<{ slotSystem: SlotSystem }>("/slot-systems", {
            method: "POST",
            body: JSON.stringify(data),
        })
    },
    update(
        id: string,
        changes: Partial<SlotSystemInput & { isActive: boolean }>
    ) {
        return request<{ slotSystem: SlotSystem }>(`/slot-systems/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        })
    },
    getGrid(systemId: string, gridId: string) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/${systemId}/grid-versions/${gridId}`
        )
    },
    createGrid(systemId: string, basedOnVersionId?: string) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/${systemId}/grid-versions`,
            {
                method: "POST",
                body: JSON.stringify({
                    ...(basedOnVersionId ? { basedOnVersionId } : {}),
                }),
            }
        )
    },
    activateInitialGrid(systemId: string, gridId: string) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/${systemId}/grid-versions/${gridId}/activate`,
            { method: "POST" }
        )
    },
    discardGrid(systemId: string, gridId: string) {
        return request<{ grid: SlotGrid }>(
            `/slot-systems/${systemId}/grid-versions/${gridId}/discard`,
            { method: "POST" }
        )
    },
    createSlot(systemId: string, gridId: string, data: SlotInput) {
        return request<{ slot: Slot; grid: SlotGrid }>(
            `/slot-systems/${systemId}/grid-versions/${gridId}/slots`,
            { method: "POST", body: JSON.stringify(data) }
        )
    },
    updateSlot(
        systemId: string,
        gridId: string,
        slotId: string,
        data: SlotInput
    ) {
        return request<{ slot: Slot; grid: SlotGrid }>(
            `/slot-systems/${systemId}/grid-versions/${gridId}/slots/${slotId}`,
            { method: "PUT", body: JSON.stringify(data) }
        )
    },
    deleteSlot(systemId: string, gridId: string, slotId: string) {
        return request<null>(
            `/slot-systems/${systemId}/grid-versions/${gridId}/slots/${slotId}`,
            { method: "DELETE" }
        )
    },
}
