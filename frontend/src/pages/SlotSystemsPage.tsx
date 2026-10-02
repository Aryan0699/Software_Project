import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    CalendarRange,
    Check,
    Clock3,
    Copy,
    FileSpreadsheet,
    Grid3X3,
    Loader2,
    LockKeyhole,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { FormDialog } from "../components/FormDialog"
import { useToast } from "../components/toastContext"
import {
    errorMessage,
    slotSystemApi,
    type DayOfWeek,
    type SlotDefinition,
    type SlotGrid,
    type SlotKind,
} from "../lib/api"
import { minuteToTime } from "../lib/time"

const weekdayOptions: Array<{ key: DayOfWeek; label: string }> = [
    { key: "MONDAY", label: "Mon" },
    { key: "TUESDAY", label: "Tue" },
    { key: "WEDNESDAY", label: "Wed" },
    { key: "THURSDAY", label: "Thu" },
    { key: "FRIDAY", label: "Fri" },
]
const weekendOptions: Array<{ key: DayOfWeek; label: string }> = [
    { key: "SATURDAY", label: "Sat" },
    { key: "SUNDAY", label: "Sun" },
]

const slotKinds: Array<{ value: SlotKind; label: string }> = [
    { value: "LECTURE", label: "Lecture" },
    { value: "LAB", label: "Lab" },
    { value: "TUTORIAL", label: "Tutorial" },
    { value: "SPECIAL", label: "Special" },
]

const slotColors = [
    "border-sky-300 bg-sky-100 text-sky-900",
    "border-emerald-300 bg-emerald-100 text-emerald-900",
    "border-violet-300 bg-violet-100 text-violet-900",
    "border-amber-300 bg-amber-100 text-amber-900",
    "border-rose-300 bg-rose-100 text-rose-900",
    "border-cyan-300 bg-cyan-100 text-cyan-900",
]

function colorFor(code: string) {
    const value = [...code].reduce(
        (sum, character) => sum + character.charCodeAt(0),
        0
    )
    return slotColors[value % slotColors.length]
}

