import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ban, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { FormDialog } from "../../components/FormDialog"
import { useToast } from "../../components/toastContext"
import {
    academicCalendarApi,
    errorMessage,
    type CalendarException,
    type CalendarExceptionInput,
    type CalendarExceptionType,
    type CalendarImpact,
    type DayOfWeek,
} from "../../lib/api"
import { calendarImpactsFromError, weekdays } from "../../lib/calendar"
import { dateOnly } from "../../lib/time"
import { PaginationBar, StatusBadge, TableState } from "../access/shared"
import { ImpactList, TermStatusBadge } from "./shared"

type ExceptionDraft = {
    academicTermId: string
    name: string
    exceptionType: CalendarExceptionType
    startDate: string
    endDate: string
    targetDayOfWeek: DayOfWeek | ""
}

function blankDraft(termId: string): ExceptionDraft {
    return {
        academicTermId: termId,
        name: "",
        exceptionType: "NO_CLASSES",
        startDate: "",
        endDate: "",
        targetDayOfWeek: "",
    }
}

function draftFor(item: CalendarException): ExceptionDraft {
    return {
        academicTermId: item.academicTermId,
        name: item.name,
        exceptionType: item.exceptionType,
        startDate: dateOnly(item.startDate),
        endDate: dateOnly(item.endDate),
        targetDayOfWeek: item.targetDayOfWeek || "",
    }
}

function toInput(draft: ExceptionDraft): CalendarExceptionInput {
    return {
        academicTermId: draft.academicTermId,
        name: draft.name,
        exceptionType: draft.exceptionType,
        startDate: draft.startDate,
        endDate:
            draft.exceptionType === "FOLLOW_DAY"
                ? draft.startDate
                : draft.endDate,
        targetDayOfWeek:
            draft.exceptionType === "FOLLOW_DAY"
                ? (draft.targetDayOfWeek as DayOfWeek)
                : null,
    }
}

function typeLabel(type: CalendarExceptionType) {
    return type === "NO_CLASSES" ? "No classes" : "Follow weekday"
}

