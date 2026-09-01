import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Search } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { useToast } from "../../components/toastContext"
import { adminAccessApi, errorMessage, type Role } from "../../lib/api"
import { roleLabels, roles } from "./constants"
import { PaginationBar, StatusBadge, TableState } from "./shared"

export function ApprovedUsersPanel() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("STUDENT")

  const query = useQuery({
    queryKey: ["approved-users", page, search],
    queryFn: () =>
      adminAccessApi.listApprovedUsers({ page, pageSize: 25, search: search || undefined }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["approved-users"] })

  const createMutation = useMutation({
    mutationFn: () => adminAccessApi.createApprovedUser(email.trim(), role),
    onSuccess: async () => {
      setEmail("")
      showToast("success", "Identity approved for registration")
      await invalidate()
    },
    onError: (error) => showToast("error", errorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { initialRole?: Role; isActive?: boolean } }) =>
      adminAccessApi.updateApprovedUser(id, changes),
    onSuccess: async () => {
      showToast("success", "Registration access updated")
      await invalidate()
    },
    onError: (error) => showToast("error", errorMessage(error)),
  })

  const create = (event: FormEvent) => {
    event.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="border-y border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1">
            <span className="field-label">Institutional email</span>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="w-44">
            <span className="field-label">Initial role</span>
            <select
              className="field-select"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {roles.map((item) => (
                <option value={item} key={item}>{roleLabels[item]}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="button-primary" disabled={createMutation.isPending}>
            <Plus className="size-4" /> Approve identity
          </button>
        </div>
      </form>

      <form
        className="flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setSearch(searchInput.trim())
        }}
      >
        <label className="max-w-md flex-1">
          <span className="field-label">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
            <input
              className="field-input pl-9"
              placeholder="Email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </label>
        <button className="button-secondary" type="submit">Search</button>
      </form>

      <div className="table-shell overflow-x-auto">
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>Email</th>
              <th>Initial role</th>
              <th>Account</th>
              <th>Approved by</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={query.isLoading}
              empty={!query.data?.records.length}
              columns={6}
              emptyLabel="No approved identities found"
            />
            {query.data?.records.map((identity) => (
              <tr key={identity.id}>
                <td className="font-medium text-slate-900">{identity.email}</td>
                <td>
                  <select
                    className="field-select min-h-9 w-40"
                    value={identity.initialRole}
                    disabled={Boolean(identity.registeredUser) || updateMutation.isPending}
                    aria-label={`Initial role for ${identity.email}`}
                    onChange={(event) =>
                      updateMutation.mutate({
                        id: identity.id,
                        changes: { initialRole: event.target.value as Role },
                      })
                    }
                  >
                    {roles.map((item) => (
                      <option value={item} key={item}>{roleLabels[item]}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {identity.registeredUser ? (
                    <div>
                      <p className="text-sm font-medium text-slate-800">{identity.registeredUser.name}</p>
                      <p className="text-xs text-slate-500">{roleLabels[identity.registeredUser.role]}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Not registered</span>
                  )}
                </td>
                <td className="text-xs text-slate-500">{identity.invitedBy?.name || "Bootstrap"}</td>
                <td><StatusBadge active={identity.isActive} /></td>
                <td className="text-right">
                  <button
                    type="button"
                    className={identity.isActive ? "button-secondary min-h-9" : "button-primary min-h-9"}
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: identity.id,
                        changes: { isActive: !identity.isActive },
                      })
                    }
                  >
                    {identity.isActive ? "Suspend" : "Restore"}
                  </button>
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
    </div>
  )
}
