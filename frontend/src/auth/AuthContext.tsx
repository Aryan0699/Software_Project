import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { ApiClientError, authApi, type CurrentUser } from "../lib/api"
import { AuthContext, type AuthContextValue } from "./authContext"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const result = await authApi.me()
    setUser(result.user)
  }, [])

  useEffect(() => {
    authApi
      .me()
      .then((result) => setUser(result.user))
      .catch((error: unknown) => {
        if (!(error instanceof ApiClientError) || error.status !== 401) {
          console.error("Session restoration failed", error)
        }
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        await authApi.login(email, password)
        await refresh()
      },
      async register(name, email, password) {
        await authApi.register(name, email, password)
        await refresh()
      },
      async loginWithGoogle(credential) {
        await authApi.google(credential)
        await refresh()
      },
      refresh,
      async logout() {
        try {
          await authApi.logout()
        } finally {
          setUser(null)
        }
      },
    }),
    [loading, refresh, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
