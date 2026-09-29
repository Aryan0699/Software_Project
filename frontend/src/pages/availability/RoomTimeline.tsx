import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    LayoutGrid,
    Loader2,
    XCircle,
} from "lucide-react"
import { useState } from "react"
import type {
    AvailabilityInterval,
    AvailabilityTimelineConfig,
    RoomTimeline as RoomTimelineData,
} from "../../lib/availabilityApi"
import { minuteToTime } from "../../lib/time"
import { ContinuousTimeline } from "./ContinuousTimeline"

type TimeMode = "GRID" | "CUSTOM"

const sourceLabels = {
    BUILDING_INACTIVE: "Building unavailable",
    ROOM_INACTIVE: "Room unavailable",
    ACADEMIC_TIMETABLE: "Academic timetable",
    ROOM_RESTRICTION: "Room restriction",
    APPROVED_BOOKING: "Approved event",
    PAST_TIME: "Time has passed",
    PENDING_REQUEST: "Pending request",
}

function timeOptionLabel(minute: number) {
    return minute === 1440 ? "12:00 AM (end of day)" : minuteToTime(minute)
}

function minuteOptions(start: number, end: number, step: number) {
    const options: number[] = []
    for (let minute = start; minute <= end; minute += step) {
        options.push(minute)
    }
    if (options.at(-1) !== end) options.push(end)
    return options
}

function overlaps(
    interval: AvailabilityInterval,
    startMinute: number,
    endMinute: number
) {
    return interval.startMinute < endMinute && startMinute < interval.endMinute
}

function readableDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(value + "T00:00:00.000Z"))
}

function readableDuration(minutes: number) {
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    if (hours === 0) return String(remainder) + "m"
    return remainder
        ? String(hours) + "h " + String(remainder) + "m"
        : String(hours) + "h"
}

