import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, Plus, Save } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useToast } from "../../components/toastContext"
import { adminAccessApi, errorMessage } from "../../lib/api"
import { StatusBadge } from "./shared"

export function InstitutionalApproversPanel() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const [userId, setUserId] = useState("")
    const [title, setTitle] = useState("")
    const [titles, setTitles] = useState<Record<string, string>>({})

    const approversQuery = useQuery({
        queryKey: ["institutional-approvers"],
        queryFn: adminAccessApi.listInstitutionalApprovers,
    })
    const optionsQuery = useQuery({
        queryKey: ["institutional-approver-options"],
        queryFn: adminAccessApi.getInstitutionalApproverOptions,
    })
    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["institutional-approvers"] }),
            queryClient.invalidateQueries({ queryKey: ["institutional-approver-options"] }),
            queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        ])
    }
    const createMutation = useMutation({
        mutationFn: () => adminAccessApi.createInstitutionalApprover(userId, title.trim()),
        onSuccess: async () => {
            setUserId("")
            setTitle("")
            showToast("success", "Institutional approver added")
            await refresh()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })
    const updateMutation = useMutation({
        mutationFn: ({ id, changes }: { id: string; changes: { title?: string; isActive?: boolean } }) =>
            adminAccessApi.updateInstitutionalApprover(id, changes),
        onSuccess: async () => {
            showToast("success", "Institutional approver updated")
            await refresh()
        },
        onError: (error) => showToast("error", errorMessage(error)),
    })

    const submit = (event: FormEvent) => {
        event.preventDefault()
        if (userId && title.trim()) createMutation.mutate()
    }

    if (approversQuery.isError || optionsQuery.isError) {
        return (
            <div className="inline-alert border-red-200 bg-red-50 text-red-700">
                <CircleAlert className="size-4" />
                {errorMessage(approversQuery.error || optionsQuery.error)}
            </div>
        )
    }

    const currentUserIds = new Set(
        approversQuery.data?.approvers.map((approver) => approver.user.id) || []
    )

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                Every active member must approve each institutional-stage request. Decisions can be made in any order.
            </div>
            <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.4fr_1fr_auto] md:items-end">
                <label>
                    <span className="field-label">Faculty member</span>
                    <select className="field-select" value={userId} onChange={(event) => setUserId(event.target.value)} required>
                        <option value="">Select active faculty</option>
                        {optionsQuery.data?.faculty
                            .filter((faculty) => !currentUserIds.has(faculty.id))
                            .map((faculty) => (
                                <option key={faculty.id} value={faculty.id}>
                                    {faculty.name} ({faculty.email})
                                </option>
                            ))}
                    </select>
                </label>
                <label>
                    <span className="field-label">Approval title</span>
                    <input className="field-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. DOSA" minLength={2} maxLength={100} required />
                </label>
                <button className="button-primary" disabled={createMutation.isPending || !userId || title.trim().length < 2}>
                    <Plus className="size-4" /> Add approver
                </button>
            </form>

            <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {!approversQuery.data?.approvers.length ? (
                    <div className="p-8 text-center text-sm text-slate-500">No institutional approvers configured.</div>
                ) : (
                    approversQuery.data.approvers.map((approver) => {
                        const editedTitle = titles[approver.id] ?? approver.title
                        return (
                            <div key={approver.id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_auto_auto] md:items-end">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900">{approver.user.name}</p>
                                        <StatusBadge active={approver.isActive} />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">{approver.user.email}</p>
                                </div>
                                <label>
                                    <span className="field-label">Approval title</span>
                                    <input className="field-input" value={editedTitle} maxLength={100} onChange={(event) => setTitles({ ...titles, [approver.id]: event.target.value })} />
                                </label>
                                <button type="button" className="button-secondary" disabled={updateMutation.isPending || editedTitle.trim().length < 2 || editedTitle.trim() === approver.title} onClick={() => updateMutation.mutate({ id: approver.id, changes: { title: editedTitle.trim() } })}>
                                    <Save className="size-4" /> Save
                                </button>
                                <button type="button" className={approver.isActive ? "button-danger" : "button-secondary"} disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: approver.id, changes: { isActive: !approver.isActive } })}>
                                    {approver.isActive ? "Deactivate" : "Activate"}
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
