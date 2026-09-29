import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronDown,
    Circle,
    Clock3,
    Loader2,
    MapPin,
    UsersRound,
    XCircle,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { useAuth } from "../auth/useAuth"
import { FormDialog } from "../components/FormDialog"
import { useToast } from "../components/toastContext"
import { ApiClientError } from "../lib/api"
import {
    bookingApi,
    type ApprovalRole,
    type FinalizationPreview,
    type WorkflowTask,
} from "../lib/bookingApi"
import {
    bookingStatusClasses,
    bookingStatusLabels,
    bookingTime,
    readableBookingDate,
} from "./booking/shared"

const actionLabels: Record<string, string> = {
    CREATED: "Request submitted",
    FACULTY_APPROVED: "Faculty approved",
    FACULTY_REJECTED: "Faculty rejected",
    SENT_TO_DEANS: "Sent for institutional approval",
    DEAN_APPROVED: "Institutional approval recorded",
    DEAN_REJECTED: "Institutional reviewer rejected",
    FINAL_APPROVED: "Room request approved",
    AUTO_REJECTED_CONFLICT:
        "Request rejected after another request secured the room",
    AUTO_REJECTED_EXPIRED: "Request rejected because its start time passed",
    NOTE_ADDED: "Workflow note",
}

function taskIcon(task: WorkflowTask) {
    if (task.status === "APPROVED")
        return <CheckCircle2 className="size-4 text-emerald-600" />
    if (task.status === "REJECTED")
        return <XCircle className="size-4 text-red-600" />
    if (task.status === "CLOSED")
        return <XCircle className="size-4 text-slate-400" />
    if (task.status === "PENDING")
        return <Clock3 className="size-4 text-amber-600" />
    return <Circle className="size-4 text-slate-300" />
}

function roleLabel(role: ApprovalRole) {
    return role === "FACULTY" ? "Faculty verifier" : role
}

