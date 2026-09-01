import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Search } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { useAuth } from "../../auth/useAuth"
import { FormDialog } from "../../components/FormDialog"
import { useToast } from "../../components/toastContext"
import { facilitiesApi, type Room, type RoomStatus } from "../../lib/api"
import { operationalErrorDetails, operationalErrorMessage } from "../../lib/operationalError"
import { PaginationBar, TableState } from "../access/shared"
import { ActiveBadge } from "./shared"

type RoomDraft = {
  buildingId: string
  roomTypeId: string
  roomNumber: string
  displayName: string
  capacity: string
  isAccessible: boolean
  features: string
  notes: string
}

const emptyDraft: RoomDraft = {
  buildingId: "",
  roomTypeId: "",
  roomNumber: "",
  displayName: "",
  capacity: "",
  isAccessible: true,
  features: "",
  notes: "",
}

function draftFor(room: Room): RoomDraft {
  return {
    buildingId: room.buildingId,
    roomTypeId: room.roomTypeId || "",
    roomNumber: room.roomNumber,
    displayName: room.displayName || "",
    capacity: room.capacity === null ? "" : String(room.capacity),
    isAccessible: room.isAccessible,
    features: room.features.join(", "),
    notes: room.notes || "",
  }
}

export function RoomsPanel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const isAdmin = user?.role === "ADMIN"
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [buildingId, setBuildingId] = useState("")
  const [status, setStatus] = useState<"ALL" | RoomStatus>("ALL")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Room | "NEW" | null>(null)
  const [draft, setDraft] = useState<RoomDraft>(emptyDraft)
  const [statusTarget, setStatusTarget] = useState<Room | null>(null)
  const [statusReason, setStatusReason] = useState("")
  const [statusErrors, setStatusErrors] = useState<string[]>([])

  const optionsQuery = useQuery({
    queryKey: ["facility-options", user?.role],
    queryFn: async () => {
      const [buildings, roomTypes] = await Promise.all([
        facilitiesApi.listBuildings({ pageSize: 100 }),
        facilitiesApi.listRoomTypes({ pageSize: 100, isActive: true }),
      ])
      return {
        buildings: buildings.records,
        roomTypes: roomTypes.records,
      }
    },
  })

  const query = useQuery({
    queryKey: ["rooms", appliedSearch, buildingId, status, page, user?.role],
    queryFn: () =>
      facilitiesApi.listRooms({
        page,
        pageSize: 25,
        search: appliedSearch || undefined,
        buildingId: buildingId || undefined,
        status: isAdmin && status !== "ALL" ? status : undefined,
      }),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["rooms"] })
    await queryClient.invalidateQueries({ queryKey: ["buildings"] })
    await queryClient.invalidateQueries({ queryKey: ["facility-options"] })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        buildingId: draft.buildingId,
        roomTypeId: draft.roomTypeId || null,
        roomNumber: draft.roomNumber,
        displayName: draft.displayName || null,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        isAccessible: draft.isAccessible,
        features: draft.features
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
        notes: draft.notes || null,
      }
      return editing === "NEW"
        ? facilitiesApi.createRoom(data)
        : facilitiesApi.updateRoom((editing as Room).id, data)
    },
    onSuccess: async () => {
      showToast("success", editing === "NEW" ? "Room created" : "Room updated")
      setEditing(null)
      await invalidate()
    },
    onError: (error) => showToast("error", operationalErrorMessage(error)),
  })

  const statusMutation = useMutation({
    mutationFn: (room: Room) =>
      facilitiesApi.updateRoom(room.id, {
        status: room.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        ...(room.status === "ACTIVE" ? { statusReason } : {}),
      }),
    onSuccess: async (_, room) => {
      showToast("success", `Room ${room.status === "ACTIVE" ? "deactivated" : "activated"}`)
      setStatusTarget(null)
      setStatusReason("")
      setStatusErrors([])
      await invalidate()
    },
    onError: (error) => {
      setStatusErrors(operationalErrorDetails(error))
      showToast("error", operationalErrorMessage(error))
    },
  })

  const openEditor = (room?: Room) => {
    setEditing(room || "NEW")
    setDraft(room ? draftFor(room) : emptyDraft)
  }

  const submit = (event: FormEvent) => {
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
        <label className="min-w-52 flex-1">
          <span className="field-label">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
            <input
              className="field-input pl-9"
              placeholder="Room code, name, or building"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </label>
        <label className="min-w-48">
          <span className="field-label">Building</span>
          <select
            className="field-select"
            value={buildingId}
            onChange={(event) => {
              setBuildingId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All buildings</option>
            {optionsQuery.data?.buildings.map((building) => (
              <option value={building.id} key={building.id}>
                {building.code} - {building.name}
              </option>
            ))}
          </select>
        </label>
        {isAdmin ? (
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
        ) : null}
        <button type="submit" className="button-secondary">Apply</button>
        {isAdmin ? (
          <button type="button" className="button-primary" onClick={() => openEditor()}>
            <Plus className="size-4" /> Add room
          </button>
        ) : null}
      </form>

      <div className="table-shell overflow-x-auto">
        <table className="data-table min-w-[980px]">
          <thead>
            <tr>
              <th>Room</th>
              <th>Building</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Features</th>
              <th>Accessibility</th>
              <th>Status</th>
              {isAdmin ? <th className="text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={query.isLoading}
              empty={!query.data?.records.length}
              columns={isAdmin ? 8 : 7}
              emptyLabel="No rooms found"
            />
            {query.data?.records.map((room) => (
              <tr key={room.id}>
                <td>
                  <p className="font-medium text-slate-900">{room.fullCode}</p>
                  <p className="max-w-48 truncate text-xs text-slate-500">
                    {room.displayName || room.roomNumber}
                  </p>
                </td>
                <td>{room.building.name}</td>
                <td>{room.roomType?.name || "Unspecified"}</td>
                <td>{room.capacity ?? "Unknown"}</td>
                <td>
                  <p className="max-w-52 truncate text-xs text-slate-600">
                    {room.features.length ? room.features.join(", ") : "None recorded"}
                  </p>
                </td>
                <td>{room.isAccessible ? "Accessible" : "Standard access"}</td>
                <td>
                  <ActiveBadge active={room.status === "ACTIVE"} />
                  {room.statusReason ? (
                    <p className="mt-1 max-w-48 text-xs text-slate-500">{room.statusReason}</p>
                  ) : null}
                </td>
                {isAdmin ? (
                  <td>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="icon-button border border-slate-200"
                        onClick={() => openEditor(room)}
                        aria-label={`Edit ${room.fullCode}`}
                        title="Edit room"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={room.status === "ACTIVE" ? "button-secondary min-h-9" : "button-primary min-h-9"}
                        onClick={() => {
                          setStatusTarget(room)
                          setStatusReason("")
                          setStatusErrors([])
                        }}
                      >
                        {room.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
      </div>

      {(query.isError || optionsQuery.isError) ? (
        <div className="inline-alert border-red-200 bg-red-50 text-red-700">
          {operationalErrorMessage(query.error || optionsQuery.error)}
        </div>
      ) : null}

      <FormDialog
        open={Boolean(editing)}
        title={editing === "NEW" ? "Add room" : "Edit room"}
        description="The full room code is generated from the building code and room number."
        onClose={() => setEditing(null)}
      >
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Building</span>
              <select
                className="field-select"
                value={draft.buildingId}
                onChange={(event) => setDraft({ ...draft, buildingId: event.target.value })}
                required
              >
                <option value="">Select building</option>
                {optionsQuery.data?.buildings
                  .filter((building) => building.isActive)
                  .map((building) => (
                    <option value={building.id} key={building.id}>{building.code} - {building.name}</option>
                  ))}
              </select>
            </label>
            <label>
              <span className="field-label">Room number</span>
              <input
                className="field-input uppercase"
                value={draft.roomNumber}
                onChange={(event) => setDraft({ ...draft, roomNumber: event.target.value })}
                maxLength={40}
                required
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Display name</span>
              <input
                className="field-input"
                value={draft.displayName}
                onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                maxLength={120}
              />
            </label>
            <label>
              <span className="field-label">Room type</span>
              <select
                className="field-select"
                value={draft.roomTypeId}
                onChange={(event) => setDraft({ ...draft, roomTypeId: event.target.value })}
              >
                <option value="">Unspecified</option>
                {optionsQuery.data?.roomTypes.map((roomType) => (
                  <option value={roomType.id} key={roomType.id}>{roomType.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Capacity</span>
              <input
                className="field-input"
                type="number"
                min={1}
                max={100000}
                value={draft.capacity}
                onChange={(event) => setDraft({ ...draft, capacity: event.target.value })}
              />
            </label>
            <label className="flex min-h-10 items-center gap-2 self-end rounded-md border border-slate-300 px-3">
              <input
                type="checkbox"
                checked={draft.isAccessible}
                onChange={(event) => setDraft({ ...draft, isAccessible: event.target.checked })}
              />
              <span className="text-sm text-slate-700">Accessible room</span>
            </label>
          </div>
          <label className="block">
            <span className="field-label">Features</span>
            <input
              className="field-input"
              placeholder="Projector, microphone, smart board"
              value={draft.features}
              onChange={(event) => setDraft({ ...draft, features: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="field-label">Notes</span>
            <textarea
              className="field-input min-h-24 py-2"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              maxLength={2000}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="button-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="button-primary" disabled={saveMutation.isPending}>Save room</button>
          </div>
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(statusTarget)}
        title={`${statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"} room`}
        description={
          statusTarget?.status === "ACTIVE"
            ? "Deactivation is rejected if any future class, approved booking, or active restriction remains."
            : "The room will become eligible for allocation when its building is active."
        }
        onClose={() => {
          setStatusTarget(null)
          setStatusErrors([])
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (statusTarget) statusMutation.mutate(statusTarget)
          }}
        >
          {statusTarget?.status === "ACTIVE" ? (
            <label className="block">
              <span className="field-label">Reason</span>
              <textarea
                className="field-input min-h-24 py-2"
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                maxLength={500}
                required
              />
            </label>
          ) : null}
          {statusErrors.length ? (
            <div className="inline-alert border-red-200 bg-red-50 text-red-700">
              <div>
                <p className="font-medium">Blocking commitments</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {statusErrors.map((line) => <li key={line}>{line}</li>)}
                </ul>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setStatusTarget(null)
                setStatusErrors([])
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={statusTarget?.status === "ACTIVE" ? "button-danger" : "button-primary"}
              disabled={statusMutation.isPending}
            >
              {statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          </div>
        </form>
      </FormDialog>
    </div>
  )
}
