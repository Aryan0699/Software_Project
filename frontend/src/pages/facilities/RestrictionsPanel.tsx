import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ban, Plus } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { useToast } from "../../components/toastContext"
import {
  facilitiesApi,
  type RestrictionStatus,
  type RoomRestriction,
} from "../../lib/api"
import { operationalErrorDetails, operationalErrorMessage } from "../../lib/operationalError"
import { dateOnly, minuteToTime, timeToMinute } from "../../lib/time"
import { PaginationBar, TableState } from "../access/shared"

function todayInputValue() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function RestrictionsPanel() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [roomId, setRoomId] = useState("")
  const [restrictionDate, setRestrictionDate] = useState(todayInputValue())
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [reason, setReason] = useState("")
  const [buildingFilter, setBuildingFilter] = useState("")
  const [status, setStatus] = useState<"ALL" | RestrictionStatus>("ACTIVE")
  const [page, setPage] = useState(1)
  const [cancelling, setCancelling] = useState<RoomRestriction | null>(null)
  const [creationErrors, setCreationErrors] = useState<string[]>([])

  const optionsQuery = useQuery({
    queryKey: ["restriction-options"],
    queryFn: async () => {
      const [buildings, rooms] = await Promise.all([
        facilitiesApi.listBuildings({ pageSize: 100 }),
        facilitiesApi.listRooms({ pageSize: 100, status: "ACTIVE" }),
      ])
      return { buildings: buildings.records, rooms: rooms.records }
    },
  })

  const query = useQuery({
    queryKey: ["restrictions", buildingFilter, status, page],
    queryFn: () =>
      facilitiesApi.listRestrictions({
        page,
        pageSize: 25,
        buildingId: buildingFilter || undefined,
        status: status === "ALL" ? undefined : status,
      }),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["restrictions"] })
    await queryClient.invalidateQueries({ queryKey: ["rooms"] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      facilitiesApi.createRestriction({
        roomId,
        restrictionDate,
        startMinute: timeToMinute(startTime),
        endMinute: timeToMinute(endTime),
        reason,
      }),
    onSuccess: async () => {
      setRoomId("")
      setReason("")
      setCreationErrors([])
      showToast("success", "Room restriction created")
      await invalidate()
    },
    onError: (error) => {
      setCreationErrors(operationalErrorDetails(error))
      showToast("error", operationalErrorMessage(error))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => facilitiesApi.cancelRestriction(id),
    onSuccess: async () => {
      setCancelling(null)
      showToast("success", "Room restriction cancelled")
      await invalidate()
    },
    onError: (error) => showToast("error", operationalErrorMessage(error)),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (timeToMinute(startTime) >= timeToMinute(endTime)) {
      showToast("error", "End time must be after start time")
      return
    }
    createMutation.mutate()
  }

  const activeRooms = optionsQuery.data?.rooms.filter(
    (room) => room.status === "ACTIVE" && room.building.isActive,
  )

  return (
    <div className="space-y-5">
      <form className="border-y border-slate-200 bg-white p-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_0.65fr_0.65fr_1.4fr_auto] xl:items-end">
          <label>
            <span className="field-label">Room</span>
            <select className="field-select" value={roomId} onChange={(event) => setRoomId(event.target.value)} required>
              <option value="">Select room</option>
              {activeRooms?.map((room) => (
                <option value={room.id} key={room.id}>{room.fullCode} - {room.building.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Date</span>
            <input
              className="field-input"
              type="date"
              min={todayInputValue()}
              value={restrictionDate}
              onChange={(event) => setRestrictionDate(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="field-label">Starts</span>
            <input className="field-input" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </label>
          <label>
            <span className="field-label">Ends</span>
            <input className="field-input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </label>
          <label>
            <span className="field-label">Reason</span>
            <input
              className="field-input"
              placeholder="Maintenance or operational closure"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={3}
              maxLength={500}
              required
            />
          </label>
          <button type="submit" className="button-primary" disabled={createMutation.isPending || !activeRooms?.length}>
            <Plus className="size-4" /> Add
          </button>
        </div>
      </form>

      {creationErrors.length ? (
        <div className="inline-alert border-red-200 bg-red-50 text-red-700">
          <div>
            <p className="font-medium">This restriction cannot be created</p>
            <ul className="mt-1 space-y-1 text-xs">
              {creationErrors.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-52">
          <span className="field-label">Building</span>
          <select
            className="field-select"
            value={buildingFilter}
            onChange={(event) => {
              setBuildingFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All managed buildings</option>
            {optionsQuery.data?.buildings.map((building) => (
              <option value={building.id} key={building.id}>{building.code} - {building.name}</option>
            ))}
          </select>
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
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="table-shell overflow-x-auto">
        <table className="data-table min-w-[900px]">
          <thead>
            <tr>
              <th>Room</th>
              <th>Date</th>
              <th>Time</th>
              <th>Reason</th>
              <th>Created by</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={query.isLoading}
              empty={!query.data?.records.length}
              columns={7}
              emptyLabel="No room restrictions found"
            />
            {query.data?.records.map((restriction) => (
              <tr key={restriction.id}>
                <td>
                  <p className="font-medium text-slate-900">{restriction.room.fullCode}</p>
                  <p className="text-xs text-slate-500">{restriction.room.building.name}</p>
                </td>
                <td>{dateOnly(restriction.restrictionDate)}</td>
                <td>{minuteToTime(restriction.startMinute)} - {minuteToTime(restriction.endMinute)}</td>
                <td><p className="max-w-64 text-sm text-slate-700">{restriction.reason}</p></td>
                <td>{restriction.createdBy?.name || "System"}</td>
                <td>
                  <span
                    className={`status-badge ${
                      restriction.status === "ACTIVE"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {restriction.status === "ACTIVE" ? "Active" : "Cancelled"}
                  </span>
                </td>
                <td className="text-right">
                  {restriction.status === "ACTIVE" ? (
                    <button
                      type="button"
                      className="icon-button ml-auto text-red-600 hover:bg-red-50"
                      onClick={() => setCancelling(restriction)}
                      aria-label={`Cancel restriction for ${restriction.room.fullCode}`}
                      title="Cancel restriction"
                    >
                      <Ban className="size-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Closed</span>
                  )}
                </td>
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

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel room restriction?"
        description="The room will immediately become available to later allocation checks for this interval. The cancelled restriction remains in history."
        confirmLabel="Cancel restriction"
        destructive
        busy={cancelMutation.isPending}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancelMutation.mutate(cancelling.id)}
      />
    </div>
  )
}
