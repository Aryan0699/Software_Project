import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    CopyPlus,
    Layers3,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Trash2,
} from "lucide-react"
import { useState } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/toastContext"
import { errorMessage } from "@/lib/api"
import {
    slotSystemsApi,
    type Slot,
    type SlotDay,
    type SlotInput,
    type SlotSystem,
    type SlotSystemInput,
} from "@/lib/slotSystemsApi"
import { minuteToTime } from "@/lib/time"
import {
    SlotEditorDialog,
    type SlotDefinitionInput,
} from "./slots/SlotEditorDialog"
import { SlotGridEditor } from "./slots/SlotGridEditor"
import { SlotSystemDialog } from "./slots/SlotSystemDialog"

const dayLabels = {
    SUNDAY: "Sun",
    MONDAY: "Mon",
    TUESDAY: "Tue",
    WEDNESDAY: "Wed",
    THURSDAY: "Thu",
    FRIDAY: "Fri",
    SATURDAY: "Sat",
}

function GridStatus({ status }: { status: "DRAFT" | "LOCKED" | "DISCARDED" }) {
    if (status === "DRAFT") {
        return (
            <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                Draft
            </Badge>
        )
    }
    if (status === "LOCKED") {
        return (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                Active
            </Badge>
        )
    }
    return <Badge variant="secondary">Discarded</Badge>
}

