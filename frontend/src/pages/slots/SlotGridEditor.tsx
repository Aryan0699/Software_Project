import {
    AlertTriangle,
    Check,
    Clock3,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Slot, SlotDay, SlotGrid } from "@/lib/slotSystemsApi"
import { minuteToTime, timeToMinute } from "@/lib/time"

const days: Array<{ value: SlotDay; short: string; label: string }> = [
    { value: "MONDAY", short: "Mon", label: "Monday" },
    { value: "TUESDAY", short: "Tue", label: "Tuesday" },
    { value: "WEDNESDAY", short: "Wed", label: "Wednesday" },
    { value: "THURSDAY", short: "Thu", label: "Thursday" },
    { value: "FRIDAY", short: "Fri", label: "Friday" },
    { value: "SATURDAY", short: "Sat", label: "Saturday" },
    { value: "SUNDAY", short: "Sun", label: "Sunday" },
]

type TimeBand = { startMinute: number; endMinute: number }
type OccurrenceInput = TimeBand & { dayOfWeek: SlotDay }

const commonTimeBands: TimeBand[] = Array.from({ length: 10 }, (_, index) => ({
    startMinute: (index + 8) * 60,
    endMinute: (index + 9) * 60,
}))

function bandKey({ startMinute, endMinute }: TimeBand) {
    return `${startMinute}-${endMinute}`
}

function occurrenceMatches(
    occurrence: OccurrenceInput,
    dayOfWeek: SlotDay,
    band: TimeBand
) {
    return (
        occurrence.dayOfWeek === dayOfWeek &&
        occurrence.startMinute === band.startMinute &&
        occurrence.endMinute === band.endMinute
    )
}

