export function ActiveBadge({ active }: { active: boolean }) {
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
