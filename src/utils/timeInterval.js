export function halfOpenOverlapWhere(startMinute, endMinute) {
    return {
        startMinute: { lt: endMinute },
        endMinute: { gt: startMinute },
    }
}

export function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
    return firstStart < secondEnd && secondStart < firstEnd
}

export function freeWindowsWithin(
    windowStart,
    windowEnd,
    blockingIntervals,
    minimumDuration
) {
    const merged = []
    const clipped = blockingIntervals
        .map((interval) => ({
            startMinute: Math.max(windowStart, interval.startMinute),
            endMinute: Math.min(windowEnd, interval.endMinute),
        }))
        .filter((interval) => interval.startMinute < interval.endMinute)
        .sort(
            (first, second) =>
                first.startMinute - second.startMinute ||
                first.endMinute - second.endMinute
        )

    for (const interval of clipped) {
        const previous = merged[merged.length - 1]
        if (!previous || interval.startMinute > previous.endMinute) {
            merged.push({ ...interval })
        } else {
            previous.endMinute = Math.max(
                previous.endMinute,
                interval.endMinute
            )
        }
    }

    const freeWindows = []
    let cursor = windowStart
    for (const interval of merged) {
        if (interval.startMinute - cursor >= minimumDuration) {
            freeWindows.push({
                startMinute: cursor,
                endMinute: interval.startMinute,
                durationMinutes: interval.startMinute - cursor,
            })
        }
        cursor = Math.max(cursor, interval.endMinute)
    }
    if (windowEnd - cursor >= minimumDuration) {
        freeWindows.push({
            startMinute: cursor,
            endMinute: windowEnd,
            durationMinutes: windowEnd - cursor,
        })
    }
    return freeWindows
}
