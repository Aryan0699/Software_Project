const INSTITUTION_TIME_ZONE = "Asia/Kolkata"

const dayNames = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
]

export function parseDateOnly(value) {
    return new Date(`${value}T00:00:00.000Z`)
}

export function formatDateOnly(value) {
    return value.toISOString().slice(0, 10)
}

export function addDays(value, days) {
    const date = new Date(value)
    date.setUTCDate(date.getUTCDate() + days)
    return date
}

export function dayOfWeek(value) {
    return dayNames[value.getUTCDay()]
}

export function institutionNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: INSTITUTION_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(now)
    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value])
    )
    const date = `${values.year}-${values.month}-${values.day}`

    return {
        date,
        dateValue: parseDateOnly(date),
        minute: Number(values.hour) * 60 + Number(values.minute),
    }
}

