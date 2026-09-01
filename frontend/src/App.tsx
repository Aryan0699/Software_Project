import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { useAuth } from "./auth/useAuth"
import { AppShell } from "./components/AppShell"
import { AccessPage } from "./pages/AccessPage"
import { AccountPage } from "./pages/AccountPage"
import { DashboardPage } from "./pages/DashboardPage"
import { LoginPage } from "./pages/LoginPage"

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Loader2 className="size-6 animate-spin text-brand-600" aria-label="Loading session" />
      </div>
    )
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === "ADMIN" ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route
            path="admin/access"
            element={
              <AdminOnly>
                <AccessPage />
              </AdminOnly>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
