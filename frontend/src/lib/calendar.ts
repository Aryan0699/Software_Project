import { ApiClientError, type CalendarImpact, type DayOfWeek } from "./api"

export const weekdays: Array<{ value: DayOfWeek; label: string }> = [
    { value: "MONDAY", label: "Monday" },
    { value: "TUESDAY", label: "Tuesday" },
    { value: "WEDNESDAY", label: "Wednesday" },
    { value: "THURSDAY", label: "Thursday" },
    { value: "FRIDAY", label: "Friday" },
    { value: "SATURDAY", label: "Saturday" },
    { value: "SUNDAY", label: "Sunday" },
]

export function calendarImpactsFromError(error: unknown) {
    if (
        !(error instanceof ApiClientError) ||
        !error.details ||
        typeof error.details !== "object"
    ) {
        return []
    }
    const details = error.details as { impacts?: CalendarImpact[] }
    return details.impacts || []
}
