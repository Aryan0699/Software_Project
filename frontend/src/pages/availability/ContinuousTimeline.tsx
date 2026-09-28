import { useMemo, useRef, useState, type PointerEvent } from "react"
import type { AvailabilityInterval } from "../../lib/availabilityApi"
import { minuteToTime } from "../../lib/time"

type TimelineSegment = {
    startMinute: number
    endMinute: number
    state: "FREE" | "BLOCKED"
    interval?: AvailabilityInterval
}

type Selection = {
    startMinute: number
    endMinute: number
}

const sourceLabels = {
    BUILDING_INACTIVE: "Building unavailable",
    ROOM_INACTIVE: "Room unavailable",
    ACADEMIC_TIMETABLE: "Academic timetable",
    ROOM_RESTRICTION: "Room restriction",
    APPROVED_BOOKING: "Approved event",
    PENDING_REQUEST: "Pending request",
}

function overlaps(
    interval: AvailabilityInterval,
    startMinute: number,
    endMinute: number
) {
    return interval.startMinute < endMinute && startMinute < interval.endMinute
}

function buildSegments(
    windowStart: number,
    windowEnd: number,
    blocking: AvailabilityInterval[]
) {
    const relevant = blocking.filter((interval) =>
        overlaps(interval, windowStart, windowEnd)
    )
    const boundaries = new Set([windowStart, windowEnd])
    for (const interval of relevant) {
        boundaries.add(Math.max(windowStart, interval.startMinute))
        boundaries.add(Math.min(windowEnd, interval.endMinute))
    }
    const ordered = [...boundaries].sort((first, second) => first - second)
    const segments: TimelineSegment[] = []
    for (let index = 0; index < ordered.length - 1; index += 1) {
        const startMinute = ordered[index]
        const endMinute = ordered[index + 1]
        const blocker = blocking.find((item) =>
            overlaps(item, startMinute, endMinute)
        )
        segments.push({
            startMinute,
            endMinute,
            state: blocker ? "BLOCKED" : "FREE",
            interval: blocker,
        })
    }
    return segments
}

function segmentClassName(segment: TimelineSegment, tooShort: boolean) {
    if (segment.state === "BLOCKED") {
        return "cursor-not-allowed bg-red-300 hover:bg-red-400"
    }
    return tooShort
        ? "cursor-not-allowed bg-slate-100"
        : "cursor-crosshair bg-white hover:bg-sky-50"
}

