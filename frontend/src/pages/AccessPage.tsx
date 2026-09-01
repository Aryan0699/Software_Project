import { Building2, Landmark, ShieldCheck, Users } from "lucide-react"
import { useState } from "react"
import { ApprovedUsersPanel } from "./access/ApprovedUsersPanel"
import { DeanOfficesPanel } from "./access/DeanOfficesPanel"
import { StaffAssignmentsPanel } from "./access/StaffAssignmentsPanel"
import { UsersPanel } from "./access/UsersPanel"

type Tab = "users" | "approved" | "deans" | "staff"

const tabs = [
  { id: "users" as const, label: "Users", icon: Users },
  { id: "approved" as const, label: "Registration access", icon: ShieldCheck },
  { id: "deans" as const, label: "Dean offices", icon: Landmark },
  { id: "staff" as const, label: "Building staff", icon: Building2 },
]

export function AccessPage() {
  const [tab, setTab] = useState<Tab>("users")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Access administration</h1>
        <p className="page-subtitle">Institutional identities, roles, and operational responsibility.</p>
      </header>

      <div className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Access administration views">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
                tab === id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel">
        {tab === "users" && <UsersPanel />}
        {tab === "approved" && <ApprovedUsersPanel />}
        {tab === "deans" && <DeanOfficesPanel />}
        {tab === "staff" && <StaffAssignmentsPanel />}
      </div>
    </div>
  )
}