export function SlotSystemsPage() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [gridBySystem, setGridBySystem] = useState<Record<string, string>>({})
    const [systemEditor, setSystemEditor] = useState<SlotSystem | "NEW" | null>(
        null
    )
    const [slotEditor, setSlotEditor] = useState<Slot | "NEW" | null>(null)
    const [deletingSlot, setDeletingSlot] = useState<Slot | null>(null)
    const [discardOpen, setDiscardOpen] = useState(false)
    const [activateOpen, setActivateOpen] = useState(false)
    const [activeSlotId, setActiveSlotId] = useState<string | null>(null)

    const systemsQuery = useQuery({
        queryKey: ["slot-systems"],
        queryFn: () => slotSystemsApi.list({ pageSize: 100 }),
    })
    const systems = systemsQuery.data?.records || []
    const selectedSystem =
        systems.find((system) => system.id === selectedId) ||
        systems.find((system) => system.isActive) ||
        systems[0] ||
        null
    const draft = selectedSystem?.gridVersions.find(
        (grid) => grid.status === "DRAFT"
    )
    const latestLocked = selectedSystem?.gridVersions.find(
        (grid) => grid.status === "LOCKED"
    )
    const selectedGridSummary = selectedSystem
        ? selectedSystem.gridVersions.find(
              (grid) => grid.id === gridBySystem[selectedSystem.id]
          ) ||
          draft ||
          selectedSystem.gridVersions[0] ||
          null
        : null

    const gridQuery = useQuery({
        queryKey: ["slot-grid", selectedSystem?.id, selectedGridSummary?.id],
        queryFn: () =>
            slotSystemsApi.getGrid(selectedSystem!.id, selectedGridSummary!.id),
        enabled: Boolean(selectedSystem && selectedGridSummary),
    })
    const grid = gridQuery.data?.grid

    const refreshSystems = () =>
        queryClient.invalidateQueries({ queryKey: ["slot-systems"] })
    const refreshGrid = () =>
        queryClient.invalidateQueries({
            queryKey: [
                "slot-grid",
                selectedSystem?.id,
                selectedGridSummary?.id,
            ],
        })

    const systemSave = useMutation({
        mutationFn: (data: SlotSystemInput) =>
            systemEditor === "NEW"
                ? slotSystemsApi.create(data)
                : slotSystemsApi.update((systemEditor as SlotSystem).id, data),
        onSuccess: async ({ slotSystem }) => {
            setSelectedId(slotSystem.id)
            setSystemEditor(null)
            showToast(
                "success",
                systemEditor === "NEW"
                    ? "Slot system added"
                    : "Slot system updated"
            )
            await refreshSystems()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const toggleSystem = useMutation({
        mutationFn: (system: SlotSystem) =>
            slotSystemsApi.update(system.id, { isActive: !system.isActive }),
        onSuccess: async ({ slotSystem }) => {
            showToast(
                "success",
                slotSystem.isActive
                    ? "Slot system reactivated"
                    : "Slot system deactivated"
            )
            await refreshSystems()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const createGrid = useMutation({
        mutationFn: (basedOnVersionId?: string) =>
            slotSystemsApi.createGrid(selectedSystem!.id, basedOnVersionId),
        onSuccess: async ({ grid: createdGrid }) => {
            setGridBySystem((value) => ({
                ...value,
                [createdGrid.slotSystemId]: createdGrid.id,
            }))
            showToast(
                "success",
                createdGrid.basedOnVersionId
                    ? "Editable grid copied from the published version"
                    : "Empty draft grid created"
            )
            await refreshSystems()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const discardGrid = useMutation({
        mutationFn: () =>
            slotSystemsApi.discardGrid(selectedSystem!.id, grid!.id),
        onSuccess: async ({ grid: discarded }) => {
            setDiscardOpen(false)
            setGridBySystem((value) => ({
                ...value,
                [discarded.slotSystemId]: discarded.id,
            }))
            showToast(
                "success",
                `Draft version ${discarded.versionNumber} discarded`
            )
            await refreshSystems()
            await refreshGrid()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const activateGrid = useMutation({
        mutationFn: () =>
            slotSystemsApi.activateInitialGrid(selectedSystem!.id, grid!.id),
        onSuccess: async ({ grid: activated }) => {
            setActivateOpen(false)
            queryClient.setQueryData(
                ["slot-grid", activated.slotSystemId, activated.id],
                { grid: activated }
            )
            showToast("success", "Weekly grid activated")
            await refreshSystems()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const saveSlot = useMutation({
        mutationFn: (data: SlotDefinitionInput) => {
            const slotInput: SlotInput = {
                ...data,
                occurrences:
                    slotEditor === "NEW"
                        ? []
                        : (slotEditor as Slot).occurrences.map(
                              ({ dayOfWeek, startMinute, endMinute }) => ({
                                  dayOfWeek,
                                  startMinute,
                                  endMinute,
                              })
                          ),
            }
            return slotEditor === "NEW"
                ? slotSystemsApi.createSlot(
                      selectedSystem!.id,
                      grid!.id,
                      slotInput
                  )
                : slotSystemsApi.updateSlot(
                      selectedSystem!.id,
                      grid!.id,
                      (slotEditor as Slot).id,
                      slotInput
                  )
        },
        onSuccess: async ({ slot, grid: updatedGrid }) => {
            showToast(
                "success",
                slotEditor === "NEW" ? "Slot added" : "Slot updated"
            )
            setActiveSlotId(slot.id)
            queryClient.setQueryData(
                ["slot-grid", updatedGrid.slotSystemId, updatedGrid.id],
                { grid: updatedGrid }
            )
            setSlotEditor(null)
            await refreshSystems()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const toggleOccurrence = useMutation({
        mutationFn: ({
            slot,
            occurrence,
        }: {
            slot: Slot
            occurrence: {
                dayOfWeek: SlotDay
                startMinute: number
                endMinute: number
            }
        }) => {
            const exists = slot.occurrences.some(
                (item) =>
                    item.dayOfWeek === occurrence.dayOfWeek &&
                    item.startMinute === occurrence.startMinute &&
                    item.endMinute === occurrence.endMinute
            )
            const occurrences = exists
                ? slot.occurrences
                      .filter(
                          (item) =>
                              !(
                                  item.dayOfWeek === occurrence.dayOfWeek &&
                                  item.startMinute === occurrence.startMinute &&
                                  item.endMinute === occurrence.endMinute
                              )
                      )
                      .map(({ dayOfWeek, startMinute, endMinute }) => ({
                          dayOfWeek,
                          startMinute,
                          endMinute,
                      }))
                : [
                      ...slot.occurrences.map(
                          ({ dayOfWeek, startMinute, endMinute }) => ({
                              dayOfWeek,
                              startMinute,
                              endMinute,
                          })
                      ),
                      occurrence,
                  ]

            return slotSystemsApi.updateSlot(
                selectedSystem!.id,
                grid!.id,
                slot.id,
                { code: slot.code, slotKind: slot.slotKind, occurrences }
            )
        },
        onSuccess: ({ grid: updatedGrid }) => {
            queryClient.setQueryData(
                ["slot-grid", updatedGrid.slotSystemId, updatedGrid.id],
                { grid: updatedGrid }
            )
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const deleteSlot = useMutation({
        mutationFn: () =>
            slotSystemsApi.deleteSlot(
                selectedSystem!.id,
                grid!.id,
                deletingSlot!.id
            ),
        onSuccess: async () => {
            showToast("success", "Slot deleted")
            if (deletingSlot?.id === activeSlotId) setActiveSlotId(null)
            setDeletingSlot(null)
            await refreshGrid()
            await refreshSystems()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const overlapSlotIds = new Set(
        grid?.overlaps.flatMap((overlap) => [
            overlap.first.slotId,
            overlap.second.slotId,
        ]) || []
    )
    const incompleteSlotCount =
        grid?.slots.filter((slot) => slot.occurrences.length === 0).length || 0

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="page-title">Slot systems</h1>
                    <p className="page-subtitle">
                        Build reusable weekly grids. Active grids remain
                        read-only while changes stay in a draft.
                    </p>
                </div>
                <Button onClick={() => setSystemEditor("NEW")}>
                    <Plus /> Add slot system
                </Button>
            </header>

            {systemsQuery.isLoading ? (
                <Card>
                    <CardContent className="py-10 text-center text-slate-500">
                        Loading slot systems…
                    </CardContent>
                </Card>
            ) : systemsQuery.isError ? (
                <Card>
                    <CardContent className="py-10 text-center text-red-700">
                        {errorMessage(systemsQuery.error)}
                    </CardContent>
                </Card>
            ) : systems.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <Layers3 className="size-8 text-slate-400" />
                        <div>
                            <p className="font-semibold text-slate-900">
                                No slot systems yet
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Add a system, then create its first weekly grid.
                            </p>
                        </div>
                        <Button onClick={() => setSystemEditor("NEW")}>
                            <Plus /> Add slot system
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
                    <aside className="space-y-2" aria-label="Slot systems">
                        {systems.map((system) => {
                            const systemDraft = system.gridVersions.find(
                                (item) => item.status === "DRAFT"
                            )
                            const selected = system.id === selectedSystem?.id
                            return (
                                <button
                                    type="button"
                                    key={system.id}
                                    onClick={() => setSelectedId(system.id)}
                                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                        selected
                                            ? "border-brand-500 bg-brand-50 shadow-sm"
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <span className="flex items-start justify-between gap-2">
                                        <span className="font-semibold text-slate-900">
                                            {system.name}
                                        </span>
                                        <span
                                            className={`mt-1 size-2 shrink-0 rounded-full ${system.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                                        />
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500">
                                        {system.code}
                                    </span>
                                    <span className="mt-2 block text-xs text-slate-600">
                                        {systemDraft
                                            ? `Draft v${systemDraft.versionNumber} · ${systemDraft._count.slots} slots`
                                            : `${system.gridVersions.length} grid version${system.gridVersions.length === 1 ? "" : "s"}`}
                                    </span>
                                </button>
                            )
                        })}
                    </aside>

                    {selectedSystem && (
                        <main className="min-w-0 space-y-5">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex flex-wrap items-center gap-2">
                                        {selectedSystem.name}
                                        <Badge
                                            variant={
                                                selectedSystem.isActive
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {selectedSystem.isActive
                                                ? "Active"
                                                : "Inactive"}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedSystem.applicableFor ||
                                            "No audience guidance has been added."}
                                    </CardDescription>
                                    <CardAction className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setSystemEditor(selectedSystem)
                                            }
                                            aria-label={`Edit ${selectedSystem.name}`}
                                            title="Edit system"
                                        >
                                            <Pencil />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={
                                                toggleSystem.isPending ||
                                                Boolean(
                                                    selectedSystem.isActive &&
                                                    draft
                                                )
                                            }
                                            onClick={() =>
                                                toggleSystem.mutate(
                                                    selectedSystem
                                                )
                                            }
                                            aria-label={`${selectedSystem.isActive ? "Deactivate" : "Reactivate"} ${selectedSystem.name}`}
                                            title={
                                                selectedSystem.isActive && draft
                                                    ? "Discard the draft before deactivating"
                                                    : selectedSystem.isActive
                                                      ? "Deactivate system"
                                                      : "Reactivate system"
                                            }
                                        >
                                            {selectedSystem.isActive ? (
                                                <PowerOff />
                                            ) : (
                                                <Power />
                                            )}
                                        </Button>
                                    </CardAction>
                                </CardHeader>
                                {selectedSystem.description && (
                                    <CardContent>
                                        <p className="text-sm text-slate-600">
                                            {selectedSystem.description}
                                        </p>
                                    </CardContent>
                                )}
                            </Card>

                            <Card>
                                <CardHeader className="border-b">
                                    <CardTitle className="flex flex-wrap items-center gap-2">
                                        Weekly grid
                                        {selectedGridSummary && (
                                            <GridStatus
                                                status={
                                                    selectedGridSummary.status
                                                }
                                            />
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        A grid can overlap while being drafted.
                                        Resolve every warning before timetable
                                        publication.
                                    </CardDescription>
                                    <CardAction className="flex flex-wrap justify-end gap-2">
                                        {selectedSystem.gridVersions.length >
                                            0 && (
                                            <select
                                                className="field-select min-h-8 w-auto py-1"
                                                aria-label="Grid version"
                                                value={
                                                    selectedGridSummary?.id ||
                                                    ""
                                                }
                                                onChange={(event) =>
                                                    setGridBySystem(
                                                        (value) => ({
                                                            ...value,
                                                            [selectedSystem.id]:
                                                                event.target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                            >
                                                {selectedSystem.gridVersions.map(
                                                    (version) => (
                                                        <option
                                                            key={version.id}
                                                            value={version.id}
                                                        >
                                                            Version{" "}
                                                            {
                                                                version.versionNumber
                                                            }{" "}
                                                            ·{" "}
                                                            {version.status.toLowerCase()}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        )}
                                        {!draft && selectedSystem.isActive && (
                                            <Button
                                                size="sm"
                                                disabled={createGrid.isPending}
                                                onClick={() =>
                                                    createGrid.mutate(
                                                        latestLocked?.id
                                                    )
                                                }
                                            >
                                                {latestLocked ? (
                                                    <CopyPlus />
                                                ) : (
                                                    <Plus />
                                                )}
                                                {latestLocked
                                                    ? `Edit from v${latestLocked.versionNumber}`
                                                    : "Create draft"}
                                            </Button>
                                        )}
                                    </CardAction>
                                </CardHeader>

                                {!selectedGridSummary ? (
                                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                                        <CalendarClock className="size-8 text-slate-400" />
                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                No weekly grid yet
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Create an empty draft and add
                                                the institution’s slot timings.
                                            </p>
                                        </div>
                                        {selectedSystem.isActive && (
                                            <Button
                                                onClick={() =>
                                                    createGrid.mutate(undefined)
                                                }
                                                disabled={createGrid.isPending}
                                            >
                                                <Plus /> Create first draft
                                            </Button>
                                        )}
                                    </CardContent>
                                ) : gridQuery.isLoading ? (
                                    <CardContent className="py-10 text-center text-slate-500">
                                        Loading grid…
                                    </CardContent>
                                ) : gridQuery.isError || !grid ? (
                                    <CardContent className="py-10 text-center text-red-700">
                                        {errorMessage(gridQuery.error)}
                                    </CardContent>
                                ) : (
                                    <CardContent className="space-y-4 pt-4">
                                        {grid.status === "LOCKED" && (
                                            <div className="inline-alert border-blue-200 bg-blue-50 text-blue-800">
                                                <CalendarClock className="mt-0.5 size-4 shrink-0" />
                                                This is the active read-only
                                                grid. Create a draft to make
                                                changes.
                                            </div>
                                        )}
                                        {grid.status === "DRAFT" &&
                                            latestLocked && (
                                                <div className="inline-alert border-blue-200 bg-blue-50 text-blue-800">
                                                    <CalendarClock className="mt-0.5 size-4 shrink-0" />
                                                    This draft does not change
                                                    the live schedule. It
                                                    becomes active only when a
                                                    complete replacement
                                                    timetable is validated and
                                                    published.
                                                </div>
                                            )}
                                        {grid.overlaps.length > 0 && (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                                <div className="flex items-start gap-2 text-amber-900">
                                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {
                                                                grid.overlaps
                                                                    .length
                                                            }{" "}
                                                            overlapping
                                                            occurrence
                                                            {grid.overlaps
                                                                .length === 1
                                                                ? ""
                                                                : "s"}
                                                        </p>
                                                        <ul className="mt-2 space-y-1 text-xs text-amber-800">
                                                            {grid.overlaps
                                                                .slice(0, 5)
                                                                .map(
                                                                    (
                                                                        overlap
                                                                    ) => (
                                                                        <li
                                                                            key={`${overlap.first.id}-${overlap.second.id}`}
                                                                        >
                                                                            {
                                                                                overlap
                                                                                    .first
                                                                                    .slotCode
                                                                            }{" "}
                                                                            and{" "}
                                                                            {
                                                                                overlap
                                                                                    .second
                                                                                    .slotCode
                                                                            }{" "}
                                                                            on{" "}
                                                                            {
                                                                                dayLabels[
                                                                                    overlap
                                                                                        .first
                                                                                        .dayOfWeek
                                                                                ]
                                                                            }{" "}
                                                                            (
                                                                            {minuteToTime(
                                                                                Math.max(
                                                                                    overlap
                                                                                        .first
                                                                                        .startMinute,
                                                                                    overlap
                                                                                        .second
                                                                                        .startMinute
                                                                                )
                                                                            )}
                                                                            –
                                                                            {minuteToTime(
                                                                                Math.min(
                                                                                    overlap
                                                                                        .first
                                                                                        .endMinute,
                                                                                    overlap
                                                                                        .second
                                                                                        .endMinute
                                                                                )
                                                                            )}
                                                                            )
                                                                        </li>
                                                                    )
                                                                )}
                                                        </ul>
                                                        {grid.overlaps.length >
                                                            5 && (
                                                            <p className="mt-1 text-xs">
                                                                And{" "}
                                                                {grid.overlaps
                                                                    .length -
                                                                    5}{" "}
                                                                more.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {grid.status === "DRAFT" && (
                                            <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 pb-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setDiscardOpen(true)
                                                    }
                                                >
                                                    <Trash2 /> Discard draft
                                                </Button>
                                                {!latestLocked && (
                                                    <Button
                                                        size="sm"
                                                        disabled={
                                                            grid.slots
                                                                .length === 0 ||
                                                            incompleteSlotCount >
                                                                0 ||
                                                            grid.overlaps
                                                                .length > 0
                                                        }
                                                        onClick={() =>
                                                            setActivateOpen(
                                                                true
                                                            )
                                                        }
                                                        title={
                                                            grid.slots
                                                                .length === 0
                                                                ? "Add at least one slot first"
                                                                : incompleteSlotCount >
                                                                    0
                                                                  ? `Assign a weekly time to ${incompleteSlotCount} incomplete slot${incompleteSlotCount === 1 ? "" : "s"}`
                                                                  : grid
                                                                          .overlaps
                                                                          .length >
                                                                      0
                                                                    ? "Resolve overlaps before activation"
                                                                    : "Activate the first weekly grid"
                                                        }
                                                    >
                                                        <CheckCircle2 />{" "}
                                                        Activate grid
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        <SlotGridEditor
                                            key={grid.id}
                                            grid={grid}
                                            activeSlotId={activeSlotId}
                                            saving={
                                                saveSlot.isPending ||
                                                toggleOccurrence.isPending ||
                                                deleteSlot.isPending
                                            }
                                            overlapSlotIds={overlapSlotIds}
                                            onSelectSlot={setActiveSlotId}
                                            onAddSlot={() =>
                                                setSlotEditor("NEW")
                                            }
                                            onEditSlot={setSlotEditor}
                                            onDeleteSlot={setDeletingSlot}
                                            onToggleOccurrence={(
                                                slot,
                                                occurrence
                                            ) =>
                                                toggleOccurrence.mutate({
                                                    slot,
                                                    occurrence,
                                                })
                                            }
                                        />
                                    </CardContent>
                                )}
                            </Card>
                        </main>
                    )}
                </div>
            )}

            {systemEditor !== null ? (
                <SlotSystemDialog
                    system={systemEditor === "NEW" ? null : systemEditor}
                    saving={systemSave.isPending}
                    onOpenChange={(open) => !open && setSystemEditor(null)}
                    onSave={(value) => systemSave.mutate(value)}
                />
            ) : null}
            {slotEditor !== null ? (
                <SlotEditorDialog
                    slot={slotEditor === "NEW" ? null : slotEditor}
                    saving={saveSlot.isPending}
                    onOpenChange={(open) => !open && setSlotEditor(null)}
                    onSave={(value) => saveSlot.mutate(value)}
                />
            ) : null}

            <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Activate this weekly grid?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Version {grid?.versionNumber} will become the active
                            read-only grid. Future changes will be made in a new
                            draft and activated with a replacement timetable.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={activateGrid.isPending}
                            onClick={() => activateGrid.mutate()}
                        >
                            {activateGrid.isPending
                                ? "Activating…"
                                : "Activate grid"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Discard this draft grid?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Version {grid?.versionNumber} and its slots will
                            remain in history but cannot be edited again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep draft</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => discardGrid.mutate()}
                        >
                            Discard draft
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={deletingSlot !== null}
                onOpenChange={(open) => !open && setDeletingSlot(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {deletingSlot?.code}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the slot and all its weekly occurrences
                            from the draft.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => deleteSlot.mutate()}
                        >
                            Delete slot
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