export function ContinuousTimeline({
    windowStart,
    windowEnd,
    minimumDuration,
    selectionStep,
    defaultDuration,
    blocking,
    pending,
    selection,
    onChange,
}: {
    windowStart: number
    windowEnd: number
    minimumDuration: number
    selectionStep: number
    defaultDuration: number
    blocking: AvailabilityInterval[]
    pending: AvailabilityInterval[]
    selection: Selection | null
    onChange: (selection: Selection) => void
}) {
    const barRef = useRef<HTMLDivElement>(null)
    const dragStartRef = useRef<number | null>(null)
    const movedRef = useRef(false)
    const [preview, setPreview] = useState<Selection | null>(null)
    const [hovered, setHovered] = useState<TimelineSegment | null>(null)
    const [hoveredPending, setHoveredPending] =
        useState<AvailabilityInterval | null>(null)
    const [selectionError, setSelectionError] = useState<string | null>(null)

    const segments = useMemo(
        () => buildSegments(windowStart, windowEnd, blocking),
        [windowStart, windowEnd, blocking]
    )
    const duration = windowEnd - windowStart
    const displayedSelection = preview || selection
    const hourMarks = useMemo(() => {
        const marks = new Set([windowStart, windowEnd])
        for (
            let minute = Math.ceil(windowStart / 60) * 60;
            minute < windowEnd;
            minute += 60
        ) {
            marks.add(minute)
        }
        return [...marks].sort((first, second) => first - second)
    }, [windowStart, windowEnd])

    const percent = (minute: number) =>
        ((minute - windowStart) / duration) * 100
    const snap = (minute: number) =>
        Math.max(
            windowStart,
            Math.min(
                windowEnd,
                Math.round(minute / selectionStep) * selectionStep
            )
        )
    const minuteAt = (clientX: number) => {
        const bounds = barRef.current?.getBoundingClientRect()
        if (!bounds) return windowStart
        const ratio = Math.max(
            0,
            Math.min(1, (clientX - bounds.left) / bounds.width)
        )
        return snap(windowStart + ratio * duration)
    }
    const segmentAt = (minute: number) =>
        segments.find(
            (segment, index) =>
                segment.startMinute <= minute &&
                (minute < segment.endMinute ||
                    (index === segments.length - 1 &&
                        minute === segment.endMinute))
        )

    const describeSegment = (segment: TimelineSegment) => {
        if (segment.state === "FREE") {
            return segment.endMinute - segment.startMinute < minimumDuration
                ? "Free gap " +
                      minuteToTime(segment.startMinute) +
                      "–" +
                      minuteToTime(segment.endMinute) +
                      " · Too short to book"
                : "Free window " +
                      minuteToTime(segment.startMinute) +
                      "–" +
                      minuteToTime(segment.endMinute) +
                      (pending.some((item) =>
                          overlaps(item, segment.startMinute, segment.endMinute)
                      )
                          ? " · Pending interest inside this window"
                          : "")
        }
        return (
            sourceLabels[segment.interval!.source] +
            " · " +
            minuteToTime(segment.interval!.startMinute) +
            "–" +
            minuteToTime(segment.interval!.endMinute) +
            " · " +
            segment.interval!.label
        )
    }

    const validate = (candidate: Selection) => {
        if (candidate.endMinute - candidate.startMinute < minimumDuration) {
            return (
                "Bookings must be at least " +
                String(minimumDuration) +
                " minutes."
            )
        }
        if (
            blocking.some((item) =>
                overlaps(item, candidate.startMinute, candidate.endMinute)
            )
        ) {
            return "That range includes an occupied period."
        }
        return null
    }

    const commit = (candidate: Selection) => {
        const error = validate(candidate)
        if (error) {
            setSelectionError(error)
            return
        }
        setSelectionError(null)
        onChange(candidate)
    }

    const selectSegment = (
        segment: TimelineSegment,
        anchorMinute = segment.startMinute
    ) => {
        if (segment.state === "BLOCKED") return
        const segmentDuration = segment.endMinute - segment.startMinute
        if (segmentDuration < minimumDuration) {
            setSelectionError(
                "This free gap is shorter than the " +
                    String(minimumDuration) +
                    "-minute minimum."
            )
            return
        }
        const chosenDuration = Math.min(defaultDuration, segmentDuration)
        let startMinute = Math.max(segment.startMinute, snap(anchorMinute))
        let endMinute = startMinute + chosenDuration
        if (endMinute > segment.endMinute) {
            endMinute = segment.endMinute
            startMinute = endMinute - chosenDuration
        }
        commit({ startMinute, endMinute })
    }

    const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === "touch") return
        const minute = minuteAt(event.clientX)
        const segment = segmentAt(minute)
        if (!segment || segment.state === "BLOCKED") return
        dragStartRef.current = minute
        movedRef.current = false
        setPreview(null)
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStartRef.current == null) return
        const current = minuteAt(event.clientX)
        if (Math.abs(current - dragStartRef.current) >= selectionStep) {
            movedRef.current = true
        }
        if (movedRef.current) {
            setPreview({
                startMinute: Math.min(dragStartRef.current, current),
                endMinute: Math.max(dragStartRef.current, current),
            })
        }
    }

    const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
        const dragStart = dragStartRef.current
        if (dragStart == null) return
        const current = minuteAt(event.clientX)
        dragStartRef.current = null
        setPreview(null)
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        if (movedRef.current) {
            commit({
                startMinute: Math.min(dragStart, current),
                endMinute: Math.max(dragStart, current),
            })
            return
        }
        const segment = segmentAt(current)
        if (segment) selectSegment(segment, current)
    }

    const tooltipText = hoveredPending
        ? sourceLabels[hoveredPending.source] +
          " · " +
          minuteToTime(hoveredPending.startMinute) +
          "–" +
          minuteToTime(hoveredPending.endMinute) +
          " · " +
          hoveredPending.label
        : hovered
          ? describeSegment(hovered)
          : null
    const tooltipStart = hoveredPending?.startMinute ?? hovered?.startMinute
    const tooltipEnd = hoveredPending?.endMinute ?? hovered?.endMinute

    return (
        <div>
            <div className="overflow-x-auto pb-2">
                <div
                    className="relative pt-14"
                    style={{ minWidth: Math.max(720, duration * 1.1) }}
                >
                    {tooltipStart != null &&
                    tooltipEnd != null &&
                    tooltipText ? (
                        <div
                            className="pointer-events-none absolute top-0 z-30 max-w-64 -translate-x-1/2 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white shadow-lg"
                            style={{
                                left:
                                    String(
                                        percent((tooltipStart + tooltipEnd) / 2)
                                    ) + "%",
                            }}
                            role="tooltip"
                        >
                            {tooltipText}
                        </div>
                    ) : null}

                    <div className="relative h-6 text-[10px] text-slate-500">
                        {hourMarks.map((minute) => (
                            <span
                                key={minute}
                                className="absolute -translate-x-1/2"
                                style={{ left: String(percent(minute)) + "%" }}
                            >
                                {minuteToTime(minute)}
                            </span>
                        ))}
                    </div>

                    <div
                        ref={barRef}
                        className="relative h-11 touch-auto select-none overflow-hidden rounded-md border border-slate-300 bg-white shadow-inner"
                        onPointerDownCapture={beginDrag}
                        onPointerMove={moveDrag}
                        onPointerUp={finishDrag}
                        onPointerCancel={() => {
                            dragStartRef.current = null
                            setPreview(null)
                        }}
                    >
                        {hourMarks.slice(1, -1).map((minute) => (
                            <span
                                key={minute}
                                className="pointer-events-none absolute inset-y-0 z-40 border-l border-slate-200"
                                style={{ left: String(percent(minute)) + "%" }}
                            />
                        ))}
                        {segments.map((segment) => {
                            const tooShort =
                                segment.endMinute - segment.startMinute <
                                minimumDuration
                            const pressed =
                                displayedSelection != null &&
                                overlaps(
                                    {
                                        source: "PENDING_REQUEST",
                                        startMinute:
                                            displayedSelection.startMinute,
                                        endMinute: displayedSelection.endMinute,
                                        label: "",
                                    },
                                    segment.startMinute,
                                    segment.endMinute
                                )
                            return (
                                <div
                                    key={
                                        String(segment.startMinute) +
                                        "-" +
                                        String(segment.endMinute)
                                    }
                                    className={
                                        "absolute inset-y-0 " +
                                        (segment.state === "BLOCKED"
                                            ? "z-20"
                                            : "z-0")
                                    }
                                    style={{
                                        left:
                                            String(
                                                percent(segment.startMinute)
                                            ) + "%",
                                        width:
                                            String(
                                                percent(segment.endMinute) -
                                                    percent(segment.startMinute)
                                            ) + "%",
                                    }}
                                    onMouseEnter={() => {
                                        setHoveredPending(null)
                                        setHovered(segment)
                                    }}
                                    onMouseLeave={() => setHovered(null)}
                                    onFocus={() => setHovered(segment)}
                                    onBlur={() => setHovered(null)}
                                >
                                    <button
                                        type="button"
                                        disabled={segment.state === "BLOCKED"}
                                        aria-pressed={pressed}
                                        aria-label={describeSegment(segment)}
                                        className={
                                            "size-full border-r border-slate-200 transition-colors " +
                                            segmentClassName(segment, tooShort)
                                        }
                                        onClick={(event) => {
                                            if (event.detail === 0) {
                                                selectSegment(segment)
                                            }
                                        }}
                                    />
                                </div>
                            )
                        })}
                        {pending
                            .filter((interval) =>
                                overlaps(interval, windowStart, windowEnd)
                            )
                            .map((interval, index) => {
                                const startMinute = Math.max(
                                    windowStart,
                                    interval.startMinute
                                )
                                const endMinute = Math.min(
                                    windowEnd,
                                    interval.endMinute
                                )
                                const label =
                                    sourceLabels[interval.source] +
                                    " · " +
                                    minuteToTime(interval.startMinute) +
                                    "–" +
                                    minuteToTime(interval.endMinute) +
                                    " · " +
                                    interval.label
                                return (
                                    <span
                                        key={
                                            String(interval.startMinute) +
                                            "-" +
                                            String(interval.endMinute) +
                                            "-" +
                                            String(index)
                                        }
                                        role="img"
                                        tabIndex={0}
                                        aria-label={label}
                                        className="absolute inset-y-0 z-10 border-x border-amber-400 bg-amber-300/80"
                                        style={{
                                            left:
                                                String(percent(startMinute)) +
                                                "%",
                                            width:
                                                String(
                                                    percent(endMinute) -
                                                        percent(startMinute)
                                                ) + "%",
                                        }}
                                        onMouseEnter={() => {
                                            setHovered(null)
                                            setHoveredPending(interval)
                                        }}
                                        onMouseLeave={() =>
                                            setHoveredPending(null)
                                        }
                                        onFocus={() => {
                                            setHovered(null)
                                            setHoveredPending(interval)
                                        }}
                                        onBlur={() => setHoveredPending(null)}
                                    />
                                )
                            })}
                        {displayedSelection ? (
                            <span
                                className="pointer-events-none absolute inset-y-0 z-30 border-x-2 border-blue-700 bg-blue-500/90"
                                style={{
                                    left:
                                        String(
                                            percent(
                                                displayedSelection.startMinute
                                            )
                                        ) + "%",
                                    width:
                                        String(
                                            percent(
                                                displayedSelection.endMinute
                                            ) -
                                                percent(
                                                    displayedSelection.startMinute
                                                )
                                        ) + "%",
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
            {selectionError ? (
                <p className="mt-2 text-xs text-red-700" role="alert">
                    {selectionError}
                </p>
            ) : null}
        </div>
    )
}