function minuteToInput(value: number) {
    const hours = Math.floor(value / 60)
    const minutes = value % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function inputToMinute(value: string) {
    const [hours, minutes] = value.split(":").map(Number)
    return hours * 60 + minutes
}

function periods(grid: SlotGrid) {
    const result: Array<{ start: number; end: number }> = []
    for (
        let start = grid.dayStartMinute;
        start + 50 <= grid.dayEndMinute;
        start += 60
    ) {
        result.push({ start, end: start + 50 })
    }
    return result
}

function ownerFor(grid: SlotGrid, day: DayOfWeek, start: number, end: number) {
    return grid.slots.find((slot) =>
        slot.occurrences.some(
            (occurrence) =>
                occurrence.dayOfWeek === day &&
                occurrence.startMinute <= start &&
                occurrence.endMinute >= end
        )
    )
}

type Confirmation =
    | { type: "LOCK"; grid: SlotGrid }
    | { type: "DISCARD"; grid: SlotGrid }
    | { type: "DELETE_SLOT"; grid: SlotGrid; slot: SlotDefinition }

export function SlotSystemsPage() {
    const client = useQueryClient()
    const { showToast } = useToast()
    const [systemId, setSystemId] = useState("")
    const [gridId, setGridId] = useState("")
    const [showWeekend, setShowWeekend] = useState(false)
    const [selectedSlotId, setSelectedSlotId] = useState("")
    const [systemDialog, setSystemDialog] = useState(false)
    const [systemDraft, setSystemDraft] = useState({
        name: "",
        code: "",
        description: "",
    })
    const [draftDialog, setDraftDialog] = useState(false)
    const [draftRange, setDraftRange] = useState({
        start: "08:00",
        end: "18:50",
    })
    const [rangeDialog, setRangeDialog] = useState(false)
    const [rangeDraft, setRangeDraft] = useState({
        start: "08:00",
        end: "18:50",
    })
    const [slotDialog, setSlotDialog] = useState<SlotDefinition | "NEW" | null>(
        null
    )
    const [slotDraft, setSlotDraft] = useState<{
        code: string
        slotKind: SlotKind
    }>({
        code: "",
        slotKind: "LECTURE",
    })
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

    const systemsQuery = useQuery({
        queryKey: ["slot-systems"],
        queryFn: () => slotSystemApi.list(),
    })
    const systems = useMemo(
        () => systemsQuery.data?.slotSystems || [],
        [systemsQuery.data?.slotSystems]
    )
    const effectiveSystemId = systems.some((system) => system.id === systemId)
        ? systemId
        : systems[0]?.id || ""
    const selectedSystem = systems.find(
        (system) => system.id === effectiveSystemId
    )
    const usableVersions = (selectedSystem?.gridVersions || []).filter(
        (grid) => grid.status !== "DISCARDED"
    )

    const effectiveGridId = usableVersions.some((grid) => grid.id === gridId)
        ? gridId
        : (
              usableVersions.find((grid) => grid.status === "DRAFT") ||
              usableVersions[0]
          )?.id || ""

    const gridQuery = useQuery({
        queryKey: ["slot-grid", effectiveGridId],
        queryFn: () => slotSystemApi.getGrid(effectiveGridId),
        enabled: Boolean(effectiveGridId),
    })
    const grid = gridQuery.data?.grid
    const effectiveSelectedSlotId = grid?.slots.some(
        (slot) => slot.id === selectedSlotId
    )
        ? selectedSlotId
        : grid?.slots[0]?.id || ""

    const refresh = async (nextGrid?: SlotGrid) => {
        await client.invalidateQueries({ queryKey: ["slot-systems"] })
        if (nextGrid) {
            client.setQueryData(["slot-grid", nextGrid.id], { grid: nextGrid })
            setGridId(nextGrid.id)
        } else if (effectiveGridId) {
            await client.invalidateQueries({
                queryKey: ["slot-grid", effectiveGridId],
            })
        }
    }

    const createSystem = useMutation({
        mutationFn: () =>
            slotSystemApi.create({
                code: systemDraft.code,
                name: systemDraft.name,
                description: systemDraft.description || null,
            }),
        onSuccess: async ({ slotSystem }) => {
            showToast("success", "Slot system created")
            setSystemDialog(false)
            setSystemDraft({ name: "", code: "", description: "" })
            await refresh()
            setSystemId(slotSystem.id)
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const createDraft = useMutation({
        mutationFn: (sourceGridVersionId?: string) => {
            if (!selectedSystem) throw new Error("Choose a slot system")
            return slotSystemApi.createDraft(selectedSystem.id, {
                ...(sourceGridVersionId ? { sourceGridVersionId } : {}),
                dayStartMinute: inputToMinute(draftRange.start),
                dayEndMinute: inputToMinute(draftRange.end),
            })
        },
        onSuccess: async ({ grid: nextGrid }) => {
            showToast(
                "success",
                nextGrid.basedOnVersionId
                    ? "Draft cloned"
                    : "Blank draft created"
            )
            setDraftDialog(false)
            await refresh(nextGrid)
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const updateRange = useMutation({
        mutationFn: () => {
            if (!grid) throw new Error("Open a grid first")
            return slotSystemApi.updateRange(grid.id, {
                dayStartMinute: inputToMinute(rangeDraft.start),
                dayEndMinute: inputToMinute(rangeDraft.end),
            })
        },
        onSuccess: async ({ grid: nextGrid }) => {
            showToast("success", "Grid hours updated")
            setRangeDialog(false)
            await refresh(nextGrid)
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const saveSlot = useMutation({
        mutationFn: () => {
            if (!grid) throw new Error("Open a draft first")
            return slotDialog === "NEW"
                ? slotSystemApi.createSlot(grid.id, slotDraft)
                : slotSystemApi.updateSlot(
                      grid.id,
                      (slotDialog as SlotDefinition).id,
                      slotDraft
                  )
        },
        onSuccess: async ({ grid: nextGrid }) => {
            showToast(
                "success",
                slotDialog === "NEW" ? "Slot created" : "Slot updated"
            )
            setSlotDialog(null)
            await refresh(nextGrid)
            const selected = nextGrid.slots.find(
                (slot) => slot.code === slotDraft.code.toUpperCase()
            )
            if (selected) setSelectedSlotId(selected.id)
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const toggleCell = useMutation({
        mutationFn: (value: { dayOfWeek: DayOfWeek; startMinute: number }) => {
            if (!grid || !effectiveSelectedSlotId)
                throw new Error("Select a slot first")
            return slotSystemApi.toggleCell(grid.id, {
                slotId: effectiveSelectedSlotId,
                ...value,
            })
        },
        onSuccess: ({ grid: nextGrid }) => {
            client.setQueryData(["slot-grid", nextGrid.id], { grid: nextGrid })
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const confirmMutation = useMutation({
        mutationFn: async () => {
            if (!confirmation) throw new Error("Nothing selected")
            if (confirmation.type === "LOCK")
                return slotSystemApi.lock(confirmation.grid.id)
            if (confirmation.type === "DISCARD") {
                await slotSystemApi.discard(confirmation.grid.id)
                return null
            }
            return slotSystemApi.deleteSlot(
                confirmation.grid.id,
                confirmation.slot.id
            )
        },
        onSuccess: async (result) => {
            const action = confirmation?.type
            setConfirmation(null)
            showToast(
                "success",
                action === "LOCK"
                    ? "Grid locked for timetable use"
                    : action === "DISCARD"
                      ? "Draft discarded"
                      : "Slot deleted"
            )
            await refresh(result?.grid)
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const visibleDays = useMemo(
        () =>
            showWeekend
                ? [...weekdayOptions, ...weekendOptions]
                : weekdayOptions,
        [showWeekend]
    )
    const selectedSlot = grid?.slots.find(
        (slot) => slot.id === effectiveSelectedSlotId
    )
    const hasDraft = usableVersions.some(
        (version) => version.status === "DRAFT"
    )

    const submitSystem = (event: FormEvent) => {
        event.preventDefault()
        createSystem.mutate()
    }
    const submitSlot = (event: FormEvent) => {
        event.preventDefault()
        saveSlot.mutate()
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="page-title">Slot systems</h1>
                    <p className="page-subtitle">
                        Build the weekly grids used to interpret timetable
                        workbooks.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/admin/timetables/imports"
                        className="button-secondary"
                    >
                        <FileSpreadsheet className="size-4" /> Import timetable
                    </Link>
                    <button
                        type="button"
                        className="button-primary"
                        onClick={() => setSystemDialog(true)}
                    >
                        <Plus className="size-4" /> New slot system
                    </button>
                </div>
            </header>

            {systemsQuery.isLoading ? (
                <div className="flex min-h-56 items-center justify-center rounded-md border bg-white">
                    <Loader2 className="size-5 animate-spin text-brand-600" />
                </div>
            ) : systems.length === 0 ? (
                <div className="rounded-md border border-dashed bg-white px-6 py-16 text-center">
                    <Grid3X3 className="mx-auto size-8 text-slate-400" />
                    <h2 className="mt-3 font-semibold text-slate-900">
                        Create your first slot system
                    </h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                        Start with the name used by your institution. No First
                        Year or Second Year system is assumed.
                    </p>
                    <button
                        type="button"
                        className="button-primary mt-5"
                        onClick={() => setSystemDialog(true)}
                    >
                        <Plus className="size-4" /> Create slot system
                    </button>
                </div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
                    <aside className="space-y-2">
                        {systems.map((system) => {
                            const current = system.id === effectiveSystemId
                            const draft = system.gridVersions.find(
                                (item) => item.status === "DRAFT"
                            )
                            return (
                                <button
                                    key={system.id}
                                    type="button"
                                    onClick={() => setSystemId(system.id)}
                                    className={`w-full rounded-md border p-4 text-left transition-colors ${
                                        current
                                            ? "border-brand-500 bg-brand-50"
                                            : "bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-slate-950">
                                            {system.name}
                                        </p>
                                        {draft ? (
                                            <span className="status-badge border-amber-200 bg-amber-50 text-amber-700">
                                                Draft
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {system.code}
                                    </p>
                                    <p className="mt-3 text-xs text-slate-500">
                                        {system.gridVersions.length} grid
                                        version
                                        {system.gridVersions.length === 1
                                            ? ""
                                            : "s"}
                                    </p>
                                </button>
                            )
                        })}
                    </aside>

                    <section className="min-w-0 space-y-4">
                        <div className="rounded-md border bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-950">
                                        {selectedSystem?.name}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {selectedSystem?.description ||
                                            "Weekly academic slot configuration"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {usableVersions.length ? (
                                        <select
                                            className="field-select w-auto min-w-40"
                                            value={effectiveGridId}
                                            onChange={(event) =>
                                                setGridId(event.target.value)
                                            }
                                            aria-label="Grid version"
                                        >
                                            {usableVersions.map((version) => (
                                                <option
                                                    key={version.id}
                                                    value={version.id}
                                                >
                                                    Version{" "}
                                                    {version.versionNumber} ·{" "}
                                                    {version.isPublished
                                                        ? "published"
                                                        : version.status.toLowerCase()}
                                                </option>
                                            ))}
                                        </select>
                                    ) : null}
                                    {!hasDraft ? (
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => setDraftDialog(true)}
                                        >
                                            <Plus className="size-4" /> Blank
                                            draft
                                        </button>
                                    ) : null}
                                    {grid?.status === "LOCKED" && !hasDraft ? (
                                        <button
                                            type="button"
                                            className="button-primary"
                                            disabled={createDraft.isPending}
                                            onClick={() =>
                                                createDraft.mutate(grid.id)
                                            }
                                        >
                                            <Copy className="size-4" /> Clone
                                            this grid
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {!effectiveGridId ? (
                            <div className="rounded-md border border-dashed bg-white px-6 py-14 text-center">
                                <CalendarRange className="mx-auto size-8 text-slate-400" />
                                <h3 className="mt-3 font-semibold">
                                    No grid yet
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Create a blank draft and define its
                                    operating hours.
                                </p>
                                <button
                                    type="button"
                                    className="button-primary mt-5"
                                    onClick={() => setDraftDialog(true)}
                                >
                                    Create blank draft
                                </button>
                            </div>
                        ) : gridQuery.isLoading || !grid ? (
                            <div className="flex min-h-64 items-center justify-center rounded-md border bg-white">
                                <Loader2 className="size-5 animate-spin text-brand-600" />
                            </div>
                        ) : (
                            <div className="rounded-md border bg-white shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b p-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-slate-950">
                                                {grid.isPublished
                                                    ? "Published grid"
                                                    : grid.status === "LOCKED"
                                                      ? "Locked grid"
                                                      : "Draft grid"}{" "}
                                                · Version {grid.versionNumber}
                                            </h3>
                                            <span
                                                className={`status-badge ${grid.status === "DRAFT" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}
                                            >
                                                {grid.status.toLowerCase()}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {grid.status === "DRAFT"
                                                ? "Choose a slot, then click cells to assign or remove periods."
                                                : "This version is read-only. Clone it to make changes."}
                                        </p>
                                    </div>
                                    {grid.status === "DRAFT" ? (
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="button-secondary"
                                                onClick={() => {
                                                    setRangeDraft({
                                                        start: minuteToInput(
                                                            grid.dayStartMinute
                                                        ),
                                                        end: minuteToInput(
                                                            grid.dayEndMinute
                                                        ),
                                                    })
                                                    setRangeDialog(true)
                                                }}
                                            >
                                                <Clock3 className="size-4" />{" "}
                                                Grid hours
                                            </button>
                                            <button
                                                type="button"
                                                className="button-secondary"
                                                onClick={() =>
                                                    setConfirmation({
                                                        type: "DISCARD",
                                                        grid,
                                                    })
                                                }
                                            >
                                                <Trash2 className="size-4" />{" "}
                                                Discard
                                            </button>
                                            <button
                                                type="button"
                                                className="button-primary"
                                                onClick={() =>
                                                    setConfirmation({
                                                        type: "LOCK",
                                                        grid,
                                                    })
                                                }
                                            >
                                                <LockKeyhole className="size-4" />{" "}
                                                Lock for use
                                            </button>
                                        </div>
                                    ) : null}
                                </div>

                                {grid.overlapWarnings.length ? (
                                    <div className="m-4 inline-alert border-amber-200 bg-amber-50 text-amber-800">
                                        {grid.overlapWarnings.length}{" "}
                                        overlapping occurrence
                                        {grid.overlapWarnings.length === 1
                                            ? ""
                                            : "s"}{" "}
                                        must be resolved before locking.
                                    </div>
                                ) : null}

                                <div className="border-b p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Slots
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {selectedSlot
                                                    ? `${selectedSlot.code} selected`
                                                    : "Create and select a slot to begin"}
                                            </p>
                                        </div>
                                        {grid.status === "DRAFT" ? (
                                            <button
                                                type="button"
                                                className="button-secondary"
                                                onClick={() => {
                                                    setSlotDraft({
                                                        code: "",
                                                        slotKind: "LECTURE",
                                                    })
                                                    setSlotDialog("NEW")
                                                }}
                                            >
                                                <Plus className="size-4" /> Add
                                                slot
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {grid.slots.map((slot) => (
                                            <div
                                                key={slot.id}
                                                className="flex items-center"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedSlotId(
                                                            slot.id
                                                        )
                                                    }
                                                    className={`min-h-9 rounded-l-md border px-3 text-sm font-semibold ${colorFor(slot.code)} ${effectiveSelectedSlotId === slot.id ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
                                                >
                                                    {slot.code}
                                                </button>
                                                {grid.status === "DRAFT" ? (
                                                    <button
                                                        type="button"
                                                        className="flex min-h-9 items-center rounded-r-md border border-l-0 bg-white px-2 text-slate-500 hover:bg-slate-50"
                                                        aria-label={`Edit slot ${slot.code}`}
                                                        onClick={() => {
                                                            setSlotDraft({
                                                                code: slot.code,
                                                                slotKind:
                                                                    slot.slotKind,
                                                            })
                                                            setSlotDialog(slot)
                                                        }}
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        ))}
                                        {!grid.slots.length ? (
                                            <p className="text-sm text-slate-500">
                                                No slots created.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                    <p className="text-sm text-slate-600">
                                        {minuteToTime(grid.dayStartMinute)}–
                                        {minuteToTime(grid.dayEndMinute)} ·
                                        50-minute periods
                                    </p>
                                    <label className="flex min-h-10 items-center gap-2 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={showWeekend}
                                            onChange={(event) =>
                                                setShowWeekend(
                                                    event.target.checked
                                                )
                                            }
                                        />
                                        Show weekend
                                    </label>
                                </div>

                                <div className="overflow-x-auto border-t">
                                    <table className="min-w-[760px] w-full border-collapse text-sm">
                                        <thead>
                                            <tr>
                                                <th className="sticky left-0 z-10 w-32 border-b border-r bg-slate-50 px-3 py-3 text-left text-xs font-semibold text-slate-600">
                                                    Period
                                                </th>
                                                {visibleDays.map((day) => (
                                                    <th
                                                        key={day.key}
                                                        className="min-w-28 border-b border-r bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-700 last:border-r-0"
                                                    >
                                                        {day.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {periods(grid).map((period) => (
                                                <tr key={period.start}>
                                                    <th className="sticky left-0 z-10 border-b border-r bg-white px-3 py-3 text-left text-xs font-medium text-slate-600">
                                                        {minuteToTime(
                                                            period.start
                                                        )}
                                                        –
                                                        {minuteToTime(
                                                            period.end
                                                        )}
                                                    </th>
                                                    {visibleDays.map((day) => {
                                                        const owner = ownerFor(
                                                            grid,
                                                            day.key,
                                                            period.start,
                                                            period.end
                                                        )
                                                        const chosen =
                                                            owner?.id ===
                                                            effectiveSelectedSlotId
                                                        return (
                                                            <td
                                                                key={day.key}
                                                                className="border-b border-r p-1.5 last:border-r-0"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        grid.status !==
                                                                            "DRAFT" ||
                                                                        toggleCell.isPending
                                                                    }
                                                                    onClick={() => {
                                                                        if (
                                                                            owner &&
                                                                            !chosen
                                                                        ) {
                                                                            setSelectedSlotId(
                                                                                owner.id
                                                                            )
                                                                            return
                                                                        }
                                                                        if (
                                                                            !effectiveSelectedSlotId
                                                                        ) {
                                                                            showToast(
                                                                                "error",
                                                                                "Select a slot first"
                                                                            )
                                                                            return
                                                                        }
                                                                        toggleCell.mutate(
                                                                            {
                                                                                dayOfWeek:
                                                                                    day.key,
                                                                                startMinute:
                                                                                    period.start,
                                                                            }
                                                                        )
                                                                    }}
                                                                    className={`flex min-h-11 w-full items-center justify-center rounded-md border text-sm font-semibold transition-colors ${
                                                                        owner
                                                                            ? colorFor(
                                                                                  owner.code
                                                                              )
                                                                            : grid.status ===
                                                                                "DRAFT"
                                                                              ? "border-dashed border-slate-200 bg-slate-50 text-slate-300 hover:border-brand-300 hover:bg-brand-50"
                                                                              : "border-transparent bg-slate-50 text-slate-300"
                                                                    } ${chosen ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
                                                                    title={
                                                                        owner
                                                                            ? `${owner.code} · ${owner.slotKind.toLowerCase()}`
                                                                            : selectedSlot
                                                                              ? `Assign ${selectedSlot.code}`
                                                                              : "Select a slot first"
                                                                    }
                                                                >
                                                                    {owner?.code ||
                                                                        "+"}
                                                                </button>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {grid.status === "DRAFT" && selectedSlot ? (
                                    <div className="flex items-center gap-2 border-t bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                        <Check className="size-4 text-brand-600" />
                                        Click empty cells to assign{" "}
                                        {selectedSlot.code}; click its filled
                                        cells again to remove them. Consecutive
                                        cells become one continuous occurrence.
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </section>
                </div>
            )}

            <FormDialog
                open={systemDialog}
                title="Create slot system"
                description="Use the name administrators recognize in timetable workbooks."
                onClose={() => setSystemDialog(false)}
            >
                <form className="space-y-4" onSubmit={submitSystem}>
                    <label className="block">
                        <span className="field-label">Name</span>
                        <input
                            className="field-input"
                            required
                            value={systemDraft.name}
                            onChange={(event) =>
                                setSystemDraft((value) => ({
                                    ...value,
                                    name: event.target.value,
                                }))
                            }
                            placeholder="B.Tech. second year onward"
                        />
                    </label>
                    <label className="block">
                        <span className="field-label">Code</span>
                        <input
                            className="field-input uppercase"
                            required
                            value={systemDraft.code}
                            onChange={(event) =>
                                setSystemDraft((value) => ({
                                    ...value,
                                    code: event.target.value,
                                }))
                            }
                            placeholder="BTECH_SECOND_YEAR"
                        />
                    </label>
                    <label className="block">
                        <span className="field-label">
                            Description{" "}
                            <span className="font-normal text-slate-400">
                                Optional
                            </span>
                        </span>
                        <textarea
                            className="field-input min-h-20 py-2"
                            value={systemDraft.description}
                            onChange={(event) =>
                                setSystemDraft((value) => ({
                                    ...value,
                                    description: event.target.value,
                                }))
                            }
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setSystemDialog(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="button-primary"
                            disabled={createSystem.isPending}
                        >
                            {createSystem.isPending
                                ? "Creating…"
                                : "Create system"}
                        </button>
                    </div>
                </form>
            </FormDialog>

            <FormDialog
                open={draftDialog}
                title="Create blank draft"
                description="Choose the first and last teaching period shown in this grid."
                onClose={() => setDraftDialog(false)}
            >
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        createDraft.mutate(undefined)
                    }}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="field-label">
                                First period starts
                            </span>
                            <input
                                type="time"
                                className="field-input"
                                value={draftRange.start}
                                onChange={(event) =>
                                    setDraftRange((value) => ({
                                        ...value,
                                        start: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            <span className="field-label">
                                Last period ends
                            </span>
                            <input
                                type="time"
                                className="field-input"
                                value={draftRange.end}
                                onChange={(event) =>
                                    setDraftRange((value) => ({
                                        ...value,
                                        end: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                    <p className="text-xs text-slate-500">
                        Periods are 50 minutes with a 10-minute institutional
                        gap.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setDraftDialog(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="button-primary"
                            disabled={createDraft.isPending}
                        >
                            Create draft
                        </button>
                    </div>
                </form>
            </FormDialog>

            <FormDialog
                open={rangeDialog}
                title="Grid hours"
                description="Existing assigned periods must remain inside the new range."
                onClose={() => setRangeDialog(false)}
            >
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        updateRange.mutate()
                    }}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="field-label">
                                First period starts
                            </span>
                            <input
                                type="time"
                                className="field-input"
                                value={rangeDraft.start}
                                onChange={(event) =>
                                    setRangeDraft((value) => ({
                                        ...value,
                                        start: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label>
                            <span className="field-label">
                                Last period ends
                            </span>
                            <input
                                type="time"
                                className="field-input"
                                value={rangeDraft.end}
                                onChange={(event) =>
                                    setRangeDraft((value) => ({
                                        ...value,
                                        end: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setRangeDialog(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="button-primary"
                            disabled={updateRange.isPending}
                        >
                            Save hours
                        </button>
                    </div>
                </form>
            </FormDialog>

            <FormDialog
                open={slotDialog !== null}
                title={slotDialog === "NEW" ? "Create slot" : "Edit slot"}
                description="After saving, select the slot and assign its weekly periods in the grid."
                onClose={() => setSlotDialog(null)}
            >
                <form className="space-y-4" onSubmit={submitSlot}>
                    <label className="block">
                        <span className="field-label">Code</span>
                        <input
                            className="field-input uppercase"
                            required
                            value={slotDraft.code}
                            onChange={(event) =>
                                setSlotDraft((value) => ({
                                    ...value,
                                    code: event.target.value,
                                }))
                            }
                            placeholder="AK"
                        />
                    </label>
                    <label className="block">
                        <span className="field-label">Kind</span>
                        <select
                            className="field-select"
                            value={slotDraft.slotKind}
                            onChange={(event) =>
                                setSlotDraft((value) => ({
                                    ...value,
                                    slotKind: event.target.value as SlotKind,
                                }))
                            }
                        >
                            {slotKinds.map((kind) => (
                                <option key={kind.value} value={kind.value}>
                                    {kind.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    {slotDialog !== "NEW" && slotDialog ? (
                        <button
                            type="button"
                            className="button-quiet px-0 text-red-600 hover:bg-transparent hover:text-red-700"
                            onClick={() => {
                                setConfirmation({
                                    type: "DELETE_SLOT",
                                    grid: grid as SlotGrid,
                                    slot: slotDialog,
                                })
                                setSlotDialog(null)
                            }}
                        >
                            <Trash2 className="size-4" /> Delete slot
                        </button>
                    ) : null}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setSlotDialog(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="button-primary"
                            disabled={saveSlot.isPending}
                        >
                            Save slot
                        </button>
                    </div>
                </form>
            </FormDialog>

            <ConfirmDialog
                open={confirmation !== null}
                title={
                    confirmation?.type === "LOCK"
                        ? "Lock this grid?"
                        : confirmation?.type === "DISCARD"
                          ? "Discard this draft?"
                          : "Delete this slot?"
                }
                description={
                    confirmation?.type === "LOCK"
                        ? "The grid will become read-only and available for timetable imports. Create a cloned revision for future changes."
                        : confirmation?.type === "DISCARD"
                          ? "This draft and all of its slot assignments will no longer be editable."
                          : `Slot ${confirmation?.type === "DELETE_SLOT" ? confirmation.slot.code : ""} and all of its weekly periods will be removed.`
                }
                confirmLabel={
                    confirmation?.type === "LOCK"
                        ? "Lock grid"
                        : confirmation?.type === "DISCARD"
                          ? "Discard draft"
                          : "Delete slot"
                }
                destructive={confirmation?.type !== "LOCK"}
                busy={confirmMutation.isPending}
                onClose={() => setConfirmation(null)}
                onConfirm={() => confirmMutation.mutate()}
            />
        </div>
    )
}
