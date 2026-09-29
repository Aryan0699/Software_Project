import { useQuery } from "@tanstack/react-query"
import { ClipboardCheck, ChevronRight, Loader2, Search } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { bookingApi } from "../lib/bookingApi"
import { PaginationBar } from "./access/shared"
import { bookingTime, readableBookingDate } from "./booking/shared"

const roleLabels = {
    FACULTY: "Faculty verifier",
    DOSA: "DOSA",
    ADOSA: "ADOSA",
    DOAA: "DOAA",
}

export function ApprovalsPage() {
    const [view, setView] = useState<"pending" | "completed">("pending")
    const [page, setPage] = useState(1)
    const [searchDraft, setSearchDraft] = useState("")
    const [search, setSearch] = useState("")
    const query = useQuery({
        queryKey: ["approval-queue", view, search, page],
        queryFn: () =>
            bookingApi.approvals({
                view,
                search: search || undefined,
                page,
                pageSize: 20,
            }),
    })

    const submitSearch = (event: FormEvent) => {
        event.preventDefault()
        setPage(1)
        setSearch(searchDraft.trim())
    }

    return (
        <div className="space-y-5">
            <header>
                <h1 className="page-title">Review Queue</h1>
                <p className="page-subtitle">
                    Review room requests assigned to you.
                </p>
            </header>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-100 p-1">
                        {(["pending", "completed"] as const).map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`min-h-9 rounded-md px-3 text-sm font-medium ${view === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                                onClick={() => {
                                    setView(item)
                                    setPage(1)
                                }}
                            >
                                {item === "pending"
                                    ? "Awaiting my decision"
                                    : "Completed"}
                            </button>
                        ))}
                    </div>
                    <form
                        onSubmit={submitSearch}
                        className="flex w-full gap-2 sm:max-w-sm"
                    >
                        <input
                            className="field-input"
                            value={searchDraft}
                            onChange={(event) =>
                                setSearchDraft(event.target.value)
                            }
                            placeholder="Search title, requester or room"
                        />
                        <button
                            type="submit"
                            className="button-secondary"
                            aria-label="Search approvals"
                        >
                            <Search className="size-4" />
                        </button>
                    </form>
                </div>

                {query.isLoading ? (
                    <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
                        <Loader2 className="mr-2 size-4 animate-spin" /> Loading
                        approval tasks
                    </div>
                ) : query.error ? (
                    <div className="p-5 text-sm text-red-700">
                        {query.error.message}
                    </div>
                ) : !query.data?.records.length ? (
                    <div className="py-14 text-center">
                        <ClipboardCheck className="mx-auto size-7 text-slate-400" />
                        <p className="mt-3 font-medium text-slate-800">
                            {view === "pending"
                                ? "No requests need your decision"
                                : "No completed decisions found"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {query.data.records.map((task) => (
                            <Link
                                key={task.id}
                                to={`/bookings/${task.request.id}`}
                                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 sm:px-5"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="truncate font-semibold text-slate-900">
                                            {task.request.title}
                                        </h2>
                                        <span className="status-badge border-sky-200 bg-sky-50 text-sky-700">
                                            {roleLabels[task.reviewerRole]}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {task.request.requester.name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {task.request.room.fullCode} ·{" "}
                                        {readableBookingDate(
                                            task.request.bookingDate,
                                            false
                                        )}{" "}
                                        ·{" "}
                                        {bookingTime(
                                            task.request.startMinute,
                                            task.request.endMinute
                                        )}
                                    </p>
                                </div>
                                <ChevronRight className="size-5 shrink-0 text-slate-400" />
                            </Link>
                        ))}
                    </div>
                )}
                <PaginationBar
                    pagination={query.data?.pagination}
                    onPage={setPage}
                />
            </section>
        </div>
    )
}