export function SlotGridEditor({
    grid,
    activeSlotId,
    saving,
    overlapSlotIds,
    onSelectSlot,
    onAddSlot,
    onEditSlot,
    onDeleteSlot,
    onToggleOccurrence,
}: {
    grid: SlotGrid
    activeSlotId: string | null
    saving: boolean
    overlapSlotIds: Set<string>
    onSelectSlot: (slotId: string) => void
    onAddSlot: () => void
    onEditSlot: (slot: Slot) => void
    onDeleteSlot: (slot: Slot) => void
    onToggleOccurrence: (slot: Slot, occurrence: OccurrenceInput) => void
}) {
    const editable = grid.status === "DRAFT"
    const [customBands, setCustomBands] = useState<TimeBand[]>([])
    const [start, setStart] = useState("09:00")
    const [end, setEnd] = useState("10:00")
    const [timeError, setTimeError] = useState<string | null>(null)

    const timeBands = useMemo(() => {
        const byKey = new Map<string, TimeBand>()
        commonTimeBands.forEach((band) => byKey.set(bandKey(band), band))
        customBands.forEach((band) => byKey.set(bandKey(band), band))
        grid.slots.forEach((slot) =>
            slot.occurrences.forEach((occurrence) => {
                const band = {
                    startMinute: occurrence.startMinute,
                    endMinute: occurrence.endMinute,
                }
                byKey.set(bandKey(band), band)
            })
        )
        return Array.from(byKey.values()).sort(
            (first, second) =>
                first.startMinute - second.startMinute ||
                first.endMinute - second.endMinute
        )
    }, [customBands, grid.slots])

    const activeSlot =
        grid.slots.find((slot) => slot.id === activeSlotId) || null

    const addTimeBand = () => {
        const next = {
            startMinute: timeToMinute(start),
            endMinute: timeToMinute(end),
        }
        if (next.startMinute >= next.endMinute) {
            setTimeError("End time must be later than start time.")
            return
        }
        setTimeError(null)
        setCustomBands((bands) =>
            bands.some((band) => bandKey(band) === bandKey(next))
                ? bands
                : [...bands, next]
        )
    }

    return (
        <div className="space-y-5">
            <section aria-labelledby="slot-palette-title">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3
                            id="slot-palette-title"
                            className="text-sm font-semibold text-slate-900"
                        >
                            1. Select a slot
                        </h3>
                        <p className="text-xs text-slate-500">
                            The selected slot is assigned when you click an
                            empty grid cell.
                        </p>
                    </div>
                    {editable && (
                        <Button size="sm" onClick={onAddSlot}>
                            <Plus /> Add slot
                        </Button>
                    )}
                </div>

                {grid.slots.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
                        <p className="font-medium text-slate-800">
                            Add a slot to start building the grid
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            You only need a code and teaching type. Times are
                            assigned directly in the grid.
                        </p>
                        {editable && (
                            <Button className="mt-4" onClick={onAddSlot}>
                                <Plus /> Add first slot
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {grid.slots.map((slot) => {
                            const selected = slot.id === activeSlot?.id
                            const hasOverlap = overlapSlotIds.has(slot.id)
                            return (
                                <div
                                    key={slot.id}
                                    className={`flex min-w-40 items-center rounded-lg border transition-colors ${
                                        selected
                                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                                            : "border-slate-200 bg-white"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        disabled={!editable}
                                        aria-pressed={selected}
                                        onClick={() => onSelectSlot(slot.id)}
                                        className="min-w-0 flex-1 px-3 py-2 text-left disabled:cursor-default"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span className="font-semibold text-slate-900">
                                                {slot.code}
                                            </span>
                                            {selected && (
                                                <Check className="size-3.5 text-brand-700" />
                                            )}
                                            {hasOverlap && (
                                                <AlertTriangle className="size-3.5 text-amber-600" />
                                            )}
                                        </span>
                                        <span className="mt-0.5 block text-xs capitalize text-slate-500">
                                            {slot.slotKind.toLowerCase()} ·{" "}
                                            {slot.occurrences.length} time
                                            {slot.occurrences.length === 1
                                                ? ""
                                                : "s"}
                                        </span>
                                    </button>
                                    {editable && (
                                        <div className="flex border-l border-slate-200 px-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => onEditSlot(slot)}
                                                aria-label={`Edit ${slot.code}`}
                                            >
                                                <Pencil />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    onDeleteSlot(slot)
                                                }
                                                aria-label={`Delete ${slot.code}`}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {grid.slots.length > 0 && (
                <section aria-labelledby="weekly-grid-title">
                    <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <h3
                                id="weekly-grid-title"
                                className="text-sm font-semibold text-slate-900"
                            >
                                2. Assign weekly times
                            </h3>
                            <p className="text-xs text-slate-500">
                                {editable
                                    ? activeSlot
                                        ? `${activeSlot.code} is selected. Click a cell to add or remove it.`
                                        : "Select a slot above, then click its day and time cells."
                                    : "This active grid is read-only."}
                            </p>
                        </div>
                        {editable && (
                            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                <label>
                                    <span className="field-label">Starts</span>
                                    <Input
                                        className="h-8 w-28 bg-white"
                                        type="time"
                                        value={start}
                                        onChange={(event) =>
                                            setStart(event.target.value)
                                        }
                                    />
                                </label>
                                <label>
                                    <span className="field-label">Ends</span>
                                    <Input
                                        className="h-8 w-28 bg-white"
                                        type="time"
                                        value={end}
                                        onChange={(event) =>
                                            setEnd(event.target.value)
                                        }
                                    />
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addTimeBand}
                                >
                                    <Clock3 /> Add time row
                                </Button>
                            </div>
                        )}
                    </div>
                    {timeError && (
                        <p className="mb-2 text-sm text-red-700" role="alert">
                            {timeError}
                        </p>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[900px] border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="sticky left-0 z-20 w-32 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">
                                        Time
                                    </th>
                                    {days.map((day) => (
                                        <th
                                            key={day.value}
                                            scope="col"
                                            className="border-b border-slate-200 px-2 py-3 text-center"
                                            title={day.label}
                                        >
                                            {day.short}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {timeBands.map((band) => (
                                    <tr key={bandKey(band)}>
                                        <th
                                            scope="row"
                                            className="sticky left-0 z-10 whitespace-nowrap border-r border-t border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600"
                                        >
                                            {minuteToTime(band.startMinute)}–
                                            {minuteToTime(band.endMinute)}
                                        </th>
                                        {days.map((day) => {
                                            const assigned = grid.slots.filter(
                                                (slot) =>
                                                    slot.occurrences.some(
                                                        (occurrence) =>
                                                            occurrenceMatches(
                                                                occurrence,
                                                                day.value,
                                                                band
                                                            )
                                                    )
                                            )
                                            const activeAssigned = Boolean(
                                                activeSlot?.occurrences.some(
                                                    (occurrence) =>
                                                        occurrenceMatches(
                                                            occurrence,
                                                            day.value,
                                                            band
                                                        )
                                                )
                                            )
                                            const occupiedByOther =
                                                assigned.some(
                                                    (slot) =>
                                                        slot.id !==
                                                        activeSlot?.id
                                                )
                                            const canToggle =
                                                editable &&
                                                Boolean(activeSlot) &&
                                                (activeAssigned ||
                                                    !occupiedByOther)
                                            const title = !editable
                                                ? "Active grids are read-only"
                                                : !activeSlot
                                                  ? "Select a slot first"
                                                  : occupiedByOther &&
                                                      !activeAssigned
                                                    ? `Remove ${assigned.map((slot) => slot.code).join(", ")} first`
                                                    : activeAssigned
                                                      ? `Remove ${activeSlot.code}`
                                                      : `Assign ${activeSlot.code}`

                                            return (
                                                <td
                                                    key={day.value}
                                                    className="h-14 border-t border-l border-slate-200 p-1.5"
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            !canToggle || saving
                                                        }
                                                        title={title}
                                                        onClick={() =>
                                                            activeSlot &&
                                                            onToggleOccurrence(
                                                                activeSlot,
                                                                {
                                                                    dayOfWeek:
                                                                        day.value,
                                                                    ...band,
                                                                }
                                                            )
                                                        }
                                                        className={`flex h-full min-h-10 w-full items-center justify-center rounded-md border px-1.5 text-xs font-semibold transition-colors ${
                                                            activeAssigned
                                                                ? "border-brand-500 bg-brand-100 text-brand-900 hover:bg-brand-200"
                                                                : assigned.length >
                                                                    0
                                                                  ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-700"
                                                                  : canToggle
                                                                    ? "border-dashed border-slate-300 bg-white text-slate-400 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                                                                    : "border-transparent bg-slate-50 text-slate-300"
                                                        }`}
                                                    >
                                                        {assigned.length > 0
                                                            ? assigned
                                                                  .map(
                                                                      (slot) =>
                                                                          slot.code
                                                                  )
                                                                  .join(", ")
                                                            : canToggle
                                                              ? "+"
                                                              : ""}
                                                    </button>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <Badge variant="outline">
                            {grid.slots.length} slots
                        </Badge>
                        <span>
                            {grid.slots.reduce(
                                (total, slot) =>
                                    total + slot.occurrences.length,
                                0
                            )}{" "}
                            assigned weekly times
                        </span>
                    </div>
                </section>
            )}
        </div>
    )
}
