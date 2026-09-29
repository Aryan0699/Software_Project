import { useQuery } from "@tanstack/react-query"
import {
    AlertTriangle,
    CalendarPlus,
    ChevronRight,
    Loader2,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth/useAuth"
import { bookingApi } from "../lib/bookingApi"
import { PaginationBar } from "./access/shared"
import {
    bookingStatusClasses,
    bookingStatusLabels,
    bookingTime,
    readableBookingDate,
} from "./booking/shared"

export function BookingsPage() {
    const { user } = useAuth()
    const [page, setPage] = useState(1)
    const query = useQuery({
        queryKey: ["my-booking-requests", page],
        queryFn: () => bookingApi.list({ page, pageSize: 20 }),
    })
    const canBook = user?.role === "STUDENT" || user?.role === "FACULTY"
    const personalOnly = user?.role === "STUDENT"

    return (
        <div className="space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="page-title">
                        {personalOnly ? "My Requests" : "Booking History"}
                    </h1>
                    <p className="page-subtitle">
                        {personalOnly
                            ? "See where each room request is in the approval process."
                            : "View booking requests and decisions within your authorized scope."}
                    </p>
                </div>
                {canBook ? (
                    <Link to="/availability" className="button-primary">
                        <CalendarPlus className="size-4" /> Book a room
                    </Link>
                ) : null}
            </header>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {query.isLoading ? (
                    <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
                        <Loader2 className="mr-2 size-4 animate-spin" /> Loading
                        requests
                    </div>
                ) : query.error ? (
                    <div className="p-5 text-sm text-red-700">
                        {query.error.message}
                    </div>
                ) : !query.data?.records.length ? (
                    <div className="py-14 text-center">
                        <CalendarPlus className="mx-auto size-7 text-slate-400" />
                        <p className="mt-3 font-medium text-slate-800">
                            {personalOnly
                                ? "No room requests yet"
                                : "No booking history in your scope"}
                        </p>
                        {canBook ? (
                            <>
                                <p className="mt-1 text-sm text-slate-500">
                                    Choose an available room to create a
                                    request.
                                </p>
                                <Link
                                    to="/availability"
                                    className="button-secondary mt-4 inline-flex"
                                >
                                    Book a room
                                </Link>
                            </>
                        ) : null}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {query.data.records.map((request) => (
                            <Link
                                key={request.id}
                                to={`/bookings/${request.id}`}
                                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50 sm:px-5"
                            >
                                <div className="min-w-0">
                                    <h2 className="truncate font-semibold text-slate-900">
                                        {request.title}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {request.room.fullCode} ·{" "}
                                        {readableBookingDate(
                                            request.bookingDate,
                                            false
                                        )}{" "}
                                        ·{" "}
                                        {bookingTime(
                                            request.startMinute,
                                            request.endMinute
                                        )}
                                    </p>
                                    {!personalOnly ? (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Requested by{" "}
                                            {request.requester.name}
                                        </p>
                                    ) : null}
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span
                                            className={`status-badge ${bookingStatusClasses[request.status]}`}
                                        >
                                            {
                                                bookingStatusLabels[
                                                    request.status
                                                ]
                                            }
                                        </span>
                                        {request.pendingCompetitorCount > 0 &&
                                        request.status.startsWith("PENDING") ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                                                <AlertTriangle className="size-3.5" />{" "}
                                                Competing request
                                            </span>
                                        ) : null}
                                    </div>
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
