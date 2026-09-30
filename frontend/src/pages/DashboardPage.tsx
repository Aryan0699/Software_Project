import { useQuery } from "@tanstack/react-query"
import {
    ArrowRight,
    Bell,
    CalendarCheck,
    CalendarSearch,
    ClipboardCheck,
    Clock3,
    Loader2,
    UsersRound,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth/useAuth"
import { bookingApi } from "../lib/bookingApi"
import { bookingTime, readableBookingDate } from "./booking/shared"

const roleLabels = {
    ADMIN: "Administrator",
    STAFF: "Building staff",
    FACULTY: "Faculty",
    STUDENT: "Student",
}

export function DashboardPage() {
    const { user } = useAuth()
    const query = useQuery({ queryKey: ["booking-dashboard"], queryFn: bookingApi.dashboard })
    if (!user) return null
    if (query.isLoading) return <div className="flex min-h-60 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Loading dashboard</div>
    const dashboard = query.data?.dashboard
    const pending = (dashboard?.counts.PENDING_FACULTY || 0) + (dashboard?.counts.PENDING_INSTITUTIONAL || 0)
    const cards = [
        { label: user.role === "FACULTY" ? "Awaiting my decision" : "Pending requests", value: user.role === "FACULTY" ? dashboard?.pendingReviewCount || 0 : pending, icon: ClipboardCheck, to: user.role === "FACULTY" ? "/approvals" : "/bookings?status=PENDING_FACULTY" },
        { label: "Approved bookings", value: dashboard?.counts.APPROVED || 0, icon: CalendarCheck, to: "/bookings?status=APPROVED" },
        { label: "Unread updates", value: dashboard?.unreadCount || 0, icon: Bell, to: "/notifications?view=unread" },
        ...(user.role === "ADMIN" ? [{ label: "Active approvers", value: dashboard?.activeApproverCount || 0, icon: UsersRound, to: "/admin/access" }] : []),
    ]

    return (
        <div className="space-y-7">
            <header>
                <p className="text-sm font-medium text-brand-600">{roleLabels[user.role]}{user.institutionalApprover?.isActive ? ` · ${user.institutionalApprover.title}` : ""}</p>
                <h1 className="page-title mt-1">Welcome back, {user.name.split(" ")[0]}</h1>
                <p className="page-subtitle">Your booking work at a glance.</p>
            </header>

            <section className={`grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:grid-cols-2 ${cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                {cards.map(({ label, value, icon: Icon, to }) => <Link key={label} to={to} className="border-b border-r border-slate-200 p-5 hover:bg-slate-50"><Icon className="size-5 text-brand-600" /><p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></Link>)}
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5"><div><h2 className="font-semibold text-slate-900">Upcoming approved bookings</h2><p className="mt-0.5 text-xs text-slate-500">The next bookings visible in your scope.</p></div><Link to="/bookings?status=APPROVED" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">View all <ArrowRight className="size-4" /></Link></div>
                {!dashboard?.upcoming.length ? <div className="py-12 text-center"><Clock3 className="mx-auto size-7 text-slate-400" /><p className="mt-3 text-sm text-slate-500">No upcoming approved bookings</p></div> : <div className="divide-y divide-slate-200">{dashboard.upcoming.map((booking) => <Link key={booking.id} to={`/bookings/${booking.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{booking.title}</p><p className="mt-1 text-xs text-slate-500">{booking.room.fullCode} · {readableBookingDate(booking.bookingDate)} · {bookingTime(booking.startMinute, booking.endMinute)}</p></div><ArrowRight className="size-4 shrink-0 text-slate-400" /></Link>)}</div>}
            </section>

            {(user.role === "STUDENT" || user.role === "FACULTY") ? <Link to="/availability" className="button-primary inline-flex"><CalendarSearch className="size-4" /> Book a room</Link> : null}
        </div>
    )
}
