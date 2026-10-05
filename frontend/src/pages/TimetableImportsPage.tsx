import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    Loader2,
    Upload,
    XCircle,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { useToast } from "../components/toastContext"
import {
    download,
    errorMessage,
    timetableApi,
    type PublicationPreview,
    type TimetableBatch,
    type TimetableImportRow,
    type TimetablePublicationImpact,
} from "../lib/api"
import { PaginationBar } from "./access/shared"
import { minuteToTime } from "../lib/time"

type View = "ALL" | "READY" | "ATTENTION" | "SKIPPED"
type IssueView = "ALL" | "INTERNAL" | "PUBLISHED"

const statusLabels: Record<
    TimetableImportRow["initialClassification"],
    string
> = {
    READY: "Ready",
    MISSING_REQUIRED_FIELD: "Missing required field",
    UNRESOLVED_SLOT: "Unknown slot",
    UNRESOLVED_ROOM: "Unknown room",
    DUPLICATE_ROW: "Duplicate row",
}

function rowIssueLabel(row: TimetableImportRow) {
    if (row.initialClassification !== "MISSING_REQUIRED_FIELD") {
        return statusLabels[row.initialClassification]
    }
    if (!row.rawCourseCode) return "Missing course code"
    if (!row.rawSlot) return "Missing slot"
    if (!row.rawClassroom) return "Missing classroom"
    return statusLabels[row.initialClassification]
}

