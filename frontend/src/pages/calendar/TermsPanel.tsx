import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, LockKeyhole, Pencil, Plus, Search } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { FormDialog } from "../../components/FormDialog"
import { useToast } from "../../components/toastContext"
import {
    academicCalendarApi,
    errorMessage,
    type AcademicTerm,
    type AcademicTermStatus,
    type CalendarImpact,
} from "../../lib/api"
import { calendarImpactsFromError } from "../../lib/calendar"
import { dateOnly } from "../../lib/time"
import { PaginationBar, TableState } from "../access/shared"
import { ImpactList, TermStatusBadge } from "./shared"

type TermDraft = {
    termCode: string
    name: string
    startDate: string
    endDate: string
}

const emptyDraft: TermDraft = {
    termCode: "",
    name: "",
    startDate: "",
    endDate: "",
}

function draftFor(term: AcademicTerm): TermDraft {
    return {
        termCode: term.termCode,
        name: term.name,
        startDate: dateOnly(term.startDate),
        endDate: dateOnly(term.endDate),
    }
}

export function TermsPanel() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const [search, setSearch] = useState("")
    const [appliedSearch, setAppliedSearch] = useState("")
    const [status, setStatus] = useState<"ALL" | AcademicTermStatus>("ALL")
    const [page, setPage] = useState(1)
    const [editing, setEditing] = useState<AcademicTerm | "NEW" | null>(null)
    const [draft, setDraft] = useState<TermDraft>(emptyDraft)
    const [transition, setTransition] = useState<{
        action: "CURRENT" | "CLOSE"
        term: AcademicTerm
    } | null>(null)
    const [transitionImpacts, setTransitionImpacts] = useState<
        CalendarImpact[]
    >([])

    const query = useQuery({
        queryKey: ["academic-terms", appliedSearch, status, page],
        queryFn: () =>
            academicCalendarApi.listTerms({
                page,
                pageSize: 25,
                search: appliedSearch || undefined,
                status: status === "ALL" ? undefined : status,
            }),
    })

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ["academic-terms"] })

    const saveMutation = useMutation({
        mutationFn: () => {
            if (editing === "NEW") return academicCalendarApi.createTerm(draft)
            const term = editing as AcademicTerm
            return academicCalendarApi.updateTerm(
                term.id,
                term.status === "CURRENT" ? { name: draft.name } : draft
            )
        },
        onSuccess: async () => {
            showToast(
                "success",
                editing === "NEW"
                    ? "Academic term created"
                    : "Academic term updated"
            )
            setEditing(null)
            await invalidate()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const transitionMutation = useMutation({
        mutationFn: ({ action, term }: NonNullable<typeof transition>) =>
            action === "CURRENT"
                ? academicCalendarApi.setCurrentTerm(term.id)
                : academicCalendarApi.closeTerm(term.id),
        onSuccess: async (_, value) => {
            showToast(
                "success",
                value.action === "CURRENT"
                    ? "Current term updated"
                    : "Academic term closed"
            )
            setTransition(null)
            setTransitionImpacts([])
            await invalidate()
        },
        onError: (error) => {
            setTransitionImpacts(calendarImpactsFromError(error))
            showToast("error", errorMessage(error))
        },
    })

    const openEditor = (term?: AcademicTerm) => {
        setEditing(term || "NEW")
        setDraft(term ? draftFor(term) : emptyDraft)
    }

    const submit = (event: FormEvent) => {
        event.preventDefault()
        saveMutation.mutate()
    }

    return (
        <div className="space-y-5">
            <form
                className="flex flex-wrap items-end gap-3 border-y border-slate-200 bg-white p-4"
                onSubmit={(event) => {
                    event.preventDefault()
                    setAppliedSearch(search.trim())
                    setPage(1)
                }}
            >
                <label className="min-w-52 flex-1">
                    <span className="field-label">Search</span>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                        <input
                            className="field-input pl-9"
                            placeholder="Term code or name"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                </label>
                <label className="w-44">
                    <span className="field-label">Lifecycle</span>
                    <select
                        className="field-select"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value as typeof status)
                            setPage(1)
                        }}
                    >
                        <option value="ALL">All statuses</option>
                        <option value="PLANNED">Planned</option>
                        <option value="CURRENT">Current</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </label>
                <button type="submit" className="button-secondary">
                    Apply
                </button>
                <button
                    type="button"
                    className="button-primary"
                    onClick={() => openEditor()}
                >
                    <Plus className="size-4" /> Add term
                </button>
            </form>

            <div className="table-shell overflow-x-auto">
                <table className="data-table min-w-[900px]">
                    <thead>
                        <tr>
                            <th>Term</th>
                            <th>Dates</th>
                            <th>Status</th>
                            <th>Calendar</th>
                            <th>Timetable data</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <TableState
                            loading={query.isLoading}
                            empty={!query.data?.records.length}
                            columns={6}
                            emptyLabel="No academic terms found"
                        />
                        {query.data?.records.map((term) => (
                            <tr key={term.id}>
                                <td>
                                    <p className="font-medium text-slate-900">
                                        {term.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {term.termCode}
                                    </p>
                                </td>
                                <td>
                                    {dateOnly(term.startDate)} to{" "}
                                    {dateOnly(term.endDate)}
                                </td>
                                <td>
                                    <TermStatusBadge status={term.status} />
                                </td>
                                <td>
                                    {term._count.calendarExceptions} exception
                                    {term._count.calendarExceptions === 1
                                        ? ""
                                        : "s"}
                                </td>
                                <td>
                                    <p>
                                        {term._count.imports} import
                                        {term._count.imports === 1 ? "" : "s"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {term._count.slotOccupancies} occupancy
                                        rows
                                    </p>
                                </td>
                                <td>
                                    <div className="flex justify-end gap-2">
                                        {term.status !== "CLOSED" ? (
                                            <button
                                                type="button"
                                                className="icon-button border border-slate-200"
                                                onClick={() => openEditor(term)}
                                                aria-label={`Edit ${term.name}`}
                                                title="Edit term"
                                            >
                                                <Pencil className="size-4" />
                                            </button>
                                        ) : null}
                                        {term.status === "PLANNED" ? (
                                            <button
                                                type="button"
                                                className="button-primary min-h-9"
                                                onClick={() => {
                                                    setTransition({
                                                        action: "CURRENT",
                                                        term,
                                                    })
                                                    setTransitionImpacts([])
                                                }}
                                            >
                                                <CheckCircle2 className="size-4" />{" "}
                                                Set current
                                            </button>
                                        ) : null}
                                        {term.status === "CURRENT" ? (
                                            <button
                                                type="button"
                                                className="button-secondary min-h-9"
                                                onClick={() => {
                                                    setTransition({
                                                        action: "CLOSE",
                                                        term,
                                                    })
                                                    setTransitionImpacts([])
                                                }}
                                            >
                                                <LockKeyhole className="size-4" />{" "}
                                                Close
                                            </button>
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

            {query.isError ? (
                <div className="inline-alert border-red-200 bg-red-50 text-red-700">
                    {errorMessage(query.error)}
                </div>
            ) : null}

            <FormDialog
                open={editing !== null}
                title={
                    editing === "NEW"
                        ? "Add academic term"
                        : "Edit academic term"
                }
                description={
                    editing !== "NEW" && editing?.status === "CURRENT"
                        ? "Current-term dates and code are locked."
                        : undefined
                }
                onClose={() => setEditing(null)}
            >
                <form className="space-y-4" onSubmit={submit}>
                    <label>
                        <span className="field-label">Term code</span>
                        <input
                            className="field-input uppercase"
                            value={draft.termCode}
                            disabled={
                                editing !== "NEW" &&
                                editing?.status === "CURRENT"
                            }
                            onChange={(event) =>
                                setDraft((value) => ({
                                    ...value,
                                    termCode: event.target.value.toUpperCase(),
                                }))
                            }
                            placeholder="2026_MONSOON"
                            required
                        />
                    </label>
                    <label>
                        <span className="field-label">Display name</span>
                        <input
                            className="field-input"
                            value={draft.name}
                            onChange={(event) =>
                                setDraft((value) => ({
                                    ...value,
                                    name: event.target.value,
                                }))
                            }
                            placeholder="Monsoon Semester 2026"
                            required
                        />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="field-label">Start date</span>
                            <input
                                type="date"
                                className="field-input"
                                value={draft.startDate}
                                disabled={
                                    editing !== "NEW" &&
                                    editing?.status === "CURRENT"
                                }
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        startDate: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>
                        <label>
                            <span className="field-label">End date</span>
                            <input
                                type="date"
                                className="field-input"
                                value={draft.endDate}
                                min={draft.startDate || undefined}
                                disabled={
                                    editing !== "NEW" &&
                                    editing?.status === "CURRENT"
                                }
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        endDate: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>
                    </div>
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
                            disabled={saveMutation.isPending}
                        >
                            {saveMutation.isPending ? "Saving..." : "Save term"}
                        </button>
                    </div>
                </form>
            </FormDialog>

            <ConfirmDialog
                open={transition !== null}
                title={
                    transition?.action === "CURRENT"
                        ? "Set current academic term"
                        : "Close academic term"
                }
                description={
                    <div className="space-y-3">
                        <p>
                            {transition?.action === "CURRENT"
                                ? `${transition.term.name} will become current. Any existing current term will be closed and cannot be reopened.`
                                : `${transition?.term.name} will be closed and cannot be reopened or edited.`}
                        </p>
                        <ImpactList impacts={transitionImpacts} />
                    </div>
                }
                confirmLabel={
                    transition?.action === "CURRENT"
                        ? "Set current"
                        : "Close term"
                }
                destructive={transition?.action === "CLOSE"}
                busy={transitionMutation.isPending}
                onClose={() => {
                    setTransition(null)
                    setTransitionImpacts([])
                }}
                onConfirm={() =>
                    transition && transitionMutation.mutate(transition)
                }
            />
        </div>
    )
}
