import type { AcademicTermStatus, CalendarImpact } from "../../lib/api"
import { minuteToTime } from "../../lib/time"

const statusClasses: Record<AcademicTermStatus, string> = {
    PLANNED: "border-sky-200 bg-sky-50 text-sky-700",
    CURRENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CLOSED: "border-slate-200 bg-slate-100 text-slate-600",
}

export function TermStatusBadge({ status }: { status: AcademicTermStatus }) {
    return (
        <span className={`status-badge ${statusClasses[status]}`}>
            {status.toLowerCase()}
        </span>
    )
}

export function ImpactList({ impacts }: { impacts: CalendarImpact[] }) {
    if (!impacts.length) return null
    return (
        <div className="inline-alert border-red-200 bg-red-50 text-red-700">
            <div className="min-w-0">
                <p className="font-medium">
                    {impacts.length} approved event
                    {impacts.length === 1 ? "" : "s"} would conflict
                </p>
                <ul className="mt-2 max-h-44 space-y-2 overflow-y-auto text-xs">
                    {impacts.map((impact) => (
                        <li
                            key={impact.bookingId}
                            className="border-t border-red-200 pt-2 first:border-0 first:pt-0"
                        >
                            <p className="font-medium">
                                {impact.title} · {impact.room.fullCode}
                            </p>
                            <p>
                                {impact.date} ·{" "}
                                {minuteToTime(impact.startMinute)}-
                                {minuteToTime(impact.endMinute)} ·{" "}
                                {impact.requester.name}
                            </p>
                            <p>
                                Conflicts with{" "}
                                {impact.academicConflicts
                                    .map((item) => item.courseCode)
                                    .join(", ")}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
