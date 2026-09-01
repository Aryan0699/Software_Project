import { KeyRound, Loader2 } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { useAuth } from "../auth/useAuth"
import { PasswordRequirements } from "../components/PasswordRequirements"
import { useToast } from "../components/toastContext"
import { authApi, errorMessage } from "../lib/api"
import { PASSWORD_MIN_LENGTH, passwordIssues } from "../lib/password"

export function AccountPage() {
  const { user, refresh } = useAuth()
  const { showToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  if (!user) return null

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
