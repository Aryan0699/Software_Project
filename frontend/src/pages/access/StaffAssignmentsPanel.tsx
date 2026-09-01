import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { useToast } from "../../components/toastContext"
import { adminAccessApi, errorMessage, type StaffAssignment } from "../../lib/api"
import { PaginationBar, TableState } from "./shared"

export function StaffAssignmentsPanel() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [buildingId, setBuildingId] = useState("")
  const [staffUserId, setStaffUserId] = useState("")
  const [page, setPage] = useState(1)
  const [removing, setRemoving] = useState<StaffAssignment | null>(null)

  const assignmentsQuery = useQuery({
    queryKey: ["staff-assignments", page],
    queryFn: () => adminAccessApi.listStaffAssignments({ page, pageSize: 25 }),
  })
  const optionsQuery = useQuery({
    queryKey: ["assignment-options"],
    queryFn: adminAccessApi.getStaffAssignmentOptions,
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-assignments"] })
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  }

  const createMutation = useMutation({
    mutationFn: () => adminAccessApi.createStaffAssignment(buildingId, staffUserId),
    onSuccess: async () => {
      setBuildingId("")
      setStaffUserId("")
      showToast("success", "Staff member assigned to building")
      await invalidate()
    },
    onError: (error) => showToast("error", errorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAccessApi.deleteStaffAssignment(id),
    onSuccess: async () => {
      setRemoving(null)
      showToast("success", "Building assignment removed")
      await invalidate()
    },
    onError: (error) => showToast("error", errorMessage(error)),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    createMutation.mutate()
  }

  const hasOptions = Boolean(optionsQuery.data?.buildings.length && optionsQuery.data.staffUsers.length)

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="border-y border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-60 flex-1">
            <span className="field-label">Staff member</span>
            <select
              className="field-select"
              value={staffUserId}
              onChange={(event) => setStaffUserId(event.target.value)}
              required
            >
              <option value="">Select staff</option>
              {optionsQuery.data?.staffUsers.map((user) => (
                <option value={user.id} key={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </label>
          <label className="min-w-52 flex-1">
            <span className="field-label">Building</span>
            <select
              className="field-select"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
              required
            >
              <option value="">Select building</option>
              {optionsQuery.data?.buildings.map((building) => (
                <option value={building.id} key={building.id}>
                  {building.code} - {building.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="button-primary"
            disabled={!hasOptions || createMutation.isPending}
          >
            <Plus className="size-4" /> Assign
          </button>
        </div>
        {!optionsQuery.isLoading && !hasOptions && (
          <div className="inline-alert mt-4 border-amber-200 bg-amber-50 text-amber-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>No active building and staff combination is available.</span>
          </div>
        )}
      </form>

      <div className="table-shell overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>Staff member</th>
              <th>Building</th>
              <th>Assigned by</th>
              <th>Assigned</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={assignmentsQuery.isLoading}
              empty={!assignmentsQuery.data?.records.length}
              columns={5}
              emptyLabel="No staff-building assignments"
            />
            {assignmentsQuery.data?.records.map((assignment) => (
              <tr key={assignment.id}>
                <td>
                  <p className="font-medium text-slate-900">{assignment.staffUser.name}</p>
                  <p className="text-xs text-slate-500">{assignment.staffUser.email}</p>
                </td>
                <td>
                  <p className="font-medium text-slate-800">{assignment.building.code}</p>
                  <p className="text-xs text-slate-500">{assignment.building.name}</p>
                </td>
                <td className="text-xs text-slate-500">{assignment.assignedBy?.name || "Bootstrap"}</td>
                <td className="text-xs text-slate-500">
                  {new Date(assignment.assignedAt).toLocaleDateString()}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="icon-button ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setRemoving(assignment)}
                    aria-label={`Remove ${assignment.staffUser.name} from ${assignment.building.name}`}
                    title="Remove assignment"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar pagination={assignmentsQuery.data?.pagination} onPage={setPage} />
      </div>

      {(assignmentsQuery.isError || optionsQuery.isError) && (
        <div className="inline-alert border-red-200 bg-red-50 text-red-700">
          {errorMessage(assignmentsQuery.error || optionsQuery.error)}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove building assignment?"
        description={
          removing
            ? `${removing.staffUser.name} will no longer manage ${removing.building.name}.`
            : ""
        }
        confirmLabel="Remove"
        destructive
        busy={deleteMutation.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && deleteMutation.mutate(removing.id)}
      />
    </div>
  )
}
