import { useMutation, useQuery } from "@tanstack/react-query"
import {
    AlertTriangle,
    CalendarPlus,
    ChevronDown,
    ChevronRight,
    Download,
    Loader2,
    Search,
} from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAuth } from "../auth/useAuth"
import { useToast } from "../components/toastContext"
import {
    bookingApi,
    type BookingListFilters,
    type BookingStatus,
} from "../lib/bookingApi"
import { PaginationBar } from "./access/shared"
import {
    bookingStatusClasses,
    bookingStatusLabels,
    bookingTime,
    readableBookingDate,
} from "./booking/shared"

const statusOptions: Array<{ value: BookingStatus | ""; label: string }> = [
    { value: "", label: "All" },
    { value: "PENDING_FACULTY", label: "Pending Faculty" },
    { value: "PENDING_INSTITUTIONAL", label: "Pending Institutional" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
]

function dateBefore(days: number) {
    const value = new Date()
    value.setDate(value.getDate() - days + 1)
    return value.toISOString().slice(0, 10)
}

export function BookingsPage() {
    const { user } = useAuth()
    const { showToast } = useToast()
    const [params, setParams] = useSearchParams()
    const [searchDraft, setSearchDraft] = useState(params.get("search") || "")
    const [moreOpen, setMoreOpen] = useState(false)
    const page = Math.max(1, Number(params.get("page")) || 1)
    const filters = useMemo<BookingListFilters>(
        () => ({
            status: (params.get("status") as BookingStatus | null) || undefined,
            search: params.get("search") || undefined,
            dateFrom: params.get("dateFrom") || undefined,
            dateTo: params.get("dateTo") || undefined,
            buildingId: params.get("buildingId") || undefined,
            roomId: params.get("roomId") || undefined,
            requester: params.get("requester") || undefined,
        }),
        [params]
    )
    const setFilter = (key: string, value?: string) => {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete("page")
        setParams(next)
    }
    const query = useQuery({
        queryKey: ["my-booking-requests", filters, page],
        queryFn: () => bookingApi.list({ ...filters, page, pageSize: 20 }),
    })
    const optionsQuery = useQuery({
        queryKey: ["booking-filter-options"],
        queryFn: bookingApi.filterOptions,
        staleTime: 60_000,
    })
    const exportMutation = useMutation({
        mutationFn: () => bookingApi.export(filters),
        onError: (error) => showToast("error", error.message),
    })
    const canBook = user?.role === "STUDENT" || user?.role === "FACULTY"
    const personalOnly = user?.role === "STUDENT"
    const hasFilters = Object.values(filters).some(Boolean)

    const submitSearch = (event: FormEvent) => {
        event.preventDefault()
        setFilter("search", searchDraft.trim() || undefined)
    }
    const applyDatePreset = (days?: number) => {
        const next = new URLSearchParams(params)
        if (days) {
            next.set("dateFrom", dateBefore(days))
            next.set("dateTo", new Date().toISOString().slice(0, 10))
        } else {
            next.delete("dateFrom")
            next.delete("dateTo")
        }
        next.delete("page")
        setParams(next)
    }

    return (
        <div className="space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="page-title">{personalOnly ? "My Requests" : "Booking History"}</h1>
                    <p className="page-subtitle">
                        {personalOnly
                            ? "See where each room request is in the approval process."
                            : "View booking requests and decisions within your authorized scope."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button type="button" className="button-secondary" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
                        {exportMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export CSV
                    </button>
                    {canBook ? (
                        <Link to="/availability" className="button-primary">
                            <CalendarPlus className="size-4" /> Book a room
                        </Link>
                    ) : null}
                </div>
            </header>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((option) => (
                        <button
                            key={option.value || "all"}
                            type="button"
                            className={`min-h-9 rounded-md border px-3 text-sm font-medium ${
                                (filters.status || "") === option.value
                                    ? "border-brand-600 bg-brand-600 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => setFilter("status", option.value || undefined)}
                        >
                            {option.label}
                        </button>
                    ))}
                    {hasFilters ? (
                        <button type="button" className="button-quiet" onClick={() => { setSearchDraft(""); setParams({}) }}>
                            Reset filters
                        </button>
                    ) : null}
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <form onSubmit={submitSearch} className="flex flex-1 gap-2">
                        <input className="field-input" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search title, requester or room" />
                        <button className="button-secondary" aria-label="Search bookings"><Search className="size-4" /></button>
                    </form>
                    <button type="button" className="button-secondary" onClick={() => setMoreOpen(!moreOpen)}>
                        More filters <ChevronDown className={`size-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>
                {moreOpen ? (
                    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label>
                            <span className="field-label">Date range</span>
                            <select className="field-select" value={filters.dateFrom && filters.dateTo ? "custom" : ""} onChange={(event) => {
                                if (event.target.value === "7") applyDatePreset(7)
                                else if (event.target.value === "30") applyDatePreset(30)
                                else if (!event.target.value) applyDatePreset()
                            }}>
                                <option value="">Any date</option>
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                {filters.dateFrom && filters.dateTo ? <option value="custom">Custom range</option> : null}
                            </select>
                        </label>
                        <label>
                            <span className="field-label">From</span>
                            <input type="date" className="field-input" value={filters.dateFrom || ""} onChange={(event) => setFilter("dateFrom", event.target.value || undefined)} />
                        </label>
                        <label>
                            <span className="field-label">To</span>
                            <input type="date" className="field-input" value={filters.dateTo || ""} min={filters.dateFrom} onChange={(event) => setFilter("dateTo", event.target.value || undefined)} />
                        </label>
                        <label>
                            <span className="field-label">Building</span>
                            <select className="field-select" value={filters.buildingId || ""} onChange={(event) => setFilter("buildingId", event.target.value || undefined)}>
                                <option value="">All buildings</option>
                                {optionsQuery.data?.options.buildings.map((building) => <option key={building.id} value={building.id}>{building.code} - {building.name}</option>)}
                            </select>
                        </label>
                        <label>
                            <span className="field-label">Room</span>
                            <select className="field-select" value={filters.roomId || ""} onChange={(event) => setFilter("roomId", event.target.value || undefined)}>
                                <option value="">All rooms</option>
                                {optionsQuery.data?.options.rooms.filter((room) => !filters.buildingId || room.building.id === filters.buildingId).map((room) => <option key={room.id} value={room.id}>{room.fullCode}</option>)}
                            </select>
                        </label>
                        {!personalOnly ? (
                            <label className="sm:col-span-2">
                                <span className="field-label">Requester</span>
                                <input className="field-input" value={filters.requester || ""} onChange={(event) => setFilter("requester", event.target.value || undefined)} placeholder="Name or email" />
                            </label>
                        ) : null}
                    </div>
                ) : null}
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {query.isLoading ? (
                    <div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Loading requests</div>
                ) : query.error ? (
                    <div className="p-5 text-sm text-red-700">{query.error.message}</div>
                ) : !query.data?.records.length ? (
                    <div className="py-14 text-center">
                        <CalendarPlus className="mx-auto size-7 text-slate-400" />
                        <p className="mt-3 font-medium text-slate-800">{hasFilters ? "No requests match these filters" : personalOnly ? "No room requests yet" : "No booking history in your scope"}</p>
                        {canBook && !hasFilters ? <Link to="/availability" className="button-secondary mt-4 inline-flex">Book a room</Link> : null}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {query.data.records.map((request) => (
                            <Link key={request.id} to={`/bookings/${request.id}`} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50 sm:px-5">
                                <div className="min-w-0">
                                    <h2 className="truncate font-semibold text-slate-900">{request.title}</h2>
                                    <p className="mt-1 text-sm text-slate-600">{request.room.fullCode} · {readableBookingDate(request.bookingDate, false)} · {bookingTime(request.startMinute, request.endMinute)}</p>
                                    {!personalOnly ? <p className="mt-1 text-xs text-slate-500">Requested by {request.requester.name}</p> : null}
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className={`status-badge ${bookingStatusClasses[request.status]}`}>{bookingStatusLabels[request.status]}</span>
                                        {request.pendingCompetitorCount > 0 && request.status.startsWith("PENDING") ? <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle className="size-3.5" /> Competing request</span> : null}
                                    </div>
                                </div>
                                <ChevronRight className="size-5 shrink-0 text-slate-400" />
                            </Link>
                        ))}
                    </div>
                )}
                <PaginationBar pagination={query.data?.pagination} onPage={(nextPage) => {
                    const next = new URLSearchParams(params)
                    next.set("page", String(nextPage))
                    setParams(next)
                }} />
            </section>
        </div>
    )
}
