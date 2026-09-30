import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { notificationApi, type Notification } from "../lib/notificationApi"

function notificationTarget(item: Notification) {
    return item.resourceType === "BOOKING_REQUEST" && item.resourceId
        ? `/bookings/${item.resourceId}`
        : "/notifications"
}

export function NotificationBell() {
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const wrapper = useRef<HTMLDivElement>(null)
    const query = useQuery({
        queryKey: ["notifications", "recent"],
        queryFn: () => notificationApi.list({ page: 1, pageSize: 5 }),
        refetchInterval: 30_000,
    })
    const markRead = useMutation({
        mutationFn: notificationApi.markRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    })
    const markAll = useMutation({
        mutationFn: notificationApi.markAllRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    })
    useEffect(() => {
        const close = (event: MouseEvent) => {
            if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", close)
        return () => document.removeEventListener("mousedown", close)
    }, [])

    const unread = query.data?.unreadCount || 0
    return (
        <div className="relative" ref={wrapper}>
            <button type="button" className="icon-button relative" onClick={() => setOpen(!open)} aria-label={`${unread} unread notifications`}>
                <Bell className="size-5" />
                {unread ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread > 99 ? "99+" : unread}</span> : null}
            </button>
            {open ? (
                <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        {unread ? <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700" onClick={() => markAll.mutate()}><CheckCheck className="size-3.5" /> Mark all read</button> : null}
                    </div>
                    <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                        {!query.data?.records.length ? <p className="p-6 text-center text-sm text-slate-500">No notifications yet</p> : query.data.records.map((item) => (
                            <Link key={item.id} to={notificationTarget(item)} onClick={() => { setOpen(false); if (!item.isRead) markRead.mutate(item.id) }} className={`block px-4 py-3 hover:bg-slate-50 ${item.isRead ? "" : "bg-brand-50/60"}`}>
                                <div className="flex gap-2">
                                    <span className={`mt-1 size-2 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-brand-600"}`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-slate-50">View all notifications</Link>
                </div>
            ) : null}
        </div>
    )
}
