import { useQuery } from "@tanstack/react-query"
import { KeyRound, Loader2, UserRound } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { useAuth } from "../auth/useAuth"
import { PasswordRequirements } from "../components/PasswordRequirements"
import { useToast } from "../components/toastContext"
import { authApi, errorMessage, facilitiesApi } from "../lib/api"
import { PASSWORD_MIN_LENGTH, passwordIssues } from "../lib/password"

export function AccountPage() {
  const { user, refresh } = useAuth()
  const { showToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [name, setName] = useState(user?.name || "")
  const [departmentId, setDepartmentId] = useState(
    user?.studentProfile?.departmentId || user?.facultyProfile?.departmentId || "",
  )
  const [rollNumber, setRollNumber] = useState(user?.studentProfile?.rollNumber || "")
  const [batchYear, setBatchYear] = useState(
    user?.studentProfile?.batchYear ? String(user.studentProfile.batchYear) : "",
  )
  const [designation, setDesignation] = useState(
    user?.facultyProfile?.designation || user?.staffProfile?.designation || "",
  )

  const departmentsQuery = useQuery({
    queryKey: ["departments", "active"],
    queryFn: () => facilitiesApi.listDepartments({ pageSize: 100, isActive: true }),
    enabled: user?.role === "STUDENT" || user?.role === "FACULTY",
  })

  if (!user) return null

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault()
    setProfileSaving(true)
    try {
      await authApi.updateProfile({
        name: name.trim(),
        ...(user.role === "STUDENT"
          ? {
              departmentId: departmentId || null,
              rollNumber: rollNumber.trim() || null,
              batchYear: batchYear ? Number(batchYear) : null,
            }
          : {}),
        ...(user.role === "FACULTY"
          ? { departmentId: departmentId || null, designation: designation.trim() || null }
          : {}),
        ...(user.role === "STAFF" ? { designation: designation.trim() || null } : {}),
      })
      await refresh()
      showToast("success", "Profile updated")
    } catch (error) {
      showToast("error", errorMessage(error))
    } finally {
      setProfileSaving(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const issues = passwordIssues(newPassword)
    if (issues.length > 0) {
      showToast("error", issues.join(". "))
      return
    }
    if (newPassword !== confirmPassword) {
      showToast("error", "The new passwords do not match")
      return
    }

    setSaving(true)
    try {
      await authApi.setPassword(currentPassword || undefined, newPassword)
      await refresh()
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      showToast("success", "Password updated. Other sessions were signed out.")
    } catch (error) {
      showToast("error", errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Account</h1>
        <p className="page-subtitle">Profile and sign-in security.</p>
      </header>

      <section className="border-y border-slate-200 bg-white">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
          {[
            ["Name", user.name],
            ["Email", user.email],
            ["Role", user.role.toLowerCase()],
            ["Status", user.isActive ? "Active" : "Inactive"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-5 py-4">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-medium capitalize text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-brand-600" />
          <h2 className="text-base font-semibold text-slate-900">Profile details</h2>
        </div>
        <form onSubmit={submitProfile} className="mt-4 space-y-4">
          <label className="block">
            <span className="field-label">Full name</span>
            <input
              className="field-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          {(user.role === "STUDENT" || user.role === "FACULTY") ? (
            <label className="block">
              <span className="field-label">Department</span>
              <select
                className="field-select"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">Not specified</option>
                {departmentsQuery.data?.records.map((department) => (
                  <option value={department.id} key={department.id}>
                    {department.code} - {department.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {user.role === "STUDENT" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">Roll number</span>
                <input
                  className="field-input uppercase"
                  value={rollNumber}
                  onChange={(event) => setRollNumber(event.target.value)}
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
                  value={batchYear}
                  onChange={(event) => setBatchYear(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          {(user.role === "FACULTY" || user.role === "STAFF") ? (
            <label className="block">
              <span className="field-label">Designation</span>
              <input
                className="field-input"
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                maxLength={120}
              />
            </label>
          ) : null}
          <button type="submit" className="button-primary" disabled={profileSaving}>
            {profileSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save profile
          </button>
        </form>
      </section>

      <section className="max-w-xl">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-brand-600" />
          <h2 className="text-base font-semibold text-slate-900">Password</h2>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block">
            <span className="field-label">Current password</span>
            <input
              className="field-input"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              maxLength={72}
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="field-label">New password</span>
            <input
              className="field-input"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={72}
              autoComplete="new-password"
              required
            />
            <PasswordRequirements password={newPassword} />
          </label>
          <label className="block">
            <span className="field-label">Confirm new password</span>
            <input
              className="field-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={72}
              autoComplete="new-password"
              required
            />
          </label>
          <button type="submit" className="button-primary" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Update password
          </button>
        </form>
      </section>
    </div>
  )
}
