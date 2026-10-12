import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    ChevronDown,
    ChevronUp,
    CircleAlert,
    Plus,
    Save,
    Trash2,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { useToast } from "../../components/toastContext"
import {
    adminAccessApi,
    errorMessage,
    type BookingActivityType,
} from "../../lib/api"
import { StatusBadge } from "./shared"

export function ActivityApprovalsPanel() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const [newTypeName, setNewTypeName] = useState("")
    const [expandedId, setExpandedId] = useState("")
    const typesQuery = useQuery({
        queryKey: ["booking-activity-types"],
        queryFn: adminAccessApi.listBookingActivityTypes,
    })
    const optionsQuery = useQuery({
        queryKey: ["booking-approver-options"],
        queryFn: adminAccessApi.getBookingApproverOptions,
    })
    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: ["booking-activity-types"],
            }),
            queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        ])
    }
    const createType = useMutation({
        mutationFn: () =>
            adminAccessApi.createBookingActivityType(newTypeName.trim()),
        onSuccess: async ({ activityType }) => {
            setNewTypeName("")
            setExpandedId(activityType.id)
            showToast("success", "Activity type created")
            await refresh()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    if (typesQuery.isError || optionsQuery.isError) {
        return (
            <div className="inline-alert border-red-200 bg-red-50 text-red-700">
                <CircleAlert className="size-4" />
                {errorMessage(typesQuery.error || optionsQuery.error)}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                Each active activity type has its own approval route. Every
                listed approver must approve, in any order.
            </div>
            <form
                className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 shadow-sm"
                onSubmit={(event: FormEvent) => {
                    event.preventDefault()
                    if (newTypeName.trim().length >= 2) createType.mutate()
                }}
            >
                <label className="min-w-64 flex-1">
                    <span className="field-label">New activity type</span>
                    <input
                        className="field-input"
                        value={newTypeName}
                        onChange={(event) => setNewTypeName(event.target.value)}
                        placeholder="e.g. Department activities"
                        minLength={2}
                        maxLength={160}
                    />
                </label>
                <button
                    className="button-primary"
                    disabled={
                        createType.isPending || newTypeName.trim().length < 2
                    }
                >
                    <Plus className="size-4" /> Create inactive type
                </button>
            </form>
            <div className="space-y-3">
                {typesQuery.data?.activityTypes.map((activityType) => (
                    <ActivityTypeCard
                        key={activityType.id}
                        activityType={activityType}
                        users={optionsQuery.data?.users || []}
                        expanded={expandedId === activityType.id}
                        onToggle={() =>
                            setExpandedId(
                                expandedId === activityType.id
                                    ? ""
                                    : activityType.id
                            )
                        }
                        onChanged={refresh}
                    />
                ))}
            </div>
        </div>
    )
}

function ActivityTypeCard({
    activityType,
    users,
    expanded,
    onToggle,
    onChanged,
}: {
    activityType: BookingActivityType
    users: Array<{
        id: string
        name: string
        email: string
        role: "STUDENT" | "FACULTY" | "STAFF" | "ADMIN"
    }>
    expanded: boolean
    onToggle: () => void
    onChanged: () => Promise<void>
}) {
    const { showToast } = useToast()
    const [name, setName] = useState(activityType.name)
    const [userId, setUserId] = useState("")
    const [label, setLabel] = useState("")
    const [deleteOpen, setDeleteOpen] = useState(false)
    const activeApprovers = activityType.approvers.filter(
        (item) => item.isActive && item.user.isActive
    )
    const typeMutation = useMutation({
        mutationFn: (changes: { name?: string; isActive?: boolean }) =>
            adminAccessApi.updateBookingActivityType(activityType.id, changes),
        onSuccess: async () => {
            showToast("success", "Activity type updated")
            await onChanged()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })
    const addMutation = useMutation({
        mutationFn: () =>
            adminAccessApi.createBookingActivityApprover(
                activityType.id,
                userId,
                label.trim()
            ),
        onSuccess: async () => {
            setUserId("")
            setLabel("")
            showToast("success", "Approver assigned")
            await onChanged()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })
    const assignmentMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            adminAccessApi.updateBookingActivityApprover(activityType.id, id, {
                isActive,
            }),
        onSuccess: async () => {
            showToast("success", "Approver updated")
            await onChanged()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })
    const deleteMutation = useMutation({
        mutationFn: () =>
            adminAccessApi.deleteBookingActivityType(activityType.id),
        onSuccess: async () => {
            setDeleteOpen(false)
            showToast("success", "Activity type deleted")
            await onChanged()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    return (
        <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <button
                type="button"
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
                onClick={onToggle}
            >
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                            {activityType.name}
                        </p>
                        <StatusBadge active={activityType.isActive} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        {activeApprovers.length} active approver
                        {activeApprovers.length === 1 ? "" : "s"}
                        {!activityType.isActive && activeApprovers.length === 0
                            ? " · Add an approver before activation"
                            : ""}
                    </p>
                </div>
                {expanded ? (
                    <ChevronUp className="size-4" />
                ) : (
                    <ChevronDown className="size-4" />
                )}
            </button>
            {expanded ? (
                <div className="space-y-5 border-t bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="min-w-64 flex-1">
                            <span className="field-label">Activity name</span>
                            <input
                                className="field-input"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                            />
                        </label>
                        <button
                            type="button"
                            className="button-secondary"
                            disabled={
                                typeMutation.isPending ||
                                name.trim().length < 2 ||
                                name.trim() === activityType.name
                            }
                            onClick={() =>
                                typeMutation.mutate({ name: name.trim() })
                            }
                        >
                            <Save className="size-4" /> Save name
                        </button>
                        <button
                            type="button"
                            className={
                                activityType.isActive
                                    ? "button-danger"
                                    : "button-secondary"
                            }
                            disabled={typeMutation.isPending}
                            onClick={() =>
                                typeMutation.mutate({
                                    isActive: !activityType.isActive,
                                })
                            }
                        >
                            {activityType.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {!activityType.isActive &&
                        activityType._count.requests === 0 ? (
                            <button
                                type="button"
                                className="button-danger"
                                disabled={deleteMutation.isPending}
                                onClick={() => setDeleteOpen(true)}
                            >
                                <Trash2 className="size-4" /> Delete
                            </button>
                        ) : null}
                    </div>
                    {!activityType.isActive &&
                    activityType._count.requests > 0 ? (
                        <p className="text-xs text-slate-500">
                            Used by {activityType._count.requests} booking
                            {activityType._count.requests === 1 ? "" : "s"};
                            retained for booking history.
                        </p>
                    ) : null}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Required approvers
                        </h3>
                        <div className="mt-2 divide-y rounded-md border bg-white">
                            {activityType.approvers.length ? (
                                activityType.approvers.map((approver) => (
                                    <div
                                        key={approver.id}
                                        className="flex flex-wrap items-center justify-between gap-3 p-3"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                {approver.reviewerLabel} ·{" "}
                                                {approver.user.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {approver.user.role.toLowerCase()}{" "}
                                                · {approver.user.email}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className={
                                                approver.isActive
                                                    ? "button-danger"
                                                    : "button-secondary"
                                            }
                                            disabled={
                                                assignmentMutation.isPending
                                            }
                                            onClick={() =>
                                                assignmentMutation.mutate({
                                                    id: approver.id,
                                                    isActive:
                                                        !approver.isActive,
                                                })
                                            }
                                        >
                                            {approver.isActive
                                                ? "Deactivate"
                                                : "Activate"}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="p-4 text-sm text-slate-500">
                                    No approvers assigned yet.
                                </p>
                            )}
                        </div>
                    </div>
                    <form
                        className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-end"
                        onSubmit={(event) => {
                            event.preventDefault()
                            if (userId && label.trim().length >= 2)
                                addMutation.mutate()
                        }}
                    >
                        <label>
                            <span className="field-label">
                                Faculty or staff
                            </span>
                            <select
                                className="field-select"
                                value={userId}
                                onChange={(event) =>
                                    setUserId(event.target.value)
                                }
                            >
                                <option value="">Select a user</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} · {user.role.toLowerCase()}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="field-label">Approval label</span>
                            <input
                                className="field-input"
                                value={label}
                                onChange={(event) =>
                                    setLabel(event.target.value)
                                }
                                placeholder="e.g. Dean of Student Affairs"
                                maxLength={100}
                            />
                        </label>
                        <button
                            className="button-primary"
                            disabled={
                                addMutation.isPending ||
                                !userId ||
                                label.trim().length < 2
                            }
                        >
                            <Plus className="size-4" /> Add approver
                        </button>
                    </form>
                    <ConfirmDialog
                        open={deleteOpen}
                        title="Delete activity type?"
                        description={
                            <>
                                <strong>{activityType.name}</strong> and its
                                approver assignments will be permanently
                                removed.
                            </>
                        }
                        confirmLabel="Delete"
                        destructive
                        busy={deleteMutation.isPending}
                        onConfirm={() => deleteMutation.mutate()}
                        onClose={() => setDeleteOpen(false)}
                    />
                </div>
            ) : null}
        </section>
    )
}
