import { ApiClientError, errorMessage } from "./api"
import { minuteToTime } from "./time"

type BlockingItem = {
  source?: string
  date?: string
  startMinute?: number
  endMinute?: number
  label?: string
  title?: string
  reason?: string
}

function formatBlockingItem(item: BlockingItem, prefix?: string) {
  const source = item.source?.replaceAll("_", " ").toLowerCase()
  const label = item.label || item.title || item.reason || source || "Room commitment"
  const interval =
    item.startMinute !== undefined && item.endMinute !== undefined
      ? `${minuteToTime(item.startMinute)}-${minuteToTime(item.endMinute)}`
      : null
  return [prefix, label, item.date?.slice(0, 10), interval].filter(Boolean).join(" · ")
}

export function operationalErrorDetails(error: unknown) {
  if (!(error instanceof ApiClientError) || !error.details || typeof error.details !== "object") {
    return []
  }
  const details = error.details as {
    blockers?: BlockingItem[]
    rooms?: Array<{ fullCode?: string; blockers?: BlockingItem[] }>
    conflicts?: {
      academic?: BlockingItem[]
      bookings?: BlockingItem[]
      restrictions?: BlockingItem[]
    }
  }
  if (details.blockers) return details.blockers.map((item) => formatBlockingItem(item))
  if (details.rooms) {
    return details.rooms.flatMap((room) =>
      (room.blockers || []).map((item) => formatBlockingItem(item, room.fullCode)),
    )
  }
  if (details.conflicts) {
    return [
      ...(details.conflicts.academic || []).map((item) =>
        formatBlockingItem({ ...item, source: "Academic timetable" }),
      ),
      ...(details.conflicts.bookings || []).map((item) =>
        formatBlockingItem({ ...item, source: "Approved booking" }),
      ),
      ...(details.conflicts.restrictions || []).map((item) =>
        formatBlockingItem({ ...item, source: "Room restriction" }),
      ),
    ]
  }
  return []
}

export function operationalErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.details && typeof error.details === "object") {
    const details = error.details as {
      blockers?: unknown[]
      rooms?: Array<{ blockers?: unknown[] }>
      conflicts?: { academic?: unknown[]; bookings?: unknown[]; restrictions?: unknown[] }
    }
    const blockerCount =
      details.blockers?.length ||
      details.rooms?.reduce((total, room) => total + (room.blockers?.length || 0), 0) ||
      (details.conflicts
        ? (details.conflicts.academic?.length || 0) +
          (details.conflicts.bookings?.length || 0) +
          (details.conflicts.restrictions?.length || 0)
        : 0) ||
      0
    if (blockerCount > 0) {
      return `${error.message} ${blockerCount} blocking commitment${blockerCount === 1 ? " was" : "s were"} found.`
    }
  }
  return errorMessage(error)
}
