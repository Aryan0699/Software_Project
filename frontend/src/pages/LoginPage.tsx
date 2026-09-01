import { CircleAlert, Loader2, LockKeyhole } from "lucide-react"
import { useCallback, useState } from "react"
import type { FormEvent } from "react"
import { Navigate } from "react-router-dom"
import heroImage from "../assets/hero.png"
import { useAuth } from "../auth/useAuth"
import { GoogleSignInButton } from "../components/GoogleSignInButton"
import { PasswordRequirements } from "../components/PasswordRequirements"
import { errorMessage } from "../lib/api"
import { PASSWORD_MIN_LENGTH, passwordIssues } from "../lib/password"

type Mode = "login" | "register"

export function LoginPage() {
  const { user, loading: sessionLoading, login, register, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setSubmitting(true)
      setError(null)
      try {
        await loginWithGoogle(credential)
      } catch (caught) {
        setError(errorMessage(caught))
      } finally {
        setSubmitting(false)
      }
    },
    [loginWithGoogle],
  )

  const handleGoogleError = useCallback((message: string) => setError(message), [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === "register") {
      const issues = passwordIssues(password)
      if (issues.length > 0) {
        setError(issues.join(". "))
        return
      }
    }
    setSubmitting(true)
    setError(null)
    try {
      if (mode === "login") await login(email.trim(), password)
      else await register(name.trim(), email.trim(), password)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Loader2 className="size-6 animate-spin text-brand-600" aria-label="Loading session" />
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden min-h-[38rem] overflow-hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="relative z-10">
            <div className="mb-8 flex size-11 items-center justify-center rounded-md bg-white/10">
              <LockKeyhole className="size-5" />
            </div>
            <h1 className="max-w-sm text-3xl font-semibold leading-tight">
              Unified Room Allocation System
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Secure access to room schedules, institutional configuration, and booking operations.
            </p>
          </div>
          <img
            src={heroImage}
            alt="Layered room allocation illustration"
            className="absolute bottom-14 right-[-2rem] w-72 opacity-70"
          />
          <p className="relative z-10 text-xs text-slate-400">URAS institutional workspace</p>
        </section>

        <section className="flex min-h-[38rem] items-center px-5 py-10 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <p className="text-xl font-semibold text-slate-950">URAS</p>
              <p className="mt-1 text-sm text-slate-500">Unified Room Allocation System</p>
            </div>

            <h2 className="text-2xl font-semibold text-slate-950">
              {mode === "login" ? "Sign in" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">Use an identity approved by your institution.</p>

            <div
              className="mt-6 grid grid-cols-2 rounded-md bg-slate-100 p-1"
              aria-label="Account action"
            >
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item)
                    setError(null)
                  }}
                  className={`min-h-9 rounded px-3 text-sm font-medium transition-colors ${
                    mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {item === "login" ? "Sign in" : "Register"}
                </button>
              ))}
            </div>

            {error && (
              <div className="inline-alert mt-5 border-red-200 bg-red-50 text-red-700" role="alert">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={submit}>
              {mode === "register" && (
                <label className="block">
                  <span className="field-label">Full name</span>
                  <input
                    className="field-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </label>
              )}
              <label className="block">
                <span className="field-label">Institutional email</span>
                <input
                  className="field-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block">
                <span className="field-label">Password</span>
                <input
                  className="field-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={mode === "register" ? PASSWORD_MIN_LENGTH : 1}
                  maxLength={72}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                {mode === "register" ? <PasswordRequirements password={password} /> : null}
              </label>
              <button type="submit" className="button-primary w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onError={handleGoogleError}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
