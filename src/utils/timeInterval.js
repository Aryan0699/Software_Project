export function halfOpenOverlapWhere(startMinute, endMinute) {
    return {
        startMinute: { lt: endMinute },
        endMinute: { gt: startMinute },
    }
}

export function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
    return firstStart < secondEnd && secondStart < firstEnd
}
