import type { BookingStatus } from "../../lib/bookingApi"
import { minuteToTime } from "../../lib/time"

export const bookingStatusLabels: Record<BookingStatus, string> = {
    PENDING_FACULTY: "Pending faculty review",
    PENDING_INSTITUTIONAL: "Pending institutional approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
}

export const bookingStatusClasses: Record<BookingStatus, string> = {
    PENDING_FACULTY: "border-amber-200 bg-amber-50 text-amber-700",
    PENDING_INSTITUTIONAL: "border-sky-200 bg-sky-50 text-sky-700",
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
    CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
}

export function readableBookingDate(value: string, includeYear = true) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        ...(includeYear ? { year: "numeric" } : {}),
        timeZone: "UTC",
    }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`))
}

export function bookingTime(startMinute: number, endMinute: number) {
    return `${minuteToTime(startMinute)}–${minuteToTime(endMinute)}`
}
