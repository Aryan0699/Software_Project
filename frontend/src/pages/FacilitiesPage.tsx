import { Building2, DoorOpen, ListTree, Wrench } from "lucide-react"
import { useState } from "react"
import { useAuth } from "../auth/useAuth"
import { BuildingsPanel } from "./facilities/BuildingsPanel"
import { ReferenceDataPanel } from "./facilities/ReferenceDataPanel"
import { RestrictionsPanel } from "./facilities/RestrictionsPanel"
import { RoomsPanel } from "./facilities/RoomsPanel"

type Tab = "buildings" | "rooms" | "restrictions" | "reference"

export function FacilitiesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>(user?.role === "STAFF" ? "rooms" : "buildings")
  const tabs = [
    ...(user?.role === "ADMIN"
      ? [{ id: "buildings" as const, label: "Buildings", icon: Building2 }]
      : []),
    { id: "rooms" as const, label: "Rooms", icon: DoorOpen },
    { id: "restrictions" as const, label: "Restrictions", icon: Wrench },
    ...(user?.role === "ADMIN"
      ? [{ id: "reference" as const, label: "Reference data", icon: ListTree }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Facilities</h1>
        <p className="page-subtitle">
          {user?.role === "ADMIN"
            ? "Room inventory, operational state, and temporary restrictions."
            : "Rooms and temporary restrictions for your assigned buildings."}
        </p>
      </header>

      <div className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Facilities views">
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
        {tab === "buildings" && user?.role === "ADMIN" ? <BuildingsPanel /> : null}
        {tab === "rooms" ? <RoomsPanel /> : null}
        {tab === "restrictions" ? <RestrictionsPanel /> : null}
        {tab === "reference" && user?.role === "ADMIN" ? <ReferenceDataPanel /> : null}
      </div>
    </div>
  )
}
