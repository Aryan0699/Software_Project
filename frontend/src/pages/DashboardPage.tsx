import { ArrowRight, Building2, CalendarSearch, ShieldCheck, UserRound } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth/useAuth"

const roleLabels = {
  ADMIN: "Administrator",
  STAFF: "Building staff",
  FACULTY: "Faculty",
  STUDENT: "Student",
}

export function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-brand-600">
          {roleLabels[user.role]}
          {user.deanOfficeHeld ? ` · ${user.deanOfficeHeld.office}` : ""}
        </p>
        <h1 className="page-title mt-1">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="page-subtitle">Your URAS workspace is ready.</p>
      </header>

      <section className="border-y border-slate-200 bg-white">
        <div className="grid divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="p-5">
            <UserRound className="size-5 text-brand-600" />
            <p className="mt-4 text-xs font-medium text-slate-500">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user.email}</p>
          </div>
          <div className="p-5">
            <ShieldCheck className="size-5 text-emerald-600" />
            <p className="mt-4 text-xs font-medium text-slate-500">Account status</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Active</p>
          </div>
          <div className="p-5">
            <Building2 className="size-5 text-amber-600" />
            <p className="mt-4 text-xs font-medium text-slate-500">Building scope</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {user.staffBuildings?.length
                ? `${user.staffBuildings.length} assigned`
                : user.role === "ADMIN"
                  ? "Institution-wide"
                  : "None assigned"}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          <Link
            to="/availability"
            className="flex min-h-16 items-center justify-between gap-4 px-4 hover:bg-slate-50 sm:px-5"
          >
            <div className="flex items-start gap-3">
              <CalendarSearch className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">Find an available room</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Search by date, time, capacity, and room requirements
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-slate-400" />
          </Link>
          {user.role === "ADMIN" && (
            <Link
              to="/admin/access"
              className="flex min-h-16 items-center justify-between gap-4 px-4 hover:bg-slate-50 sm:px-5"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">Access administration</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Users, approved identities, dean offices, and building staff
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-slate-400" />
            </Link>
          )}
          <Link
            to="/account"
            className="flex min-h-16 items-center justify-between gap-4 px-4 hover:bg-slate-50 sm:px-5"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">Account settings</p>
              <p className="mt-0.5 text-xs text-slate-500">Review your profile and password</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-slate-400" />
          </Link>
        </div>
      </section>
    </div>
  )
}
