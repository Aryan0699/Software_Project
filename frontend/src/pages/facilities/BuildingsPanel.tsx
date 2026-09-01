import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Search } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { FormDialog } from "../../components/FormDialog"
import { useToast } from "../../components/toastContext"
import { facilitiesApi, type Building } from "../../lib/api"
import { operationalErrorDetails, operationalErrorMessage } from "../../lib/operationalError"
import { PaginationBar, TableState } from "../access/shared"
import { ActiveBadge } from "./shared"

type BuildingDraft = { code: string; name: string; location: string }

const emptyDraft: BuildingDraft = { code: "", name: "", location: "" }

export function BuildingsPanel() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Building | "NEW" | null>(null)
  const [draft, setDraft] = useState<BuildingDraft>(emptyDraft)
  const [statusTarget, setStatusTarget] = useState<Building | null>(null)
  const [statusErrors, setStatusErrors] = useState<string[]>([])

  const query = useQuery({
    queryKey: ["buildings", appliedSearch, status, page],
    queryFn: () =>
      facilitiesApi.listBuildings({
        page,
        pageSize: 25,
        search: appliedSearch || undefined,
        isActive: status === "ALL" ? undefined : status === "ACTIVE",
      }),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["buildings"] })
    await queryClient.invalidateQueries({ queryKey: ["facility-options"] })
    await queryClient.invalidateQueries({ queryKey: ["assignment-options"] })
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing === "NEW"
        ? facilitiesApi.createBuilding({ ...draft, location: draft.location || null })
        : facilitiesApi.updateBuilding((editing as Building).id, {
            code: draft.code,
            name: draft.name,
            location: draft.location || null,
          }),
    onSuccess: async () => {
      setEditing(null)
      showToast("success", editing === "NEW" ? "Building created" : "Building updated")
      await invalidate()
    },
    onError: (error) => showToast("error", operationalErrorMessage(error)),
  })

  const statusMutation = useMutation({
    mutationFn: (building: Building) =>
      facilitiesApi.updateBuilding(building.id, { isActive: !building.isActive }),
    onSuccess: async (_, building) => {
      setStatusTarget(null)
      setStatusErrors([])
      showToast("success", `Building ${building.isActive ? "deactivated" : "activated"}`)
      await invalidate()
    },
    onError: (error) => {
      setStatusErrors(operationalErrorDetails(error))
      showToast("error", operationalErrorMessage(error))
    },
  })

  const openEditor = (building?: Building) => {
    setEditing(building || "NEW")
    setDraft(
      building
        ? { code: building.code, name: building.name, location: building.location || "" }
        : emptyDraft,
    )
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-3 border-y border-slate-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setAppliedSearch(search.trim())
        }}
      >
        <label className="min-w-56 flex-1">
          <span className="field-label">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
            <input
              className="field-input pl-9"
              placeholder="Code, name, or location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </label>
        <label className="w-40">
          <span className="field-label">Status</span>
          <select
            className="field-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status)
              setPage(1)
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <button type="submit" className="button-secondary">Apply</button>
        <button type="button" className="button-primary" onClick={() => openEditor()}>
          <Plus className="size-4" /> Add building
        </button>
      </form>

      <div className="table-shell overflow-x-auto">
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>Building</th>
              <th>Location</th>
              <th>Rooms</th>
              <th>Staff</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={query.isLoading}
              empty={!query.data?.records.length}
              columns={6}
              emptyLabel="No buildings found"
            />
            {query.data?.records.map((building) => (
              <tr key={building.id}>
                <td>
                  <p className="font-medium text-slate-900">{building.code}</p>
                  <p className="text-xs text-slate-500">{building.name}</p>
                </td>
                <td>{building.location || "Not specified"}</td>
                <td>{building._count.rooms}</td>
                <td>{building._count.staffAssignments}</td>
                <td><ActiveBadge active={building.isActive} /></td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="icon-button border border-slate-200"
                      onClick={() => openEditor(building)}
                      aria-label={`Edit ${building.name}`}
                      title="Edit building"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={building.isActive ? "button-secondary min-h-9" : "button-primary min-h-9"}
                      onClick={() => {
                        setStatusTarget(building)
                        setStatusErrors([])
                      }}
                    >
                      {building.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
      </div>

      {query.isError ? (
        <div className="inline-alert border-red-200 bg-red-50 text-red-700">
          {operationalErrorMessage(query.error)}
        </div>
      ) : null}

      <FormDialog
        open={Boolean(editing)}
        title={editing === "NEW" ? "Add building" : "Edit building"}
        description="Building codes become fixed after the first room is created."
        onClose={() => setEditing(null)}
      >
        <form className="space-y-4" onSubmit={save}>
          <label className="block">
            <span className="field-label">Code</span>
            <input
              className="field-input uppercase"
              value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              maxLength={32}
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Name</span>
            <input
              className="field-input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              maxLength={120}
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Location</span>
            <input
              className="field-input"
              value={draft.location}
              onChange={(event) => setDraft({ ...draft, location: event.target.value })}
              maxLength={200}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="button-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={saveMutation.isPending}>
              Save building
            </button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={`${statusTarget?.isActive ? "Deactivate" : "Activate"} building?`}
        description={
          <div>
            <p>
              {statusTarget?.isActive
                ? "The change is allowed only when every room has no future classes, approved bookings, or active restrictions."
                : "The building and its active rooms will become available to operational workflows again."}
            </p>
            {statusErrors.length ? (
              <ul className="mt-3 space-y-1 border-t border-red-200 pt-3 text-xs text-red-700">
                {statusErrors.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : null}
          </div>
        }
        confirmLabel={statusTarget?.isActive ? "Deactivate" : "Activate"}
        destructive={statusTarget?.isActive}
        busy={statusMutation.isPending}
        onClose={() => {
          setStatusTarget(null)
          setStatusErrors([])
        }}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
      />
    </div>
  )
}
