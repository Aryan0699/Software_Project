import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { FormDialog } from "../../components/FormDialog"
import { useToast } from "../../components/toastContext"
import { facilitiesApi, type Department } from "../../lib/api"
import { operationalErrorMessage } from "../../lib/operationalError"
import { TableState } from "../access/shared"
import { ActiveBadge } from "./shared"

type ReferenceKind = "department" | "room-type"

function ReferenceSection({ kind }: { kind: ReferenceKind }) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<Department | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editName, setEditName] = useState("")
  const queryKey = kind === "department" ? "departments" : "room-types"
  const singular = kind === "department" ? "Department" : "Room type"

  const query = useQuery({
    queryKey: [queryKey, "all"],
    queryFn: () =>
      kind === "department"
        ? facilitiesApi.listDepartments({ pageSize: 100 })
        : facilitiesApi.listRoomTypes({ pageSize: 100 }),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: [queryKey] })
    await queryClient.invalidateQueries({ queryKey: ["facility-options"] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (kind === "department") await facilitiesApi.createDepartment(code, name)
      else await facilitiesApi.createRoomType(code, name)
    },
    onSuccess: async () => {
      setCode("")
      setName("")
      showToast("success", `${singular} created`)
      await invalidate()
    },
    onError: (error) => showToast("error", operationalErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      record,
      changes,
    }: {
      record: Department
      changes: Partial<Pick<Department, "code" | "name" | "isActive">>
    }) => {
      if (kind === "department") return facilitiesApi.updateDepartment(record.id, changes).then(() => undefined)
      return facilitiesApi.updateRoomType(record.id, changes).then(() => undefined)
    },
    onSuccess: async () => {
      setEditing(null)
      showToast("success", `${singular} updated`)
      await invalidate()
    },
    onError: (error) => showToast("error", operationalErrorMessage(error)),
  })

  const create = (event: FormEvent) => {
    event.preventDefault()
    createMutation.mutate()
  }

  const openEdit = (record: Department) => {
    setEditing(record)
    setEditCode(record.code)
    setEditName(record.name)
  }

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">
          {kind === "department" ? "Departments" : "Room types"}
        </h2>
        <span className="text-xs text-slate-500">{query.data?.pagination.total || 0} total</span>
      </div>

      <form className="mt-3 grid gap-2 border-y border-slate-200 bg-white p-3 sm:grid-cols-[8rem_1fr_auto]" onSubmit={create}>
        <label>
          <span className="sr-only">Code</span>
          <input
            className="field-input uppercase"
            placeholder="Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={32}
            required
          />
        </label>
        <label>
          <span className="sr-only">Name</span>
          <input
            className="field-input"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />
        </label>
        <button type="submit" className="button-primary" disabled={createMutation.isPending}>
          <Plus className="size-4" /> Add
        </button>
      </form>

      <div className="mt-3 table-shell overflow-x-auto">
        <table className="data-table min-w-[500px]">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={query.isLoading}
              empty={!query.data?.records.length}
              columns={4}
              emptyLabel={`No ${singular.toLowerCase()} records`}
            />
            {query.data?.records.map((record) => (
              <tr key={record.id}>
                <td className="font-medium text-slate-900">{record.code}</td>
                <td>{record.name}</td>
                <td><ActiveBadge active={record.isActive} /></td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => openEdit(record)}
                      aria-label={`Edit ${record.name}`}
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="button-quiet min-h-9 px-2"
                      onClick={() =>
                        updateMutation.mutate({ record, changes: { isActive: !record.isActive } })
                      }
                    >
                      {record.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {query.isError ? (
        <div className="inline-alert mt-3 border-red-200 bg-red-50 text-red-700">
          {operationalErrorMessage(query.error)}
        </div>
      ) : null}

      <FormDialog
        open={Boolean(editing)}
        title={`Edit ${singular.toLowerCase()}`}
        onClose={() => setEditing(null)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (editing) {
              updateMutation.mutate({ record: editing, changes: { code: editCode, name: editName } })
            }
          }}
        >
          <label className="block">
            <span className="field-label">Code</span>
            <input className="field-input uppercase" value={editCode} onChange={(event) => setEditCode(event.target.value)} required />
          </label>
          <label className="block">
            <span className="field-label">Name</span>
            <input className="field-input" value={editName} onChange={(event) => setEditName(event.target.value)} required />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="button-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="button-primary" disabled={updateMutation.isPending}>Save</button>
          </div>
        </form>
      </FormDialog>
    </section>
  )
}

export function ReferenceDataPanel() {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <ReferenceSection kind="department" />
      <ReferenceSection kind="room-type" />
    </div>
  )
}