export function BookingDetailPage() {
    const { id = "" } = useParams()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const [decisionMode, setDecisionMode] = useState<
        "APPROVE" | "REJECT" | null
    >(null)
    const [decisionNote, setDecisionNote] = useState("")
    const [sharedConflictNote, setSharedConflictNote] = useState("")
    const [preview, setPreview] = useState<FinalizationPreview | null>(null)
    const [decisionError, setDecisionError] = useState("")

    const query = useQuery({
        queryKey: ["booking-request", id],
        queryFn: () => bookingApi.get(id),
        enabled: Boolean(id),
    })
    const request = query.data?.request
    const activeTask = request?.approvals.find(
        (approval) =>
            approval.reviewerUserId === user?.id &&
            approval.status === "PENDING"
    )

    const previewMutation = useMutation({
        mutationFn: (approvalId: string) =>
            bookingApi.finalizationPreview(approvalId),
        onSuccess: ({ preview: nextPreview }) => {
            setPreview(nextPreview)
            setDecisionMode("APPROVE")
            setDecisionError("")
        },
        onError: (error) => setDecisionError(error.message),
    })

    const decisionMutation = useMutation({
        mutationFn: ({
            approvalId,
            version,
        }: {
            approvalId: string
            version: number
        }) =>
            bookingApi.decide(approvalId, {
                decision: decisionMode!,
                ...(decisionNote.trim() ? { note: decisionNote.trim() } : {}),
                expectedRequestVersion: preview?.requestVersion ?? version,
                ...(preview?.requiresFinalizationConfirmation
                    ? {
                          expectedCompetitorIds: preview.competitors.map(
                              (item) => item.id
                          ),
                          ...(sharedConflictNote.trim()
                              ? {
                                    sharedConflictNote:
                                        sharedConflictNote.trim(),
                                }
                              : {}),
                      }
                    : {}),
            }),
        onSuccess: async () => {
            setDecisionMode(null)
            setDecisionNote("")
            setSharedConflictNote("")
            setPreview(null)
            setDecisionError("")
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["booking-request", id],
                }),
                queryClient.invalidateQueries({ queryKey: ["approval-queue"] }),
                queryClient.invalidateQueries({
                    queryKey: ["my-booking-requests"],
                }),
            ])
            showToast("success", "Decision recorded")
        },
        onError: async (error) => {
            setDecisionError(error.message)
            if (
                error instanceof ApiClientError &&
                ["REQUEST_STATE_CHANGED", "APPROVAL_TASK_COMPLETED"].includes(
                    error.code
                )
            ) {
                setDecisionMode(null)
                setPreview(null)
                await queryClient.invalidateQueries({
                    queryKey: ["booking-request", id],
                })
            }
        },
    })

    const beginApprove = () => {
        if (!activeTask) return
        setDecisionNote("")
        setSharedConflictNote("")
        setDecisionError("")
        previewMutation.mutate(activeTask.id)
    }

    const beginReject = () => {
        setPreview(null)
        setDecisionNote("")
        setDecisionError("")
        setDecisionMode("REJECT")
    }

    const submitDecision = (event: FormEvent) => {
        event.preventDefault()
        if (!activeTask || !request) return
        if (decisionMode === "REJECT" && !decisionNote.trim()) {
            setDecisionError("A rejection reason is required")
            return
        }
        decisionMutation.mutate({
            approvalId: activeTask.id,
            version: request.version,
        })
    }

    if (query.isLoading) {
        return (
            <div className="flex min-h-60 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 size-4 animate-spin" /> Loading request
            </div>
        )
    }
    if (query.error || !request) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {query.error?.message || "Booking request was not found"}
            </div>
        )
    }

    const reviewerView = Boolean(activeTask)

    return (
        <div className="mx-auto max-w-4xl space-y-5">
            <header>
                <Link
                    to={reviewerView ? "/approvals" : "/bookings"}
                    className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
                >
                    <ArrowLeft className="size-4" />{" "}
                    {reviewerView
                        ? "Review Queue"
                        : user?.role === "STUDENT"
                          ? "My Requests"
                          : "Booking History"}
                </Link>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="page-title">{request.title}</h1>
                        <p className="page-subtitle">
                            Requested by {request.requester.name}
                        </p>
                    </div>
                    <span
                        className={`status-badge ${bookingStatusClasses[request.status]}`}
                    >
                        {bookingStatusLabels[request.status]}
                    </span>
                </div>
            </header>

            {request.statusReason ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-semibold">
                        {request.status === "REJECTED"
                            ? "Reason"
                            : "Status update"}
                    </p>
                    <p className="mt-1">{request.statusReason}</p>
                </div>
            ) : null}

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-xs font-medium text-slate-500">
                            Room
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <MapPin className="size-4 text-slate-400" />{" "}
                            {request.room.fullCode}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">
                            Date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            {readableBookingDate(request.bookingDate)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">
                            Time
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            {bookingTime(
                                request.startMinute,
                                request.endMinute
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">
                            Participants
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <UsersRound className="size-4 text-slate-400" />{" "}
                            {request.expectedParticipants ?? "Not provided"}
                        </p>
                    </div>
                </div>
                {request.capacityUnverified ? (
                    <p className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangle className="size-4 shrink-0" /> Room
                        capacity has not been configured, so suitability is
                        unverified.
                    </p>
                ) : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Purpose
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                            {request.purpose}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">
                            Event type
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                            {request.eventType.toLowerCase().replace("_", " ")}
                        </p>
                    </div>
                    {request.specialRequirements ? (
                        <div>
                            <p className="text-xs font-medium text-slate-500">
                                Special requirements
                            </p>
                            <p className="mt-1 text-sm text-slate-800">
                                {request.specialRequirements}
                            </p>
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="font-semibold text-slate-900">
                    Approval progress
                </h2>
                <div className="mt-4 space-y-4">
                    {request.workflow.map((stage) => (
                        <div key={stage.key}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {stage.label}
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                {stage.tasks.map((task) => (
                                    <div
                                        key={task.role}
                                        className={`flex items-start gap-2 rounded-md border p-3 ${task.approvalId && task.reviewer?.id === user?.id && task.status === "PENDING" ? "border-brand-300 bg-brand-50" : "border-slate-200"}`}
                                    >
                                        <span className="mt-0.5">
                                            {taskIcon(task)}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800">
                                                {task.label}
                                                {task.reviewer?.id === user?.id
                                                    ? " — You"
                                                    : ""}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                {task.reviewer?.name ||
                                                    (task.status ===
                                                    "NOT_STARTED"
                                                        ? "Not started"
                                                        : "Awaiting assignment")}
                                            </p>
                                            {task.decisionNote ? (
                                                <p className="mt-2 text-xs text-slate-600">
                                                    {task.decisionNote}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {activeTask ? (
                    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            className="button-danger"
                            onClick={beginReject}
                        >
                            <XCircle className="size-4" /> Reject
                        </button>
                        <button
                            type="button"
                            className="button-primary"
                            onClick={beginApprove}
                            disabled={previewMutation.isPending}
                        >
                            {previewMutation.isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Check className="size-4" />
                            )}{" "}
                            Approve
                        </button>
                    </div>
                ) : null}
                {decisionError && !decisionMode ? (
                    <p className="mt-3 text-sm text-red-700">{decisionError}</p>
                ) : null}
            </section>

            {request.pendingCompetitorCount > 0 &&
            request.status.startsWith("PENDING") ? (
                <details className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-amber-900">
                        <AlertTriangle className="size-4" /> Competition details{" "}
                        <ChevronDown className="size-4" />
                    </summary>
                    <p className="mt-3 text-sm text-amber-800">
                        {request.pendingCompetitorCount} other pending request
                        {request.pendingCompetitorCount === 1
                            ? " overlaps"
                            : "s overlap"}{" "}
                        this room and time. Pending requests do not reserve the
                        room.
                    </p>
                </details>
            ) : null}

            <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900">
                    History <ChevronDown className="size-4 text-slate-400" />
                </summary>
                <ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">
                    {request.actions.map((action) => (
                        <li key={action.id}>
                            <p className="text-sm font-medium text-slate-800">
                                {actionLabels[action.actionType] ||
                                    action.actionType}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {new Intl.DateTimeFormat("en-GB", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                }).format(new Date(action.createdAt))}
                                {action.performedBy
                                    ? ` · ${action.performedBy.name}`
                                    : " · System"}
                            </p>
                            {action.note ? (
                                <p className="mt-1 text-sm text-slate-600">
                                    {action.note}
                                </p>
                            ) : null}
                        </li>
                    ))}
                </ol>
            </details>

            <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900">
                    Room details{" "}
                    <ChevronDown className="size-4 text-slate-400" />
                </summary>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Building: {request.room.building.name}</p>
                    <p>
                        Type: {request.room.roomType?.name || "Not specified"}
                    </p>
                    <p>Capacity: {request.room.capacity ?? "Not configured"}</p>
                    <p>
                        {request.room.isAccessible
                            ? "Accessible"
                            : "Accessibility not marked"}
                    </p>
                    <p className="sm:col-span-2">
                        Features:{" "}
                        {request.room.features.length
                            ? request.room.features.join(", ")
                            : "None listed"}
                    </p>
                </div>
            </details>

            <FormDialog
                open={decisionMode !== null}
                title={
                    decisionMode === "REJECT"
                        ? `Reject as ${activeTask ? roleLabel(activeTask.reviewerRole) : "reviewer"}`
                        : "Approve request"
                }
                description={
                    preview?.requiresFinalizationConfirmation
                        ? "This is the final required approval. Availability will be checked again before the room is allocated."
                        : undefined
                }
                onClose={() => {
                    if (!decisionMutation.isPending) {
                        setDecisionMode(null)
                        setPreview(null)
                        setDecisionError("")
                    }
                }}
            >
                <form onSubmit={submitDecision} className="space-y-4">
                    {preview?.requiresFinalizationConfirmation &&
                    preview.competitors.length > 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <p className="font-semibold">
                                Approving will reject{" "}
                                {preview.competitors.length} overlapping pending
                                request
                                {preview.competitors.length === 1 ? "" : "s"}.
                            </p>
                            <p className="mt-2 text-xs text-amber-800">
                                System reason: {preview.systemReason}
                            </p>
                            {preview.competitors.length ? (
                                <ul className="mt-3 space-y-1 text-xs text-amber-800">
                                    {preview.competitors.map((item) => (
                                        <li key={item.id}>
                                            {item.title} · {item.requester.name}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : null}

                    <label>
                        <span className="field-label">
                            {decisionMode === "REJECT"
                                ? "Rejection reason"
                                : "Decision note"}
                            {decisionMode === "APPROVE" ? (
                                <span className="font-normal text-slate-400">
                                    {" "}
                                    Optional
                                </span>
                            ) : null}
                        </span>
                        <textarea
                            className="field-input min-h-24 resize-y"
                            required={decisionMode === "REJECT"}
                            maxLength={2000}
                            value={decisionNote}
                            onChange={(event) =>
                                setDecisionNote(event.target.value)
                            }
                            placeholder={
                                decisionMode === "REJECT"
                                    ? "Explain why this request cannot be approved"
                                    : "Add a note for the requester"
                            }
                        />
                    </label>

                    {preview?.requiresFinalizationConfirmation &&
                    preview.competitors.length ? (
                        <label>
                            <span className="field-label">
                                Shared note for rejected requesters{" "}
                                <span className="font-normal text-slate-400">
                                    Optional
                                </span>
                            </span>
                            <textarea
                                className="field-input min-h-20 resize-y"
                                maxLength={1000}
                                value={sharedConflictNote}
                                onChange={(event) =>
                                    setSharedConflictNote(event.target.value)
                                }
                                placeholder="Please try another room or time."
                            />
                        </label>
                    ) : null}

                    {decisionMode === "REJECT" ? (
                        <p className="text-xs text-slate-500">
                            Rejecting ends this request and closes its remaining
                            approval tasks.
                        </p>
                    ) : null}
                    {decisionError ? (
                        <p className="text-sm text-red-700" role="alert">
                            {decisionError}
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            className="button-secondary"
                            disabled={decisionMutation.isPending}
                            onClick={() => setDecisionMode(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={
                                decisionMode === "REJECT"
                                    ? "button-danger"
                                    : "button-primary"
                            }
                            disabled={decisionMutation.isPending}
                        >
                            {decisionMutation.isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : decisionMode === "REJECT" ? (
                                <XCircle className="size-4" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {decisionMode === "REJECT"
                                ? "Reject request"
                                : preview?.requiresFinalizationConfirmation &&
                                    preview.competitors.length > 0
                                  ? "Approve and reject others"
                                  : "Approve request"}
                        </button>
                    </div>
                </form>
            </FormDialog>
        </div>
    )
}
