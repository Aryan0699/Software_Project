import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { useAuth } from "./auth/useAuth"
import { AppShell } from "./components/AppShell"
import { AccessPage } from "./pages/AccessPage"
import { AccountPage } from "./pages/AccountPage"
import { AcademicCalendarPage } from "./pages/AcademicCalendarPage"
import { ApprovalsPage } from "./pages/ApprovalsPage"
import { AvailabilityPage } from "./pages/AvailabilityPage"
import { BookingCreatePage } from "./pages/BookingCreatePage"
import { BookingDetailPage } from "./pages/BookingDetailPage"
import { BookingsPage } from "./pages/BookingsPage"
import { DashboardPage } from "./pages/DashboardPage"
import { FacilitiesPage } from "./pages/FacilitiesPage"
import { LoginPage } from "./pages/LoginPage"
import { NotificationsPage } from "./pages/NotificationsPage"
import { SlotSystemsPage } from "./pages/SlotSystemsPage"
import { TimetableImportsPage } from "./pages/TimetableImportsPage"

function ProtectedRoutes() {
    const { user, loading } = useAuth()
    if (loading) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-canvas">
                <Loader2
                    className="size-6 animate-spin text-brand-600"
                    aria-label="Loading session"
                />
            </div>
        )
    }
    return user ? <Outlet /> : <Navigate to="/login" replace />
}

function AdminOnly({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    return user?.role === "ADMIN" ? children : <Navigate to="/" replace />
}

function FacilitiesOnly({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    return user?.role === "ADMIN" || user?.role === "STAFF" ? (
        children
    ) : (
        <Navigate to="/" replace />
    )
}

function RequesterOnly({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    return user?.role === "STUDENT" || user?.role === "FACULTY" ? (
        children
    ) : (
        <Navigate to="/" replace />
    )
}

function FacultyOnly({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    return user?.role === "FACULTY" ? children : <Navigate to="/" replace />
}

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoutes />}>
                <Route element={<AppShell />}>
                    <Route index element={<DashboardPage />} />
                    <Route
                        path="availability"
                        element={
                            <RequesterOnly>
                                <AvailabilityPage />
                            </RequesterOnly>
                        }
                    />
                    <Route path="bookings" element={<BookingsPage />} />
                    <Route
                        path="bookings/new"
                        element={
                            <RequesterOnly>
                                <BookingCreatePage />
                            </RequesterOnly>
                        }
                    />
                    <Route
                        path="bookings/:id"
                        element={<BookingDetailPage />}
                    />
                    <Route
                        path="approvals"
                        element={
                            <FacultyOnly>
                                <ApprovalsPage />
                            </FacultyOnly>
                        }
                    />
                    <Route path="account" element={<AccountPage />} />
                    <Route
                        path="notifications"
                        element={<NotificationsPage />}
                    />
                    <Route
                        path="facilities"
                        element={
                            <FacilitiesOnly>
                                <FacilitiesPage />
                            </FacilitiesOnly>
                        }
                    />
                    <Route
                        path="admin/access"
                        element={
                            <AdminOnly>
                                <AccessPage />
                            </AdminOnly>
                        }
                    />
                    <Route
                        path="admin/calendar"
                        element={
                            <AdminOnly>
                                <AcademicCalendarPage />
                            </AdminOnly>
                        }
                    />
                    <Route
                        path="admin/timetables"
                        element={
                            <AdminOnly>
                                <SlotSystemsPage />
                            </AdminOnly>
                        }
                    />
                    <Route
                        path="admin/timetables/imports"
                        element={
                            <AdminOnly>
                                <TimetableImportsPage />
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
