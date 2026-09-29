import { useQuery } from "@tanstack/react-query"
import {
    Accessibility,
    AlertTriangle,
    Building2,
    ChevronDown,
    ChevronUp,
    DoorOpen,
    Loader2,
    Search,
    UsersRound,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
    availabilityApi,
    type AvailabilitySearchParams,
} from "../lib/availabilityApi"
import { facilitiesApi } from "../lib/api"
import { PaginationBar } from "./access/shared"
import { RoomTimeline } from "./availability/RoomTimeline"

type SearchDraft = {
    date: string
    search: string
    buildingId: string
    roomTypeId: string
    minCapacity: string
    isAccessible: boolean
    features: string
}

function institutionDate() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date())
    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value])
    )
    return values.year + "-" + values.month + "-" + values.day
}

const initialDraft: SearchDraft = {
    date: institutionDate(),
    search: "",
    buildingId: "",
    roomTypeId: "",
    minCapacity: "",
    isAccessible: false,
    features: "",
}

function toCriteria(draft: SearchDraft, page = 1): AvailabilitySearchParams {
    return {
        date: draft.date,
        page,
        pageSize: 20,
        search: draft.search.trim() || undefined,
        buildingId: draft.buildingId || undefined,
        roomTypeId: draft.roomTypeId || undefined,
        minCapacity: draft.minCapacity ? Number(draft.minCapacity) : undefined,
        isAccessible: draft.isAccessible || undefined,
        features: draft.features.trim() || undefined,
    }
}

