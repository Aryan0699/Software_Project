import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { useToast } from "../../components/toastContext"
import { adminAccessApi, errorMessage, type AdminUser, type Role } from "../../lib/api"
import { roleLabels, roles } from "./constants"
import { PaginationBar, RoleBadge, StatusBadge, TableState } from "./shared"

type Filters = { search: string; role: "ALL" | Role; status: "ALL" | "ACTIVE" | "INACTIVE" }
type PendingChange = {
  user: AdminUser
  changes: { role?: Role; isActive?: boolean }
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
}

const initialFilters: Filters = { search: "", role: "ALL", status: "ALL" }

export function UsersPanel() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [form, setForm] = useState<Filters>(initialFilters)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<PendingChange | null>(null)

  const query = useQuery({
    queryKey: ["admin-users", filters, page],
    queryFn: () =>
      adminAccessApi.listUsers({
        page,
        pageSize: 25,
        search: filters.search || undefined,
        role: filters.role === "ALL" ? undefined : filters.role,
        isActive:
          filters.status === "ALL" ? undefined : filters.status === "ACTIVE",
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ user, changes }: PendingChange) =>
      adminAccessApi.updateUserAccess(user.id, changes),
    onSuccess: async () => {
      showToast("success", "User access updated")
      setPending(null)
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      await queryClient.invalidateQueries({ queryKey: ["dean-offices"] })
      await queryClient.invalidateQueries({ queryKey: ["assignment-options"] })
    },
    onError: (error) => showToast("error", errorMessage(error)),
  })

  const apply = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setFilters(form)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={apply} className="flex flex-wrap items-end gap-3 border-y border-slate-200 bg-white p-4">
        <label className="min-w-56 flex-1">
          <span className="field-label">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
            <input
              className="field-input pl-9"
              placeholder="Name or email"
              value={form.search}
              onChange={(event) => setForm({ ...form, search: event.target.value })}
            />
          </div>
        </label>
        <label className="w-44">
          <span className="field-label">Role</span>
          <select
            className="field-select"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Filters["role"] })}
          >
            <option value="ALL">All roles</option>
            {roles.map((role) => (
              <option value={role} key={role}>{roleLabels[role]}</option>
            ))}
          </select>
        </label>
        <label className="w-40">
          <span className="field-label">Status</span>
          <select
            className="field-select"
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as Filters["status"] })
            }
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <button type="submit" className="button-primary">Apply</button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            setForm(initialFilters)
            setFilters(initialFilters)
            setPage(1)
          }}
        >
          Reset
        </button>
      </form>

      <div className="table-shell overflow-x-auto">
        <table className="data-table min-w-[880px]">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Responsibilities</th>
              <th>Last sign-in</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={query.isLoading}
              empty={!query.data?.records.length}
              columns={6}
              emptyLabel="No users found"
            />
            {query.data?.records.map((user) => (
              <tr key={user.id}>
                <td>
                  <p className="font-medium text-slate-900">{user.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                </td>
                <td><RoleBadge role={user.role} /></td>
                <td>
                  <p className="text-xs text-slate-600">
                    {user.deanOfficeHeld?.office ||
                      (user.staffBuildings.length
                        ? `${user.staffBuildings.length} building${user.staffBuildings.length === 1 ? "" : "s"}`
                        : "None")}
                  </p>
                </td>
                <td className="text-xs text-slate-500">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                </td>
                <td><StatusBadge active={user.isActive} /></td>
                <td>
                  <div className="flex justify-end gap-2">
                    <select
                      className="field-select min-h-9 w-36"
                      value={user.role}
                      aria-label={`Role for ${user.name}`}
                      onChange={(event) => {
                        const role = event.target.value as Role
                        setPending({
                          user,
                          changes: { role },
                          title: "Change user role?",
                          description: `${user.name} will become ${roleLabels[role].toLowerCase()}. Their active sessions will be revoked.`,
                          confirmLabel: "Change role",
                        })
                      }}
                    >
                      {roles.map((role) => (
                        <option value={role} key={role}>{roleLabels[role]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={user.isActive ? "button-secondary min-h-9" : "button-primary min-h-9"}
                      onClick={() =>
                        setPending({
                          user,
                          changes: { isActive: !user.isActive },
                          title: `${user.isActive ? "Deactivate" : "Activate"} user?`,
                          description: user.isActive
                            ? `${user.name} will immediately lose access and all sessions will be revoked.`
                            : `${user.name} will be allowed to sign in again.`,
                          confirmLabel: user.isActive ? "Deactivate" : "Activate",
                          destructive: user.isActive,
                        })
                      }
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
      </div>

      {query.isError && (
        <div className="inline-alert border-red-200 bg-red-50 text-red-700">
          {errorMessage(query.error)}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title || "Confirm change"}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel || "Confirm"}
        destructive={pending?.destructive}
        busy={updateMutation.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && updateMutation.mutate(pending)}
      />
    </div>
  )
}
