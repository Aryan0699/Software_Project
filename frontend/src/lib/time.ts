export function minuteToTime(value: number) {
    const hours = Math.floor(value / 60)
    const minutes = value % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function timeToMinute(
    value: string,
    boundary: "start" | "end" = "start"
) {
    const [hours, minutes] = value.split(":").map(Number)
    if (boundary === "end" && hours === 0 && minutes === 0) return 1440
    return hours * 60 + minutes
}

export function dateOnly(value: string) {
    return value.slice(0, 10)
}