export function TimetableImportsPage() {
    const client = useQueryClient()
    const { showToast } = useToast()
    const [termId, setTermId] = useState("")
    const [systemId, setSystemId] = useState("")
    const [gridId, setGridId] = useState("")
    const [workbook, setWorkbook] = useState<File | null>(null)
    const [batchId, setBatchId] = useState("")
    const [view, setView] = useState<View>("ALL")
    const [issueView, setIssueView] = useState<IssueView>("ALL")
    const [page, setPage] = useState(1)
    const [expandedRowId, setExpandedRowId] = useState("")
    const [resolution, setResolution] = useState({ slotId: "", roomId: "" })
    const [cancelOpen, setCancelOpen] = useState(false)
    const [publishOpen, setPublishOpen] = useState(false)

    const optionsQuery = useQuery({
        queryKey: ["timetable-options"],
        queryFn: timetableApi.options,
    })
    const importsQuery = useQuery({
        queryKey: ["timetable-imports"],
        queryFn: timetableApi.listImports,
    })
    const options = optionsQuery.data
    const selectedTermId = termId || options?.terms[0]?.id || ""
    const selectedSystemId = systemId || options?.systems[0]?.id || ""
    const selectedSystem = options?.systems.find(
        (item) => item.id === selectedSystemId
    )
    const selectedGridId = selectedSystem?.gridVersions.some(
        (item) => item.id === gridId
    )
        ? gridId
        : selectedSystem?.gridVersions[0]?.id || ""

    const batchQuery = useQuery({
        queryKey: ["timetable-import", batchId],
        queryFn: () => timetableApi.getImport(batchId),
        enabled: Boolean(batchId),
    })
    const batch = batchQuery.data?.batch
    const rowsQuery = useQuery({
        queryKey: ["timetable-rows", batchId, view, issueView, page],
        queryFn: () =>
            timetableApi.rows(batchId, {
                view,
                issue: view === "ATTENTION" ? issueView : "ALL",
                page,
                pageSize: 50,
            }),
        enabled: Boolean(batchId),
    })
    const impactQuery = useQuery({
        queryKey: ["timetable-publication-impact", batchId],
        queryFn: () => timetableApi.publicationImpact(batchId),
        enabled: Boolean(batchId),
    })
    const publicationQuery = useQuery({
        queryKey: ["timetable-publication-preview", batchId],
        queryFn: () => timetableApi.publicationPreview(batchId),
        enabled: Boolean(batchId && publishOpen),
    })

    const refresh = async (nextBatch?: TimetableBatch) => {
        await Promise.all([
            client.invalidateQueries({ queryKey: ["timetable-imports"] }),
            client.invalidateQueries({ queryKey: ["timetable-rows", batchId] }),
            client.invalidateQueries({
                queryKey: ["timetable-publication-impact", batchId],
            }),
        ])
        if (nextBatch) {
            client.setQueryData(["timetable-import", nextBatch.id], {
                batch: nextBatch,
            })
        }
    }

    const uploadMutation = useMutation({
        mutationFn: () => {
            if (!workbook) throw new Error("Choose an .xlsx workbook")
            return timetableApi.upload({
                academicTermId: selectedTermId,
                slotSystemId: selectedSystemId,
                slotGridVersionId: selectedGridId,
                workbook,
            })
        },
        onSuccess: async ({ batch: nextBatch, duplicateImport }) => {
            showToast(
                "success",
                duplicateImport
                    ? "Workbook parsed. Matching content was uploaded before."
                    : "Workbook parsed successfully"
            )
            setBatchId(nextBatch.id)
            setWorkbook(null)
            await refresh(nextBatch)
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const rowMutation = useMutation({
        mutationFn: (input: {
            row: TimetableImportRow
            action: "RESOLVE" | "SKIP" | "KEEP_DUPLICATE" | "KEEP_ALLOCATION"
        }) =>
            input.action === "RESOLVE"
                ? timetableApi.resolveRow(batchId, input.row.id, {
                      resolvedSlotId: resolution.slotId || undefined,
                      resolvedRoomId: resolution.roomId || undefined,
                  })
                : timetableApi.rowAction(batchId, input.row.id, input.action),
        onSuccess: async ({ batch: nextBatch, review }) => {
            const hasConflict = Boolean(
                review.internalConflicts.length ||
                review.publishedConflicts.length ||
                review.bookingConflicts.length ||
                review.restrictionConflicts.length
            )
            showToast(
                hasConflict ? "info" : "success",
                hasConflict
                    ? "Row saved. Review the conflict found for its new room and slot."
                    : "Row updated"
            )
            setExpandedRowId("")
            await refresh(nextBatch)
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const cancelMutation = useMutation({
        mutationFn: () => timetableApi.cancel(batchId),
        onSuccess: async () => {
            showToast("success", "Import cancelled")
            setCancelOpen(false)
            setBatchId("")
            await refresh()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const publishMutation = useMutation({
        mutationFn: () => timetableApi.publish(batchId),
        onSuccess: async ({ batch: published }) => {
            showToast(
                "success",
                `Timetable revision ${published.revisionNumber} published`
            )
            setPublishOpen(false)
            setBatchId("")
            await refresh()
        },
        onError: async (error) => {
            showToast("error", errorMessage(error))
            await client.invalidateQueries({
                queryKey: ["timetable-publication-preview", batchId],
            })
        },
    })

    const openRow = (row: TimetableImportRow) => {
        if (expandedRowId === row.id) {
            setExpandedRowId("")
            return
        }
        setExpandedRowId(row.id)
        setResolution({
            slotId: row.resolvedSlot?.id || "",
            roomId: row.resolvedRoom?.id || "",
        })
    }

    const publications = useMemo(
        () =>
            (importsQuery.data?.imports || []).filter(
                (item) => item.status === "PUBLISHED"
            ),
        [importsQuery.data?.imports]
    )
    const previews = (importsQuery.data?.imports || []).filter(
        (item) => item.status === "PREVIEWED"
    )

    if (batchId && batch) {
        const records = rowsQuery.data?.records || []
        const reviewSummary = rowsQuery.data?.summary || {
            ready: batch.validRows,
            attention: batch.errorRows,
            skipped: batch.skippedRows,
            allocationConflicts: 0,
            publishedConflicts: 0,
        }
        return (
            <div className="space-y-5">
                <button
                    type="button"
                    className="button-quiet px-0"
                    onClick={() => setBatchId("")}
                >
                    <ArrowLeft className="size-4" /> Timetable imports
                </button>
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="page-title">{batch.fileName}</h1>
                        <p className="page-subtitle">
                            {batch.academicTerm.name} · {batch.slotSystem.name}{" "}
                            · Grid version {batch.slotGridVersion.versionNumber}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="button-secondary text-red-600"
                        onClick={() => setCancelOpen(true)}
                    >
                        <XCircle className="size-4" /> Cancel import
                    </button>
                </header>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border bg-white p-4">
                        <p className="text-2xl font-semibold text-emerald-700">
                            {reviewSummary.ready}
                        </p>
                        <p className="text-sm text-slate-500">Ready</p>
                    </div>
                    <div className="rounded-md border bg-white p-4">
                        <p className="text-2xl font-semibold text-amber-700">
                            {reviewSummary.attention}
                        </p>
                        <p className="text-sm text-slate-500">Need attention</p>
                    </div>
                    <div className="rounded-md border bg-white p-4">
                        <p className="text-2xl font-semibold text-slate-600">
                            {reviewSummary.skipped}
                        </p>
                        <p className="text-sm text-slate-500">Skipped</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(["ALL", "READY", "ATTENTION", "SKIPPED"] as View[]).map(
                        (item) => (
                            <button
                                key={item}
                                type="button"
                                className={
                                    view === item
                                        ? "button-primary"
                                        : "button-secondary"
                                }
                                onClick={() => {
                                    setView(item)
                                    if (item !== "ATTENTION") {
                                        setIssueView("ALL")
                                    }
                                    setPage(1)
                                }}
                            >
                                {item === "ATTENTION"
                                    ? `Needs attention ${reviewSummary.attention}`
                                    : item === "ALL"
                                      ? `All ${batch.totalRows}`
                                      : item === "READY"
                                        ? `Ready ${reviewSummary.ready}`
                                        : `Skipped ${reviewSummary.skipped}`}
                            </button>
                        )
                    )}
                </div>

                {view === "ATTENTION" ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="mr-1 font-medium text-slate-600">
                            Issue filters:
                        </span>
                        {(
                            [
                                ["ALL", "All issues"],
                                ["INTERNAL", "Within this import"],
                                ["PUBLISHED", "Published timetable"],
                            ] as Array<[IssueView, string]>
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={
                                    issueView === value
                                        ? "button-primary"
                                        : "button-secondary"
                                }
                                onClick={() => {
                                    setIssueView(value)
                                    setPage(1)
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="table-shell overflow-x-auto">
                    <table className="data-table min-w-[760px]">
                        <thead>
                            <tr>
                                <th>Row</th>
                                <th>Course</th>
                                <th>Slot</th>
                                <th>Classroom</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowsQuery.isLoading ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="mx-auto size-5 animate-spin" />
                                    </td>
                                </tr>
                            ) : null}
                            {records.map((row) => (
                                <RowWithResolution
                                    key={row.id}
                                    row={row}
                                    batch={batch}
                                    rooms={options?.rooms || []}
                                    expanded={expandedRowId === row.id}
                                    resolution={resolution}
                                    busy={rowMutation.isPending}
                                    onOpen={() => openRow(row)}
                                    onResolution={setResolution}
                                    onAction={(action) =>
                                        rowMutation.mutate({ row, action })
                                    }
                                />
                            ))}
                            {!rowsQuery.isLoading && !records.length ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="h-28 text-center text-sm text-slate-500"
                                    >
                                        No rows in this view.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                    <PaginationBar
                        pagination={rowsQuery.data?.pagination}
                        onPage={setPage}
                    />
                </div>

                <PublicationImpactPanel
                    loading={impactQuery.isLoading}
                    impact={impactQuery.data}
                    onReviewPublished={() => {
                        setView("ATTENTION")
                        setIssueView("PUBLISHED")
                        setPage(1)
                    }}
                />

                {rowsQuery.data && batch.errorRows === 0 ? (
                    <div
                        className={`flex flex-wrap items-center justify-between gap-4 rounded-md border p-4 ${
                            reviewSummary.attention
                                ? "border-amber-200 bg-amber-50"
                                : "border-emerald-200 bg-emerald-50"
                        }`}
                    >
                        <div>
                            <p
                                className={`font-semibold ${
                                    reviewSummary.attention
                                        ? "text-amber-900"
                                        : "text-emerald-800"
                                }`}
                            >
                                {reviewSummary.attention
                                    ? `${reviewSummary.attention} rows still have timetable conflicts`
                                    : "All rows are resolved"}
                            </p>
                            <p
                                className={`text-sm ${
                                    reviewSummary.attention
                                        ? "text-amber-800"
                                        : "text-emerald-700"
                                }`}
                            >
                                {reviewSummary.ready} allocations are ready and{" "}
                                {reviewSummary.skipped} rows will be skipped.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="button-primary"
                            onClick={() => setPublishOpen(true)}
                        >
                            {reviewSummary.attention
                                ? "Review conflicts"
                                : "Review publication"}
                        </button>
                    </div>
                ) : null}

                <ConfirmDialog
                    open={cancelOpen}
                    title="Cancel this import?"
                    description="This preview will be discarded. The currently published timetable will not be affected."
                    confirmLabel="Cancel import"
                    destructive
                    busy={cancelMutation.isPending}
                    onClose={() => setCancelOpen(false)}
                    onConfirm={() => cancelMutation.mutate()}
                />
                {publishOpen ? (
                    <PublicationDialog
                        batch={batch}
                        loading={publicationQuery.isLoading}
                        preview={publicationQuery.data}
                        busy={publishMutation.isPending}
                        onClose={() => setPublishOpen(false)}
                        onPublish={() => publishMutation.mutate()}
                    />
                ) : null}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="page-title">Timetable imports</h1>
                    <p className="page-subtitle">
                        Upload the canonical workbook, resolve only the rows
                        that need attention, then publish.
                    </p>
                </div>
                <Link to="/admin/timetables" className="button-secondary">
                    <ArrowLeft className="size-4" /> Slot grids
                </Link>
            </header>

            {publications.length ? (
                <section>
                    <h2 className="mb-3 text-sm font-semibold text-slate-900">
                        Current timetables
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        {publications.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-md border bg-white p-4"
                            >
                                <p className="font-semibold">
                                    {item.slotSystem.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {item.academicTerm.name}
                                </p>
                                <p className="mt-3 text-xs font-medium text-emerald-700">
                                    Published · Revision {item.revisionNumber}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            <form
                className="rounded-md border bg-white p-5 shadow-sm"
                onSubmit={(event: FormEvent) => {
                    event.preventDefault()
                    uploadMutation.mutate()
                }}
            >
                <div className="grid gap-4 lg:grid-cols-3">
                    <label>
                        <span className="field-label">Academic term</span>
                        <select
                            className="field-select"
                            value={selectedTermId}
                            onChange={(event) => setTermId(event.target.value)}
                        >
                            {options?.terms.map((term) => (
                                <option key={term.id} value={term.id}>
                                    {term.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="field-label">Slot system</span>
                        <select
                            className="field-select"
                            value={selectedSystemId}
                            onChange={(event) => {
                                setSystemId(event.target.value)
                                setGridId("")
                            }}
                        >
                            {options?.systems.map((system) => (
                                <option key={system.id} value={system.id}>
                                    {system.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="field-label">Slot grid</span>
                        <select
                            className="field-select"
                            value={selectedGridId}
                            onChange={(event) => setGridId(event.target.value)}
                        >
                            {selectedSystem?.gridVersions.map((grid) => (
                                <option key={grid.id} value={grid.id}>
                                    Version {grid.versionNumber}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-brand-500 hover:bg-brand-50">
                    <FileSpreadsheet className="size-7 text-brand-600" />
                    <span className="mt-2 text-sm font-semibold text-slate-800">
                        {workbook?.name || "Drop .xlsx here or choose file"}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                        One row represents one physical classroom.
                    </span>
                    <input
                        type="file"
                        accept=".xlsx"
                        className="sr-only"
                        onChange={(event) =>
                            setWorkbook(event.target.files?.[0] || null)
                        }
                    />
                </label>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        className="button-quiet px-0"
                        onClick={() =>
                            download(
                                "/timetables/template",
                                "URAS_Timetable_Template.xlsx"
                            ).catch((error) =>
                                showToast("error", errorMessage(error))
                            )
                        }
                    >
                        <Download className="size-4" /> Download URAS template
                    </button>
                    <button
                        type="submit"
                        className="button-primary"
                        disabled={
                            !workbook ||
                            !selectedTermId ||
                            !selectedGridId ||
                            uploadMutation.isPending
                        }
                    >
                        <Upload className="size-4" />{" "}
                        {uploadMutation.isPending
                            ? "Parsing…"
                            : "Upload & review"}
                    </button>
                </div>
            </form>

            {previews.length ? (
                <section>
                    <h2 className="mb-3 text-sm font-semibold">
                        Open previews
                    </h2>
                    <div className="space-y-2">
                        {previews.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setBatchId(item.id)}
                                className="flex w-full items-center justify-between rounded-md border bg-white p-4 text-left hover:border-brand-400"
                            >
                                <div>
                                    <p className="font-medium">
                                        {item.fileName}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.academicTerm.name} ·{" "}
                                        {item.slotSystem.name}
                                    </p>
                                </div>
                                <span className="text-sm text-amber-700">
                                    {item.errorRows} need attention
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    )
}

function PublicationCheckRow({
    label,
    count,
}: {
    label: string
    count: number
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-2 text-sm">
            <span>{label}</span>
            {count ? (
                <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                    <AlertTriangle className="size-4" /> {count} conflict
                    {count === 1 ? "" : "s"}
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="size-4" /> No conflicts
                </span>
            )}
        </div>
    )
}

function PublicationImpactPanel({
    loading,
    impact,
    onReviewPublished,
}: {
    loading: boolean
    impact?: TimetablePublicationImpact
    onReviewPublished: () => void
}) {
    if (loading) {
        return (
            <section className="rounded-md border bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" /> Checking
                    publication impact…
                </div>
            </section>
        )
    }
    if (!impact) {
        return (
            <section className="rounded-md border bg-white p-4">
                <p className="font-semibold">Publication impact</p>
                <p className="mt-1 text-sm text-red-600">
                    Publication impact could not be checked.
                </p>
            </section>
        )
    }
    if (!impact.hasImpact) {
        return (
            <section className="rounded-md border bg-white p-4">
                <p className="font-semibold">Publication impact</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="size-4" /> No external conflicts
                </p>
            </section>
        )
    }
    return (
        <section className="rounded-md border border-amber-200 bg-amber-50/40 p-4">
            <div>
                <p className="font-semibold text-slate-900">
                    Publication impact
                </p>
                <p className="mt-1 text-sm text-slate-600">
                    Review the affected timetable rows and live room usage
                    before publishing.
                </p>
            </div>
            <div className="mt-3 divide-y rounded-md border border-amber-200 bg-white px-4">
                <PublicationCheckRow
                    label="Published timetable"
                    count={impact.publishedConflicts.length}
                />
                <PublicationCheckRow
                    label="Approved bookings"
                    count={impact.bookingConflicts.length}
                />
                <PublicationCheckRow
                    label="Room restrictions"
                    count={impact.restrictionConflicts.length}
                />
            </div>
            {impact.publishedConflicts.length ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-white p-3 text-sm">
                    <div>
                        <p className="font-medium">
                            {impact.publishedConflicts.length} published
                            timetable conflict
                            {impact.publishedConflicts.length === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Change the candidate slot or room, or skip the
                            affected row.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={onReviewPublished}
                    >
                        Review affected rows
                    </button>
                </div>
            ) : null}
            {impact.bookingConflicts.length ? (
                <details
                    className="mt-3 rounded-md border border-amber-200 bg-white p-3"
                    open
                >
                    <summary className="cursor-pointer text-sm font-medium">
                        Approved bookings · {impact.bookingConflicts.length}{" "}
                        affected
                    </summary>
                    <ul className="mt-3 space-y-2">
                        {impact.bookingConflicts.map((item) => (
                            <li
                                key={item.id}
                                className="rounded-md bg-slate-50 p-3"
                            >
                                <p className="text-sm font-medium">
                                    {item.title} · {item.roomCode}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {item.date} ·{" "}
                                    {minuteToTime(item.startMinute)}–
                                    {minuteToTime(item.endMinute)} · Conflicts
                                    with {item.courses.join(", ")}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Requested by {item.requester.displayName}
                                </p>
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}
            {impact.restrictionConflicts.length ? (
                <details
                    className="mt-3 rounded-md border border-amber-200 bg-white p-3"
                    open
                >
                    <summary className="cursor-pointer text-sm font-medium">
                        Room restrictions · {impact.restrictionConflicts.length}
                    </summary>
                    <ul className="mt-3 space-y-2">
                        {impact.restrictionConflicts.map((item) => (
                            <li
                                key={item.id}
                                className="rounded-md bg-slate-50 p-3"
                            >
                                <p className="text-sm font-medium">
                                    {item.roomCode} · {item.reason}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {item.date} ·{" "}
                                    {minuteToTime(item.startMinute)}–
                                    {minuteToTime(item.endMinute)}
                                </p>
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}
        </section>
    )
}

function PublicationDialog({
    batch,
    loading,
    preview,
    busy,
    onClose,
    onPublish,
}: {
    batch: TimetableBatch
    loading: boolean
    preview?: PublicationPreview
    busy: boolean
    onClose: () => void
    onPublish: () => void
}) {
    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/35"
                onClick={onClose}
                aria-label="Close publication preview"
            />
            <div className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-md border bg-white p-5 shadow-xl">
                <h2 className="text-lg font-semibold">Ready to publish</h2>
                {loading ? (
                    <div className="flex h-36 items-center justify-center">
                        <Loader2 className="size-5 animate-spin" />
                    </div>
                ) : preview ? (
                    <div className="mt-4 space-y-4">
                        <div className="rounded-md border bg-slate-50 p-4 text-sm">
                            <p className="font-semibold">
                                {batch.academicTerm.name}
                            </p>
                            <p className="mt-1">
                                {batch.slotSystem.name} · Slot Grid Version{" "}
                                {batch.slotGridVersion.versionNumber}
                            </p>
                            <p className="mt-3 text-slate-600">
                                {batch.totalRows} source rows ·{" "}
                                {batch.validRows} allocations ready ·{" "}
                                {batch.skippedRows} skipped
                            </p>
                            <p className="mt-2 text-slate-500">
                                {preview.currentPublication
                                    ? `Replaces revision ${preview.currentPublication.revisionNumber}`
                                    : "First publication for this term and slot system"}
                            </p>
                        </div>
                        <div className="rounded-md border bg-white px-4 py-2">
                            <p className="border-b py-2 text-sm font-semibold">
                                Publication checks
                            </p>
                            <PublicationCheckRow
                                label="Internal timetable"
                                count={preview.internalConflicts.length}
                            />
                            <PublicationCheckRow
                                label="Published timetables"
                                count={preview.publishedConflicts.length}
                            />
                            <PublicationCheckRow
                                label="Approved bookings"
                                count={preview.bookingConflicts.length}
                            />
                            <PublicationCheckRow
                                label="Room restrictions"
                                count={preview.restrictionConflicts.length}
                            />
                        </div>
                        {preview.internalConflicts.length ? (
                            <div>
                                <p className="text-sm font-semibold">
                                    Conflicts within this import
                                </p>
                                <ul className="mt-2 space-y-2 text-sm">
                                    {preview.internalConflicts.map((item) => (
                                        <li
                                            key={`${item.firstRow.id}-${item.secondRow.id}`}
                                            className="rounded-md border p-3"
                                        >
                                            <p className="font-medium">
                                                Rows {item.firstRow.rowIndex}{" "}
                                                and {item.secondRow.rowIndex} ·{" "}
                                                {item.firstRow.roomCode}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.firstRow.courseCode} and{" "}
                                                {item.secondRow.courseCode}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.occurrences
                                                    .map(
                                                        (occurrence) =>
                                                            `${occurrence.dayOfWeek.slice(0, 3)} ${minuteToTime(occurrence.startMinute)}–${minuteToTime(occurrence.endMinute)}`
                                                    )
                                                    .join(", ")}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {preview.publishedConflicts.length ? (
                            <div>
                                <p className="text-sm font-semibold">
                                    Conflicts with published timetables
                                </p>
                                <ul className="mt-2 space-y-2 text-sm">
                                    {preview.publishedConflicts.map(
                                        (item, index) => (
                                            <li
                                                key={`${item.candidateRow.id}-${item.publishedTimetable.batchId}-${index}`}
                                                className="rounded-md border p-3"
                                            >
                                                <p className="font-medium">
                                                    Row{" "}
                                                    {item.candidateRow.rowIndex}{" "}
                                                    ·{" "}
                                                    {
                                                        item.candidateRow
                                                            .courseCode
                                                    }{" "}
                                                    · {item.roomCode}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Conflicts with{" "}
                                                    {
                                                        item.publishedTimetable
                                                            .slotSystemName
                                                    }{" "}
                                                    revision{" "}
                                                    {item.publishedTimetable
                                                        .revisionNumber || "—"}
                                                    {" · "}
                                                    {item.publishedCourse.code}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.occurrences
                                                        .map(
                                                            (occurrence) =>
                                                                `${occurrence.dayOfWeek.slice(0, 3)} ${minuteToTime(occurrence.startMinute)}–${minuteToTime(occurrence.endMinute)}`
                                                        )
                                                        .join(", ")}
                                                </p>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        ) : null}
                        {preview.bookingConflicts.length ? (
                            <div>
                                <p className="text-sm font-semibold">
                                    Affected approved events
                                </p>
                                <ul className="mt-2 space-y-2 text-sm">
                                    {preview.bookingConflicts.map((item) => (
                                        <li
                                            key={item.id}
                                            className="rounded-md border p-3"
                                        >
                                            <p className="font-medium">
                                                {item.title} · {item.roomCode}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {item.date} ·{" "}
                                                {minuteToTime(item.startMinute)}
                                                –{minuteToTime(item.endMinute)}{" "}
                                                · conflicts with{" "}
                                                {item.courses.join(", ")}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Requested by{" "}
                                                {item.requester.displayName}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {preview.restrictionConflicts.length ? (
                            <div>
                                <p className="text-sm font-semibold">
                                    Conflicting room restrictions
                                </p>
                                <ul className="mt-2 space-y-2 text-sm">
                                    {preview.restrictionConflicts.map(
                                        (item) => (
                                            <li
                                                key={item.id}
                                                className="rounded-md border p-3"
                                            >
                                                <p className="font-medium">
                                                    {item.roomCode} ·{" "}
                                                    {item.reason}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.date} ·{" "}
                                                    {minuteToTime(
                                                        item.startMinute
                                                    )}
                                                    –
                                                    {minuteToTime(
                                                        item.endMinute
                                                    )}
                                                </p>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={onClose}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                className="button-primary"
                                disabled={!preview.canPublish || busy}
                                onClick={onPublish}
                            >
                                {busy ? "Publishing…" : "Publish timetable"}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function RowWithResolution({
    row,
    batch,
    rooms,
    expanded,
    resolution,
    busy,
    onOpen,
    onResolution,
    onAction,
}: {
    row: TimetableImportRow
    batch: TimetableBatch
    rooms: Array<{
        id: string
        fullCode: string
        displayName: string | null
        building: { code: string; name: string }
    }>
    expanded: boolean
    resolution: { slotId: string; roomId: string }
    busy: boolean
    onOpen: () => void
    onResolution: (value: { slotId: string; roomId: string }) => void
    onAction: (
        action: "RESOLVE" | "SKIP" | "KEEP_DUPLICATE" | "KEEP_ALLOCATION"
    ) => void
}) {
    const hasAllocationConflict = Boolean(row.allocationConflicts?.length)
    const hasPublishedConflict = Boolean(row.publishedConflicts?.length)
    const hasConflict = hasAllocationConflict || hasPublishedConflict
    const ready = row.isResolved && row.adminDecision !== "SKIP" && !hasConflict
    const canOpen = !row.isResolved || hasConflict
    return (
        <>
            <tr
                className={canOpen ? "cursor-pointer" : ""}
                onClick={canOpen ? onOpen : undefined}
            >
                <td>{row.rowIndex}</td>
                <td className="font-medium">{row.rawCourseCode || "—"}</td>
                <td>{row.resolvedSlot?.code || row.rawSlot || "—"}</td>
                <td>{row.resolvedRoom?.fullCode || row.rawClassroom || "—"}</td>
                <td>
                    {row.adminDecision === "SKIP" ? (
                        <span className="status-badge border-slate-200 bg-slate-100 text-slate-600">
                            Skipped
                        </span>
                    ) : ready ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="size-4" /> Ready
                        </span>
                    ) : (
                        <div className="flex flex-col items-start gap-1.5">
                            {!row.isResolved ? (
                                <span className="status-badge border-amber-200 bg-amber-50 text-amber-800">
                                    {rowIssueLabel(row)}
                                </span>
                            ) : null}
                            {hasAllocationConflict ? (
                                <span className="status-badge border-amber-200 bg-amber-50 text-amber-800">
                                    Conflict within this import
                                </span>
                            ) : null}
                            {hasPublishedConflict ? (
                                <span className="status-badge border-amber-200 bg-amber-50 text-amber-800">
                                    Conflict with published timetable
                                </span>
                            ) : null}
                        </div>
                    )}
                </td>
            </tr>
            {expanded ? (
                <tr>
                    <td colSpan={5} className="bg-slate-50 p-0">
                        <div
                            className="space-y-4 p-4"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div>
                                <p className="font-semibold text-slate-900">
                                    Resolve row {row.rowIndex}
                                </p>
                                <p className="mt-1 text-sm text-amber-700">
                                    {hasPublishedConflict &&
                                    hasAllocationConflict
                                        ? "This row conflicts with this import and another published timetable. Choose another slot or room, or skip this row."
                                        : hasPublishedConflict
                                          ? "This room and time overlap another published timetable. Choose another slot or room, or skip this row."
                                          : hasAllocationConflict
                                            ? "Another row in this workbook uses this classroom during an overlapping slot occurrence."
                                            : row.issues?.join(". ")}
                                </p>
                            </div>
                            {hasPublishedConflict ? (
                                <div className="space-y-2">
                                    {row.publishedConflicts.map(
                                        (conflict, index) => (
                                            <div
                                                key={`${conflict.publishedTimetable.batchId}-${conflict.publishedCourse.code}-${index}`}
                                                className="rounded-md border border-amber-200 bg-white p-3"
                                            >
                                                <p className="text-sm font-medium text-slate-900">
                                                    {
                                                        conflict
                                                            .publishedTimetable
                                                            .slotSystemName
                                                    }{" "}
                                                    · Revision{" "}
                                                    {conflict.publishedTimetable
                                                        .revisionNumber || "—"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {conflict.publishedCourse
                                                        .code || "Course"}
                                                    {conflict.publishedCourse
                                                        .name
                                                        ? ` · ${conflict.publishedCourse.name}`
                                                        : ""}
                                                    {" · "}
                                                    {conflict.roomCode}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {conflict.occurrences.map(
                                                        (occurrence) => (
                                                            <span
                                                                key={`${occurrence.dayOfWeek}-${occurrence.startMinute}-${occurrence.endMinute}`}
                                                                className="status-badge border-amber-200 bg-amber-50 text-amber-800"
                                                            >
                                                                {occurrence.dayOfWeek
                                                                    .slice(0, 3)
                                                                    .toLowerCase()
                                                                    .replace(
                                                                        /^./,
                                                                        (
                                                                            value
                                                                        ) =>
                                                                            value.toUpperCase()
                                                                    )}{" "}
                                                                {minuteToTime(
                                                                    occurrence.startMinute
                                                                )}
                                                                –
                                                                {minuteToTime(
                                                                    occurrence.endMinute
                                                                )}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    )}
                                    <p className="text-xs text-slate-500">
                                        The published timetable remains
                                        unchanged. Edit this row or skip it.
                                    </p>
                                </div>
                            ) : null}
                            {hasAllocationConflict ? (
                                <div className="space-y-2">
                                    {row.allocationConflicts.map(
                                        ({ otherRow, occurrences }) => (
                                            <div
                                                key={otherRow.id}
                                                className="rounded-md border border-amber-200 bg-white p-3"
                                            >
                                                <p className="text-sm font-medium text-slate-900">
                                                    Conflicts with row{" "}
                                                    {otherRow.rowIndex}
                                                    {" · "}
                                                    {otherRow.courseCode ||
                                                        "Course code missing"}
                                                </p>
                                                {otherRow.courseName ? (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {otherRow.courseName}
                                                    </p>
                                                ) : null}
                                                <p className="mt-2 text-xs text-slate-600">
                                                    Slot {otherRow.slotCode} ·{" "}
                                                    {otherRow.roomCode}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {occurrences.map(
                                                        (occurrence) => (
                                                            <span
                                                                key={`${occurrence.dayOfWeek}-${occurrence.startMinute}-${occurrence.endMinute}`}
                                                                className="status-badge border-amber-200 bg-amber-50 text-amber-800"
                                                            >
                                                                {occurrence.dayOfWeek
                                                                    .slice(0, 3)
                                                                    .toLowerCase()
                                                                    .replace(
                                                                        /^./,
                                                                        (
                                                                            value
                                                                        ) =>
                                                                            value.toUpperCase()
                                                                    )}{" "}
                                                                {minuteToTime(
                                                                    occurrence.startMinute
                                                                )}
                                                                –
                                                                {minuteToTime(
                                                                    occurrence.endMinute
                                                                )}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    )}
                                    {!hasPublishedConflict ? (
                                        <p className="text-xs text-slate-500">
                                            Keeping this allocation will skip
                                            every row listed above. The original
                                            workbook rows remain in this import
                                            history.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                            {row.rawCourseCode ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label>
                                        <span className="field-label">
                                            Resolved slot
                                        </span>
                                        <select
                                            className="field-select"
                                            value={resolution.slotId}
                                            onChange={(event) =>
                                                onResolution({
                                                    ...resolution,
                                                    slotId: event.target.value,
                                                })
                                            }
                                        >
                                            <option value="">
                                                Choose slot
                                            </option>
                                            {batch.slotGridVersion.slots.map(
                                                (slot) => (
                                                    <option
                                                        key={slot.id}
                                                        value={slot.id}
                                                    >
                                                        {slot.code}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>
                                    <label>
                                        <span className="field-label">
                                            Resolved classroom
                                        </span>
                                        <select
                                            className="field-select"
                                            value={resolution.roomId}
                                            onChange={(event) =>
                                                onResolution({
                                                    ...resolution,
                                                    roomId: event.target.value,
                                                })
                                            }
                                        >
                                            <option value="">
                                                Choose classroom
                                            </option>
                                            {rooms.map((room) => (
                                                <option
                                                    key={room.id}
                                                    value={room.id}
                                                >
                                                    {room.fullCode}
                                                    {room.displayName
                                                        ? ` · ${room.displayName}`
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-600">
                                    A missing course code must be corrected in
                                    the workbook or this row must be skipped.
                                </p>
                            )}
                            {row.auxiliaryData &&
                            Object.keys(row.auxiliaryData).length ? (
                                <details className="text-sm">
                                    <summary className="cursor-pointer font-medium text-slate-600">
                                        Source details
                                    </summary>
                                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                                        {Object.entries(row.auxiliaryData).map(
                                            ([key, value]) => (
                                                <div key={key}>
                                                    <dt className="text-xs text-slate-400">
                                                        {key}
                                                    </dt>
                                                    <dd>{value}</dd>
                                                </div>
                                            )
                                        )}
                                    </dl>
                                </details>
                            ) : null}
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    className="button-secondary"
                                    disabled={busy}
                                    onClick={() => onAction("SKIP")}
                                >
                                    Skip row
                                </button>
                                {hasConflict ? (
                                    <>
                                        {hasAllocationConflict &&
                                        !hasPublishedConflict ? (
                                            <button
                                                type="button"
                                                className="button-secondary"
                                                disabled={busy}
                                                onClick={() =>
                                                    onAction("KEEP_ALLOCATION")
                                                }
                                            >
                                                Keep this allocation
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className="button-primary"
                                            disabled={
                                                busy ||
                                                !resolution.slotId ||
                                                !resolution.roomId
                                            }
                                            onClick={() => onAction("RESOLVE")}
                                        >
                                            Save new slot or room
                                        </button>
                                    </>
                                ) : row.initialClassification ===
                                  "DUPLICATE_ROW" ? (
                                    <button
                                        type="button"
                                        className="button-primary"
                                        disabled={busy}
                                        onClick={() =>
                                            onAction("KEEP_DUPLICATE")
                                        }
                                    >
                                        Keep this row, skip other
                                    </button>
                                ) : row.rawCourseCode ? (
                                    <button
                                        type="button"
                                        className="button-primary"
                                        disabled={
                                            busy ||
                                            !resolution.slotId ||
                                            !resolution.roomId
                                        }
                                        onClick={() => onAction("RESOLVE")}
                                    >
                                        Save resolution
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </td>
                </tr>
            ) : null}
        </>
    )
}
