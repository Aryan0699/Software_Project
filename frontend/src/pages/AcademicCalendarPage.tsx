import { CalendarDays, GraduationCap } from "lucide-react"
import { useState } from "react"
import { ExceptionsPanel } from "./calendar/ExceptionsPanel"
import { TermsPanel } from "./calendar/TermsPanel"

type Tab = "terms" | "exceptions"

const tabs = [
    { id: "terms" as const, label: "Academic terms", icon: GraduationCap },
    {
        id: "exceptions" as const,
        label: "Calendar exceptions",
        icon: CalendarDays,
    },
]

export function AcademicCalendarPage() {
    const [tab, setTab] = useState<Tab>("terms")

    return (
        <div className="space-y-6">
            <header>
                <h1 className="page-title">Academic calendar</h1>
                <p className="page-subtitle">
                    Term lifecycle, class holidays, and makeup-day schedules.
                </p>
            </header>

            <div className="overflow-x-auto border-b border-slate-200">
                <div
                    className="flex min-w-max gap-1"
                    role="tablist"
                    aria-label="Academic calendar views"
                >
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            type="button"
                            key={id}
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => setTab(id)}
                            className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
                                tab === id
                                    ? "border-brand-600 text-brand-700"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            <Icon className="size-4" /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <div role="tabpanel">
                {tab === "terms" ? <TermsPanel /> : <ExceptionsPanel />}
            </div>
        </div>
    )
}
