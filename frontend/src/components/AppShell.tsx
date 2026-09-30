import {
    Building2,
    CalendarDays,
    CalendarSearch,
    ChevronDown,
    ClipboardCheck,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    ShieldCheck,
    Warehouse,
    UserRound,
    X,
} from "lucide-react"
import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/useAuth"
import { NotificationBell } from "./NotificationBell"

const roleNames = {
    ADMIN: "Administrator",
    STAFF: "Building staff",
    FACULTY: "Faculty",
    STUDENT: "Student",
}

function Navigation({ close }: { close?: () => void }) {
    const { user } = useAuth()
    const items = [
        { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
        ...(user?.role === "STUDENT" || user?.role === "FACULTY"
            ? [
                  {
                      to: "/availability",
                      label: "Book a room",
                      icon: CalendarSearch,
                      end: false,
                  },
                  {
                      to: "/bookings",
                      label:
                          user.role === "STUDENT"
                              ? "My Requests"
                              : "Booking History",
                      icon: ClipboardList,
                      end: false,
                  },
              ]
            : []),
        ...(user?.role === "ADMIN" || user?.role === "STAFF"
            ? [
                  {
                      to: "/bookings",
                      label: "Booking History",
                      icon: ClipboardList,
                      end: false,
                  },
              ]
            : []),
        ...(user?.role === "FACULTY"
            ? [
                  {
                      to: "/approvals",
                      label: "Review Queue",
                      icon: ClipboardCheck,
                      end: false,
                  },
              ]
            : []),
        ...(user?.role === "ADMIN"
            ? [
                  {
                      to: "/admin/access",
                      label: "Access",
                      icon: ShieldCheck,
                      end: false,
                  },
                  {
                      to: "/admin/calendar",
                      label: "Academic calendar",
                      icon: CalendarDays,
                      end: false,
                  },
              ]
            : []),
        ...(user?.role === "ADMIN" || user?.role === "STAFF"
            ? [
                  {
                      to: "/facilities",
                      label: "Facilities",
                      icon: Warehouse,
                      end: false,
                  },
              ]
            : []),
        { to: "/account", label: "Account", icon: UserRound, end: false },
    ]

    return (
        <nav
            className="flex-1 space-y-1 px-3 py-5"
            aria-label="Primary navigation"
        >
            {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={close}
                    className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                            isActive
                                ? "bg-brand-50 text-brand-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`
                    }
                >
                    <Icon className="size-4" />
                    {label}
                </NavLink>
            ))}
        </nav>
    )
}

function Sidebar({ mobile, close }: { mobile?: boolean; close?: () => void }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const signOut = async () => {
        await logout()
        navigate("/login", { replace: true })
    }

    return (
        <aside
            className={`${
                mobile ? "fixed inset-y-0 left-0 z-50 shadow-xl" : "relative"
            } flex h-full w-64 flex-col border-r border-slate-200 bg-white`}
        >
            <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
                <div className="flex size-9 items-center justify-center rounded-md bg-brand-600 text-white">
                    <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-950">URAS</p>
                    <p className="truncate text-xs text-slate-500">
                        Room allocation
                    </p>
                </div>
                {mobile && (
                    <button
                        type="button"
                        onClick={close}
                        className="icon-button"
                        aria-label="Close menu"
                    >
                        <X className="size-5" />
                    </button>
                )}
            </div>

            <Navigation close={close} />

            <div className="border-t border-slate-200 p-3">
                <div className="mb-2 px-3 py-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                        {user?.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {user
                            ? `${roleNames[user.role]}${user.institutionalApprover ? ` · ${user.institutionalApprover.title}` : ""}`
                            : ""}
                    </p>
                </div>
                <button
                    type="button"
                    className="button-quiet w-full justify-start"
                    onClick={signOut}
                >
                    <LogOut className="size-4" />
                    Sign out
                </button>
            </div>
        </aside>
    )
}

export function AppShell() {
    const { user } = useAuth()
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="flex h-dvh min-h-[36rem] bg-canvas">
            <div className="hidden lg:block">
                <Sidebar />
            </div>

            {mobileOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                    />
                    <div className="lg:hidden">
                        <Sidebar mobile close={() => setMobileOpen(false)} />
                    </div>
                </>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            className="icon-button lg:hidden"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu className="size-5" />
                        </button>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                Unified Room Allocation
                            </p>
                            <p className="hidden text-xs text-slate-500 sm:block">
                                Operations workspace
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <NavLink
                            to="/account"
                            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                        >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                            {user?.name
                                .split(" ")
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join("")
                                .toUpperCase()}
                        </div>
                        <div className="hidden min-w-0 text-left sm:block">
                            <p className="max-w-40 truncate text-sm font-medium text-slate-900">
                                {user?.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {user
                                    ? `${roleNames[user.role]}${user.institutionalApprover ? ` · ${user.institutionalApprover.title}` : ""}`
                                    : ""}
                            </p>
                        </div>
                        <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
                        </NavLink>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