export function RoomTimeline({
    timeline,
    config,
    loading,
    error,
    onRequest,
}: {
    timeline?: RoomTimelineData
    config?: AvailabilityTimelineConfig
    loading: boolean
    error?: string
    onRequest: (startMinute: number, endMinute: number) => void
}) {
    const [mode, setMode] = useState<TimeMode>("GRID")
    const [selection, setSelection] = useState<{
        startMinute: number
        endMinute: number
    } | null>(null)
    const [customStart, setCustomStart] = useState<number | null>(null)
    const [customEnd, setCustomEnd] = useState<number | null>(null)

    if (loading) {
        return (
            <div className="flex min-h-36 items-center justify-center border-t border-slate-200 text-sm text-slate-500">
                <Loader2 className="mr-2 size-4 animate-spin" /> Loading
                availability
            </div>
        )
    }
    if (error) {
        return (
            <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
            </div>
        )
    }
    if (!timeline || !config) return null

    const customDuration =
        customStart === null || customEnd === null ? 0 : customEnd - customStart
    const customOrderValid =
        customStart !== null && customEnd !== null && customDuration > 0
    const customWindowValid =
        customOrderValid &&
        customStart >= config.selectableStartMinute &&
        customEnd <= config.windowEndMinute
    const customDurationValid =
        customWindowValid && customDuration >= config.minimumDurationMinutes
    const rangeStart =
        mode === "GRID"
            ? selection?.startMinute
            : customDurationValid
              ? customStart
              : null
    const rangeEnd =
        mode === "GRID"
            ? selection?.endMinute
            : customDurationValid
              ? customEnd
              : null
    const blockingConflict =
        rangeStart != null && rangeEnd != null
            ? timeline.blockingConflicts.find((item) =>
                  overlaps(item, rangeStart, rangeEnd)
              )
            : undefined
    const pendingConflicts =
        rangeStart != null && rangeEnd != null
            ? timeline.pendingWarnings.filter((item) =>
                  overlaps(item, rangeStart, rangeEnd)
              )
            : []
    const canRequest =
        rangeStart != null && rangeEnd != null && !blockingConflict

    const selectMode = (nextMode: TimeMode) => {
        setMode(nextMode)
        setSelection(null)
        if (nextMode === "CUSTOM") {
            const start = config.selectableStartMinute
            if (
                start + config.minimumDurationMinutes <=
                config.windowEndMinute
            ) {
                setCustomStart(start)
                setCustomEnd(
                    Math.min(
                        config.windowEndMinute,
                        start + config.defaultDurationMinutes
                    )
                )
            } else {
                setCustomStart(null)
                setCustomEnd(null)
            }
        }
    }
    const startOptions = minuteOptions(
        config.selectableStartMinute,
        Math.max(
            config.selectableStartMinute,
            config.windowEndMinute - config.minimumDurationMinutes
        ),
        config.selectionStepMinutes
    ).filter(
        (minute) =>
            minute + config.minimumDurationMinutes <= config.windowEndMinute
    )
    const endOptions =
        customStart === null
            ? []
            : minuteOptions(
                  customStart + config.minimumDurationMinutes,
                  config.windowEndMinute,
                  config.selectionStepMinutes
              )

    return (
        <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-5 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">
                        Room availability
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {readableDate(timeline.date)} ·{" "}
                        {minuteToTime(config.windowStartMinute)}–
                        {minuteToTime(config.windowEndMinute)}
                    </p>
                </div>
                {timeline.academicContext.mode === "NO_CLASSES" ? (
                    <span className="status-badge border-sky-200 bg-sky-50 text-sky-700">
                        No classes · {timeline.academicContext.exception?.name}
                    </span>
                ) : timeline.academicContext.mode === "FOLLOW_DAY" ? (
                    <span className="status-badge border-violet-200 bg-violet-50 text-violet-700">
                        Follows{" "}
                        {timeline.academicContext.dayOfWeek?.toLowerCase()}
                    </span>
                ) : null}
            </div>

            <div
                className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"
                role="radiogroup"
                aria-label="Time selection method"
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "GRID"}
                    onClick={() => selectMode("GRID")}
                    className={
                        "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium " +
                        (mode === "GRID"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900")
                    }
                >
                    <LayoutGrid className="size-4" /> Timeline
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "CUSTOM"}
                    onClick={() => selectMode("CUSTOM")}
                    className={
                        "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium " +
                        (mode === "CUSTOM"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900")
                    }
                >
                    <Clock3 className="size-4" /> Custom time
                </button>
            </div>

            {mode === "GRID" ? (
                <div className="mt-4">
                    <div className="mb-3">
                        <p className="mb-2 text-xs font-medium text-slate-700">
                            Free windows
                        </p>
                        {timeline.freeWindows.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {timeline.freeWindows.map((window) => {
                                    const selected =
                                        selection?.startMinute ===
                                            window.startMinute &&
                                        selection?.endMinute ===
                                            window.endMinute
                                    const pendingCount =
                                        timeline.pendingWarnings.filter(
                                            (item) =>
                                                overlaps(
                                                    item,
                                                    window.startMinute,
                                                    window.endMinute
                                                )
                                        ).length
                                    return (
                                        <button
                                            type="button"
                                            key={
                                                String(window.startMinute) +
                                                "-" +
                                                String(window.endMinute)
                                            }
                                            aria-pressed={selected}
                                            onClick={() =>
                                                setSelection({
                                                    startMinute:
                                                        window.startMinute,
                                                    endMinute: window.endMinute,
                                                })
                                            }
                                            className={
                                                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                                                (selected
                                                    ? "border-blue-700 bg-blue-700 text-white"
                                                    : "border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50")
                                            }
                                        >
                                            {pendingCount > 0 ? (
                                                <span
                                                    className="size-2 rounded-full bg-amber-400"
                                                    aria-label={
                                                        String(pendingCount) +
                                                        " pending request warning"
                                                    }
                                                />
                                            ) : null}
                                            {minuteToTime(window.startMinute)}–
                                            {minuteToTime(window.endMinute)} ·{" "}
                                            {readableDuration(
                                                window.durationMinutes
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">
                                No bookable free window remains in the displayed
                                operating hours.
                            </p>
                        )}
                    </div>
                    <ContinuousTimeline
                        windowStart={config.windowStartMinute}
                        windowEnd={config.windowEndMinute}
                        minimumDuration={config.minimumDurationMinutes}
                        selectionStep={config.selectionStepMinutes}
                        defaultDuration={config.defaultDurationMinutes}
                        blocking={timeline.blockingConflicts}
                        pending={timeline.pendingWarnings}
                        selection={selection}
                        onChange={setSelection}
                    />
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-blue-500" />
                            Selected
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-red-300" />
                            Occupied
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-amber-300" />
                            Pending request
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full border border-slate-300 bg-white" />
                            Free
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Drag across a free period to select an exact range, or
                        click once to select a default interval. On touch
                        screens, swipe the bar and use a free-window chip or
                        custom time to select.
                    </p>
                </div>
            ) : (
                <div className="mt-4 grid max-w-md gap-3 sm:grid-cols-2">
                    <label>
                        <span className="field-label">Start time</span>
                        <select
                            className="field-select"
                            value={customStart ?? ""}
                            onChange={(event) => {
                                const nextStart = Number(event.target.value)
                                setCustomStart(nextStart)
                                setCustomEnd(
                                    Math.min(
                                        config.windowEndMinute,
                                        nextStart +
                                            config.defaultDurationMinutes
                                    )
                                )
                            }}
                            disabled={!startOptions.length}
                        >
                            {!startOptions.length ? (
                                <option value="">No time remains today</option>
                            ) : null}
                            {startOptions.map((minute) => (
                                <option key={minute} value={minute}>
                                    {timeOptionLabel(minute)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="field-label">End time</span>
                        <select
                            className="field-select"
                            value={customEnd ?? ""}
                            onChange={(event) =>
                                setCustomEnd(Number(event.target.value))
                            }
                            disabled={!endOptions.length}
                        >
                            {!endOptions.length ? (
                                <option value="">Select a start time</option>
                            ) : null}
                            {endOptions.map((minute) => (
                                <option key={minute} value={minute}>
                                    {timeOptionLabel(minute)}
                                </option>
                            ))}
                        </select>
                    </label>
                    {!startOptions.length ? (
                        <p className="text-xs text-slate-600 sm:col-span-2">
                            No bookable time remains within today's configured
                            operating hours.
                        </p>
                    ) : !customOrderValid ? (
                        <p
                            className="text-xs text-red-700 sm:col-span-2"
                            role="alert"
                        >
                            End time must be later than start time.
                        </p>
                    ) : !customWindowValid ? (
                        <p
                            className="text-xs text-red-700 sm:col-span-2"
                            role="alert"
                        >
                            Choose a time between{" "}
                            {minuteToTime(config.windowStartMinute)} and{" "}
                            {minuteToTime(config.windowEndMinute)}.
                        </p>
                    ) : !customDurationValid ? (
                        <p
                            className="text-xs text-red-700 sm:col-span-2"
                            role="alert"
                        >
                            Bookings must be at least{" "}
                            {config.minimumDurationMinutes} minutes.
                        </p>
                    ) : null}
                </div>
            )}

            {rangeStart != null && rangeEnd != null ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                    {blockingConflict ? (
                        <div className="flex items-start gap-2 text-sm text-red-700">
                            <XCircle className="mt-0.5 size-4 shrink-0" />
                            <div>
                                <p className="font-semibold">Unavailable</p>
                                <p className="mt-0.5 text-xs">
                                    {sourceLabels[blockingConflict.source]} ·{" "}
                                    {minuteToTime(blockingConflict.startMinute)}
                                    –{minuteToTime(blockingConflict.endMinute)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 text-sm text-emerald-700">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                            <div>
                                <p className="font-semibold">
                                    Available · {minuteToTime(rangeStart)}–
                                    {minuteToTime(rangeEnd)}
                                </p>
                                <p className="mt-0.5 text-xs text-emerald-600">
                                    This room is free for your selected time.
                                </p>
                                {pendingConflicts.length > 0 ? (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                        <AlertTriangle className="size-3.5" />
                                        {pendingConflicts.length} competing{" "}
                                        {pendingConflicts.length === 1
                                            ? "request is"
                                            : "requests are"}{" "}
                                        pending approval.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {canRequest ? (
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        className="button-primary"
                        onClick={() =>
                            onRequest(rangeStart as number, rangeEnd as number)
                        }
                    >
                        Request this room
                    </button>
                </div>
            ) : null}
        </div>
    )
}
