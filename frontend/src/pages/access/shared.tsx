import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { Pagination, Role } from "../../lib/api"
import { roleLabels } from "./constants"

const roleClasses: Record<Role, string> = {
  ADMIN: "border-red-200 bg-red-50 text-red-700",
  STAFF: "border-sky-200 bg-sky-50 text-sky-700",
  FACULTY: "border-amber-200 bg-amber-50 text-amber-700",
  STUDENT: "border-slate-200 bg-slate-50 text-slate-600",
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`status-badge ${roleClasses[role]}`}>{roleLabels[role]}</span>
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`status-badge ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  )
}

export function TableState({
  loading,
  empty,
  columns,
  emptyLabel,
}: {
  loading: boolean
  empty: boolean
  columns: number
  emptyLabel: string
}) {
  if (!loading && !empty) return null
  return (
    <tr>
      <td colSpan={columns} className="h-32 text-center">
        {loading ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Loading
          </span>
        ) : (
          <span className="text-sm text-slate-500">{emptyLabel}</span>
        )}
      </td>
    </tr>
  )
}

export function PaginationBar({
  pagination,
  onPage,
}: {
  pagination?: Pagination
  onPage: (page: number) => void
}) {
  const page = pagination?.page || 1
  const totalPages = Math.max(1, pagination?.totalPages || 1)
  const total = pagination?.total || 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">{total} total</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="icon-button border border-slate-200"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-16 text-center text-xs font-medium text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="icon-button border border-slate-200"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
