import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Search } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { FormDialog } from "../../components/FormDialog"
import { useToast } from "../../components/toastContext"
import { adminAccessApi, errorMessage, facilitiesApi, type AdminUser, type Role } from "../../lib/api"
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

type ProfileDraft = {
  name: string
  departmentId: string
  rollNumber: string
  batchYear: string
  designation: string
}

export function UsersPanel() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [form, setForm] = useState<Filters>(initialFilters)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null)
  const [profile, setProfile] = useState<ProfileDraft>({
    name: "",
    departmentId: "",
    rollNumber: "",
    batchYear: "",
    designation: "",
  })

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
  const departmentsQuery = useQuery({
    queryKey: ["departments", "active"],
    queryFn: () => facilitiesApi.listDepartments({ pageSize: 100, isActive: true }),
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

  const profileMutation = useMutation({
    mutationFn: (user: AdminUser) =>
      adminAccessApi.updateUserProfile(user.id, {
        name: profile.name.trim(),
        ...(user.role === "STUDENT"
          ? {
              departmentId: profile.departmentId || null,
              rollNumber: profile.rollNumber.trim() || null,
              batchYear: profile.batchYear ? Number(profile.batchYear) : null,
            }
          : {}),
        ...(user.role === "FACULTY"
          ? {
              departmentId: profile.departmentId || null,
              designation: profile.designation.trim() || null,
            }
          : {}),
        ...(user.role === "STAFF"
          ? { designation: profile.designation.trim() || null }
          : {}),
      }),
    onSuccess: async () => {
      setProfileUser(null)
      showToast("success", "User profile updated")
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      await queryClient.invalidateQueries({ queryKey: ["dean-offices"] })
      await queryClient.invalidateQueries({ queryKey: ["assignment-options"] })
    },
    onError: (error) => showToast("error", errorMessage(error)),
  })

  const openProfile = (user: AdminUser) => {
    setProfileUser(user)
    setProfile({
      name: user.name,
      departmentId:
        user.studentProfile?.departmentId || user.facultyProfile?.departmentId || "",
      rollNumber: user.studentProfile?.rollNumber || "",
      batchYear: user.studentProfile?.batchYear ? String(user.studentProfile.batchYear) : "",
      designation:
        user.facultyProfile?.designation || user.staffProfile?.designation || "",
    })
  }

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
                    {user.institutionalApprover?.title ||
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
                    <button
                      type="button"
                      className="icon-button border border-slate-200"
                      onClick={() => openProfile(user)}
                      aria-label={`Edit profile for ${user.name}`}
                      title="Edit profile"
                    >
                      <Pencil className="size-4" />
                    </button>
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

      <FormDialog
        open={Boolean(profileUser)}
        title="Edit user profile"
        description={profileUser ? `${profileUser.name} · ${roleLabels[profileUser.role]}` : undefined}
        onClose={() => setProfileUser(null)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (profileUser) profileMutation.mutate(profileUser)
          }}
        >
          <label className="block">
            <span className="field-label">Full name</span>
            <input
              className="field-input"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          {(profileUser?.role === "STUDENT" || profileUser?.role === "FACULTY") ? (
            <label className="block">
              <span className="field-label">Department</span>
              <select
                className="field-select"
                value={profile.departmentId}
                onChange={(event) => setProfile({ ...profile, departmentId: event.target.value })}
              >
                <option value="">Not specified</option>
                {departmentsQuery.data?.records.map((department) => (
                  <option value={department.id} key={department.id}>{department.code} - {department.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {profileUser?.role === "STUDENT" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">Roll number</span>
                <input
                  className="field-input uppercase"
                  value={profile.rollNumber}
                  onChange={(event) => setProfile({ ...profile, rollNumber: event.target.value })}
                  maxLength={50}
                />
              </label>
              <label>
                <span className="field-label">Batch year</span>
                <input
                  className="field-input"
                  type="number"
                  min={1900}
                  max={2200}
                  value={profile.batchYear}
                  onChange={(event) => setProfile({ ...profile, batchYear: event.target.value })}
                />
              </label>
            </div>
          ) : null}
          {(profileUser?.role === "FACULTY" || profileUser?.role === "STAFF") ? (
            <label className="block">
              <span className="field-label">Designation</span>
              <input
                className="field-input"
                value={profile.designation}
                onChange={(event) => setProfile({ ...profile, designation: event.target.value })}
                maxLength={120}
              />
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" className="button-secondary" onClick={() => setProfileUser(null)}>Cancel</button>
            <button type="submit" className="button-primary" disabled={profileMutation.isPending}>Save profile</button>
          </div>
        </form>
      </FormDialog>
    </div>
  )
}
