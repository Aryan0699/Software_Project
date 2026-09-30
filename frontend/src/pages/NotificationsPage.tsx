import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck, ChevronRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { notificationApi, type Notification } from "../lib/notificationApi"
import { PaginationBar } from "./access/shared"

function target(item: Notification) {
    return item.resourceType === "BOOKING_REQUEST" && item.resourceId
        ? `/bookings/${item.resourceId}`
        : "/notifications"
}

export function NotificationsPage() {
    const queryClient = useQueryClient()
    const [params, setParams] = useSearchParams()
    const [view, setView] = useState<"all" | "unread">(
        params.get("view") === "unread" ? "unread" : "all"
    )
    const [page, setPage] = useState(1)
    const query = useQuery({
        queryKey: ["notifications", view, page],
        queryFn: () => notificationApi.list({ view, page, pageSize: 20 }),
    })
    const markRead = useMutation({
        mutationFn: notificationApi.markRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    })
    const markAll = useMutation({
        mutationFn: notificationApi.markAllRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    })

    return (
        <div className="space-y-5">
            <header className="flex items-start justify-between gap-3">
                <div><h1 className="page-title">Notifications</h1><p className="page-subtitle">Booking updates and requests that need your attention.</p></div>
                {query.data?.unreadCount ? <button type="button" className="button-secondary" onClick={() => markAll.mutate()}><CheckCheck className="size-4" /> Mark all read</button> : null}
            </header>
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-1 border-b border-slate-200 p-3">
                    {(["all", "unread"] as const).map((item) => <button key={item} type="button" className={`min-h-9 rounded-md px-3 text-sm font-medium ${view === item ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => { setView(item); setPage(1); setParams(item === "unread" ? { view: "unread" } : {}) }}>{item === "all" ? "All" : "Unread"}</button>)}
                </div>
                {query.isLoading ? <div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Loading notifications</div> : !query.data?.records.length ? <div className="py-14 text-center"><Bell className="mx-auto size-7 text-slate-400" /><p className="mt-3 font-medium text-slate-800">{view === "unread" ? "You're all caught up" : "No notifications yet"}</p></div> : <div className="divide-y divide-slate-200">{query.data.records.map((item) => <Link key={item.id} to={target(item)} onClick={() => !item.isRead && markRead.mutate(item.id)} className={`flex items-center justify-between gap-4 p-4 hover:bg-slate-50 sm:px-5 ${item.isRead ? "" : "bg-brand-50/50"}`}><div className="flex min-w-0 gap-3"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.isRead ? "bg-slate-200" : "bg-brand-600"}`} /><div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-1 text-xs text-slate-400">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p></div></div><ChevronRight className="size-5 shrink-0 text-slate-400" /></Link>)}</div>}
                <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
            </section>
        </div>
    )
}