export function AvailabilityPage() {
    const navigate = useNavigate()
    const [draft, setDraft] = useState<SearchDraft>(initialDraft)
    const [criteria, setCriteria] = useState<AvailabilitySearchParams>(() =>
        toCriteria(initialDraft)
    )
    const [hasSearched, setHasSearched] = useState(false)
    const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null)

    const optionsQuery = useQuery({
        queryKey: ["availability-options"],
        queryFn: async () => {
            const [buildings, roomTypes] = await Promise.all([
                facilitiesApi.listBuildings({ pageSize: 100, isActive: true }),
                facilitiesApi.listRoomTypes({ pageSize: 100, isActive: true }),
            ])
            return {
                buildings: buildings.records,
                roomTypes: roomTypes.records,
            }
        },
    })

    const availabilityQuery = useQuery({
        queryKey: ["room-discovery", criteria],
        queryFn: () => availabilityApi.search(criteria),
        enabled: hasSearched,
    })

    const timelineConfigQuery = useQuery({
        queryKey: ["availability-timeline-config", criteria.date],
        queryFn: () => availabilityApi.timelineConfig(criteria.date),
        enabled: Boolean(expandedRoomId),
        refetchInterval: expandedRoomId ? 60_000 : false,
    })

    const timelineQuery = useQuery({
        queryKey: ["room-timeline", expandedRoomId, criteria.date],
        queryFn: () => availabilityApi.timeline(expandedRoomId!, criteria.date),
        enabled: Boolean(expandedRoomId),
        refetchInterval: expandedRoomId ? 60_000 : false,
    })

    const submit = (event: FormEvent) => {
        event.preventDefault()
        setExpandedRoomId(null)
        setCriteria(toCriteria(draft))
        setHasSearched(true)
    }

    const records = availabilityQuery.data?.records || []

    return (
        <div className="space-y-6">
            <header>
                <h1 className="page-title">Book a room</h1>
                <p className="page-subtitle">
                    Choose a suitable room and an available time to submit a
                    booking request.
                </p>
            </header>

            <form
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                onSubmit={submit}
            >
                <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label>
                        <span className="field-label">Date</span>
                        <input
                            className="field-input"
                            type="date"
                            required
                            min={institutionDate()}
                            value={draft.date}
                            onChange={(event) => {
                                setHasSearched(false)
                                setExpandedRoomId(null)
                                setDraft((value) => ({
                                    ...value,
                                    date: event.target.value,
                                }))
                            }}
                        />
                    </label>
                    <label>
                        <span className="field-label">People</span>
                        <input
                            className="field-input"
                            type="number"
                            min="1"
                            placeholder="Any capacity"
                            value={draft.minCapacity}
                            onChange={(event) =>
                                setDraft((value) => ({
                                    ...value,
                                    minCapacity: event.target.value,
                                }))
                            }
                        />
                    </label>
                    <label>
                        <span className="field-label">Building</span>
                        <select
                            className="field-select"
                            value={draft.buildingId}
                            onChange={(event) =>
                                setDraft((value) => ({
                                    ...value,
                                    buildingId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Any building</option>
                            {optionsQuery.data?.buildings.map((building) => (
                                <option key={building.id} value={building.id}>
                                    {building.code} · {building.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="flex items-end">
                        <button type="submit" className="button-primary w-full">
                            <Search className="size-4" /> Search rooms
                        </button>
                    </div>
                </div>

                <details className="border-t border-slate-200 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">
                        More filters
                    </summary>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label>
                            <span className="field-label">
                                Room or building
                            </span>
                            <input
                                className="field-input"
                                placeholder="Search by name or code"
                                value={draft.search}
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        search: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            <span className="field-label">Room type</span>
                            <select
                                className="field-select"
                                value={draft.roomTypeId}
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        roomTypeId: event.target.value,
                                    }))
                                }
                            >
                                <option value="">Any type</option>
                                {optionsQuery.data?.roomTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="field-label">
                                Required features
                            </span>
                            <input
                                className="field-input"
                                placeholder="Projector, microphones"
                                value={draft.features}
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        features: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="flex min-h-10 items-center gap-2 self-end rounded-md border border-slate-200 px-3">
                            <input
                                type="checkbox"
                                checked={draft.isAccessible}
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        isAccessible: event.target.checked,
                                    }))
                                }
                            />
                            <Accessibility className="size-4 text-slate-500" />
                            <span className="text-sm text-slate-700">
                                Accessible rooms only
                            </span>
                        </label>
                    </div>
                </details>
            </form>

            {!hasSearched ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                    <DoorOpen className="mx-auto size-7 text-slate-400" />
                    <p className="mt-3 font-medium text-slate-800">
                        Search to see matching rooms
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        Time selection appears after you open a room.
                    </p>
                </div>
            ) : availabilityQuery.isLoading ? (
                <div className="flex min-h-52 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
                    <Loader2 className="mr-2 size-4 animate-spin" /> Finding
                    rooms
                </div>
            ) : availabilityQuery.isError ? (
                <div className="inline-alert border-red-200 bg-red-50 text-red-700">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {availabilityQuery.error.message}
                </div>
            ) : availabilityQuery.data ? (
                <section className="space-y-4">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            {availabilityQuery.data.summary.suitableRooms}{" "}
                            matching room
                            {availabilityQuery.data.summary.suitableRooms === 1
                                ? ""
                                : "s"}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {criteria.date} · Open a room to view availability.
                        </p>
                    </div>

                    {records.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                            <DoorOpen className="mx-auto size-7 text-slate-400" />
                            <p className="mt-3 font-medium text-slate-800">
                                No matching rooms
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Remove one of the optional filters and try
                                again.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {records.map((record) => {
                                const expanded =
                                    expandedRoomId === record.room.id
                                return (
                                    <article
                                        key={record.room.id}
                                        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                                    >
                                        <button
                                            type="button"
                                            className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-slate-50 sm:p-5"
                                            onClick={() =>
                                                setExpandedRoomId(
                                                    expanded
                                                        ? null
                                                        : record.room.id
                                                )
                                            }
                                            aria-expanded={expanded}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900">
                                                        {record.room.fullCode}
                                                    </h3>
                                                    {record.room.status !==
                                                        "ACTIVE" ||
                                                    !record.room.building
                                                        .isActive ? (
                                                        <span className="status-badge border-red-200 bg-red-50 text-red-700">
                                                            Unavailable
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    {record.room.displayName ||
                                                        record.room.building
                                                            .name}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Building2 className="size-3.5" />
                                                        {
                                                            record.room.building
                                                                .name
                                                        }
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <UsersRound className="size-3.5" />
                                                        {record.room.capacity ??
                                                            "Unknown capacity"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <DoorOpen className="size-3.5" />
                                                        {record.room.roomType
                                                            ?.name ||
                                                            "Unspecified type"}
                                                    </span>
                                                    {record.room
                                                        .isAccessible ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Accessibility className="size-3.5" />
                                                            Accessible
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {record.room.features.length >
                                                0 ? (
                                                    <p className="mt-2 truncate text-xs text-slate-500">
                                                        {record.room.features
                                                            .slice(0, 4)
                                                            .join(" · ")}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-brand-700">
                                                View availability
                                                {expanded ? (
                                                    <ChevronUp className="size-5 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="size-5 text-slate-400" />
                                                )}
                                            </span>
                                        </button>
                                        {expanded ? (
                                            <RoomTimeline
                                                timeline={
                                                    timelineQuery.data?.timeline
                                                }
                                                config={
                                                    timelineConfigQuery.data
                                                }
                                                loading={
                                                    timelineQuery.isLoading ||
                                                    timelineConfigQuery.isLoading
                                                }
                                                error={
                                                    timelineQuery.error
                                                        ?.message ||
                                                    timelineConfigQuery.error
                                                        ?.message
                                                }
                                                onRequest={(
                                                    startMinute,
                                                    endMinute
                                                ) =>
                                                    navigate(
                                                        `/bookings/new?${new URLSearchParams(
                                                            {
                                                                roomId: record
                                                                    .room.id,
                                                                date: criteria.date,
                                                                startMinute:
                                                                    String(
                                                                        startMinute
                                                                    ),
                                                                endMinute:
                                                                    String(
                                                                        endMinute
                                                                    ),
                                                            }
                                                        ).toString()}`
                                                    )
                                                }
                                            />
                                        ) : null}
                                    </article>
                                )
                            })}
                        </div>
                    )}

                    <div className="rounded-lg border border-slate-200 bg-white">
                        <PaginationBar
                            pagination={availabilityQuery.data.pagination}
                            onPage={(page) => {
                                setExpandedRoomId(null)
                                setCriteria((value) => ({ ...value, page }))
                            }}
                        />
                    </div>
                </section>
            ) : null}
        </div>
    )
}