export function ExceptionsPanel() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const [termId, setTermId] = useState("")
    const [type, setType] = useState<"ALL" | CalendarExceptionType>("ALL")
    const [active, setActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
        "ACTIVE"
    )
    const [page, setPage] = useState(1)
    const [editing, setEditing] = useState<CalendarException | "NEW" | null>(
        null
    )
    const [draft, setDraft] = useState<ExceptionDraft>(blankDraft(""))
    const [impacts, setImpacts] = useState<CalendarImpact[]>([])
    const [deactivateTarget, setDeactivateTarget] =
        useState<CalendarException | null>(null)
    const [deactivateImpacts, setDeactivateImpacts] = useState<
        CalendarImpact[]
    >([])

    const termsQuery = useQuery({
        queryKey: ["academic-terms", "calendar-options"],
        queryFn: () => academicCalendarApi.listTerms({ pageSize: 100 }),
    })
    const terms = termsQuery.data?.records || []
    const defaultTerm =
        terms.find((term) => term.status === "CURRENT") ||
        terms.find((term) => term.status === "PLANNED") ||
        terms[0]
    const selectedTermId = termId || defaultTerm?.id || ""
    const selectedTerm = terms.find((term) => term.id === selectedTermId)

    const query = useQuery({
        queryKey: ["calendar-exceptions", selectedTermId, type, active, page],
        queryFn: () =>
            academicCalendarApi.listExceptions({
                page,
                pageSize: 25,
                academicTermId: selectedTermId,
                exceptionType: type === "ALL" ? undefined : type,
                isActive: active === "ALL" ? undefined : active === "ACTIVE",
            }),
        enabled: Boolean(selectedTermId),
    })

    const invalidate = async () => {
        await queryClient.invalidateQueries({
            queryKey: ["calendar-exceptions"],
        })
        await queryClient.invalidateQueries({ queryKey: ["academic-terms"] })
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            const candidate = toInput(draft)
            const preview = await academicCalendarApi.previewExceptionImpact({
                operation: editing === "NEW" ? "CREATE" : "UPDATE",
                ...(editing !== "NEW" ? { exceptionId: editing!.id } : {}),
                candidate,
            })
            if (preview.impacts.length) {
                return { blocked: true as const, impacts: preview.impacts }
            }
            const result =
                editing === "NEW"
                    ? await academicCalendarApi.createException(candidate)
                    : await academicCalendarApi.updateException(
                          editing!.id,
                          candidate
                      )
            return { blocked: false as const, result }
        },
        onSuccess: async (result) => {
            if (result.blocked) {
                setImpacts(result.impacts)
                showToast(
                    "error",
                    "Resolve affected approved events before applying this change"
                )
                return
            }
            showToast(
                "success",
                editing === "NEW"
                    ? "Calendar exception created"
                    : "Calendar exception updated"
            )
            setEditing(null)
            setImpacts([])
            await invalidate()
        },
        onError: (error) => {
            setImpacts(calendarImpactsFromError(error))
            showToast("error", errorMessage(error))
        },
    })

    const deactivateMutation = useMutation({
        mutationFn: async (item: CalendarException) => {
            const preview = await academicCalendarApi.previewExceptionImpact({
                operation: "DEACTIVATE",
                exceptionId: item.id,
            })
            if (preview.impacts.length) {
                return { blocked: true as const, impacts: preview.impacts }
            }
            await academicCalendarApi.deactivateException(item.id)
            return { blocked: false as const }
        },
        onSuccess: async (result) => {
            if (result.blocked) {
                setDeactivateImpacts(result.impacts)
                showToast(
                    "error",
                    "Resolve affected approved events before deactivating this exception"
                )
                return
            }
            showToast("success", "Calendar exception deactivated")
            setDeactivateTarget(null)
            setDeactivateImpacts([])
            await invalidate()
        },
        onError: (error) => {
            setDeactivateImpacts(calendarImpactsFromError(error))
            showToast("error", errorMessage(error))
        },
    })

    const openEditor = (item?: CalendarException) => {
        setEditing(item || "NEW")
        setDraft(item ? draftFor(item) : blankDraft(selectedTermId))
        setImpacts([])
    }

    const submit = (event: FormEvent) => {
        event.preventDefault()
        saveMutation.mutate()
    }

    const dateBounds = selectedTerm
        ? {
              min: dateOnly(selectedTerm.startDate),
              max: dateOnly(selectedTerm.endDate),
          }
        : {}
    const canChange = selectedTerm && selectedTerm.status !== "CLOSED"

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-3 border-y border-slate-200 bg-white p-4">
                <label className="min-w-64 flex-1">
                    <span className="field-label">Academic term</span>
                    <select
                        className="field-select"
                        value={selectedTermId}
                        onChange={(event) => {
                            setTermId(event.target.value)
                            setPage(1)
                        }}
                    >
                        {terms.length ? null : (
                            <option value="">No terms available</option>
                        )}
                        {terms.map((term) => (
                            <option key={term.id} value={term.id}>
                                {term.termCode} - {term.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="w-44">
                    <span className="field-label">Type</span>
                    <select
                        className="field-select"
                        value={type}
                        onChange={(event) => {
                            setType(event.target.value as typeof type)
                            setPage(1)
                        }}
                    >
                        <option value="ALL">All types</option>
                        <option value="NO_CLASSES">No classes</option>
                        <option value="FOLLOW_DAY">Follow weekday</option>
                    </select>
                </label>
                <label className="w-40">
                    <span className="field-label">Status</span>
                    <select
                        className="field-select"
                        value={active}
                        onChange={(event) => {
                            setActive(event.target.value as typeof active)
                            setPage(1)
                        }}
                    >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="ALL">All</option>
                    </select>
                </label>
                <button
                    type="button"
                    className="button-primary"
                    disabled={!canChange}
                    onClick={() => openEditor()}
                >
                    <Plus className="size-4" /> Add exception
                </button>
            </div>

            {selectedTerm ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <TermStatusBadge status={selectedTerm.status} />
                    <span>
                        {dateOnly(selectedTerm.startDate)} to{" "}
                        {dateOnly(selectedTerm.endDate)}
                    </span>
                    {selectedTerm.status === "CLOSED" ? (
                        <span>Closed-term calendar records are read-only.</span>
                    ) : null}
                </div>
            ) : null}

            <div className="table-shell overflow-x-auto">
                <table className="data-table min-w-[940px]">
                    <thead>
                        <tr>
                            <th>Exception</th>
                            <th>Type</th>
                            <th>Date range</th>
                            <th>Schedule behavior</th>
                            <th>Status</th>
                            <th>Last changed by</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <TableState
                            loading={termsQuery.isLoading || query.isLoading}
                            empty={!query.data?.records.length}
                            columns={7}
                            emptyLabel={
                                selectedTermId
                                    ? "No calendar exceptions found"
                                    : "Create an academic term first"
                            }
                        />
                        {query.data?.records.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <p className="font-medium text-slate-900">
                                        {item.name}
                                    </p>
                                </td>
                                <td>{typeLabel(item.exceptionType)}</td>
                                <td>
                                    {dateOnly(item.startDate)}
                                    {dateOnly(item.endDate) !==
                                    dateOnly(item.startDate)
                                        ? ` to ${dateOnly(item.endDate)}`
                                        : ""}
                                </td>
                                <td>
                                    {item.exceptionType === "FOLLOW_DAY"
                                        ? `Use ${weekdays.find((day) => day.value === item.targetDayOfWeek)?.label} timetable`
                                        : "Suspend regular classes"}
                                </td>
                                <td>
                                    <StatusBadge active={item.isActive} />
                                </td>
                                <td>
                                    <p>
                                        {item.updatedBy?.name ||
                                            item.createdBy?.name ||
                                            "System"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {dateOnly(item.updatedAt)}
                                    </p>
                                </td>
                                <td>
                                    <div className="flex justify-end gap-2">
                                        {item.isActive &&
                                        item.academicTerm.status !==
                                            "CLOSED" ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="icon-button border border-slate-200"
                                                    onClick={() =>
                                                        openEditor(item)
                                                    }
                                                    aria-label={`Edit ${item.name}`}
                                                    title="Edit exception"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button-secondary min-h-9"
                                                    onClick={() => {
                                                        setDeactivateTarget(
                                                            item
                                                        )
                                                        setDeactivateImpacts([])
                                                    }}
                                                >
                                                    <Ban className="size-4" />{" "}
                                                    Deactivate
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <PaginationBar
                    pagination={query.data?.pagination}
                    onPage={setPage}
                />
            </div>

            {termsQuery.isError || query.isError ? (
                <div className="inline-alert border-red-200 bg-red-50 text-red-700">
                    {errorMessage(termsQuery.error || query.error)}
                </div>
            ) : null}

            <FormDialog
                open={editing !== null}
                title={
                    editing === "NEW"
                        ? "Add calendar exception"
                        : "Edit calendar exception"
                }
                onClose={() => setEditing(null)}
            >
                <form className="space-y-4" onSubmit={submit}>
                    <label>
                        <span className="field-label">Name</span>
                        <input
                            className="field-input"
                            value={draft.name}
                            onChange={(event) => {
                                setDraft((value) => ({
                                    ...value,
                                    name: event.target.value,
                                }))
                                setImpacts([])
                            }}
                            placeholder="Diwali break"
                            required
                        />
                    </label>
                    <label>
                        <span className="field-label">Exception type</span>
                        <select
                            className="field-select"
                            value={draft.exceptionType}
                            onChange={(event) => {
                                const exceptionType = event.target
                                    .value as CalendarExceptionType
                                setDraft((value) => ({
                                    ...value,
                                    exceptionType,
                                    endDate:
                                        exceptionType === "FOLLOW_DAY"
                                            ? value.startDate
                                            : value.endDate,
                                    targetDayOfWeek:
                                        exceptionType === "NO_CLASSES"
                                            ? ""
                                            : value.targetDayOfWeek,
                                }))
                                setImpacts([])
                            }}
                        >
                            <option value="NO_CLASSES">No classes</option>
                            <option value="FOLLOW_DAY">
                                Follow another weekday
                            </option>
                        </select>
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="field-label">Start date</span>
                            <input
                                type="date"
                                className="field-input"
                                {...dateBounds}
                                value={draft.startDate}
                                onChange={(event) => {
                                    const startDate = event.target.value
                                    setDraft((value) => ({
                                        ...value,
                                        startDate,
                                        ...(value.exceptionType === "FOLLOW_DAY"
                                            ? { endDate: startDate }
                                            : {}),
                                    }))
                                    setImpacts([])
                                }}
                                required
                            />
                        </label>
                        {draft.exceptionType === "NO_CLASSES" ? (
                            <label>
                                <span className="field-label">End date</span>
                                <input
                                    type="date"
                                    className="field-input"
                                    min={draft.startDate || dateBounds.min}
                                    max={dateBounds.max}
                                    value={draft.endDate}
                                    onChange={(event) => {
                                        setDraft((value) => ({
                                            ...value,
                                            endDate: event.target.value,
                                        }))
                                        setImpacts([])
                                    }}
                                    required
                                />
                            </label>
                        ) : (
                            <label>
                                <span className="field-label">
                                    Timetable to follow
                                </span>
                                <select
                                    className="field-select"
                                    value={draft.targetDayOfWeek}
                                    onChange={(event) => {
                                        setDraft((value) => ({
                                            ...value,
                                            targetDayOfWeek: event.target
                                                .value as DayOfWeek,
                                        }))
                                        setImpacts([])
                                    }}
                                    required
                                >
                                    <option value="">Select weekday</option>
                                    {weekdays.map((day) => (
                                        <option
                                            key={day.value}
                                            value={day.value}
                                        >
                                            {day.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>
                    <ImpactList impacts={impacts} />
                    {impacts.length ? (
                        <p className="text-xs text-slate-500">
                            Relocation, rescheduling, or cancellation decisions
                            will be added with the booking workflow.
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setEditing(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="button-primary"
                            disabled={
                                saveMutation.isPending || impacts.length > 0
                            }
                        >
                            {saveMutation.isPending
                                ? "Checking..."
                                : "Review and save"}
                        </button>
                    </div>
                </form>
            </FormDialog>

            <ConfirmDialog
                open={deactivateTarget !== null}
                title="Deactivate calendar exception"
                description={
                    <div className="space-y-3">
                        <p>
                            The normal timetable will apply again on these
                            dates. The record remains available in history.
                        </p>
                        <ImpactList impacts={deactivateImpacts} />
                    </div>
                }
                confirmLabel="Deactivate"
                destructive
                busy={deactivateMutation.isPending}
                onClose={() => {
                    setDeactivateTarget(null)
                    setDeactivateImpacts([])
                }}
                onConfirm={() =>
                    deactivateTarget &&
                    deactivateMutation.mutate(deactivateTarget)
                }
            />
        </div>
    )
}
