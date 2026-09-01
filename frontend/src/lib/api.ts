export type Role = "STUDENT" | "FACULTY" | "STAFF" | "ADMIN"
export type DeanOffice = "DOSA" | "ADOSA" | "DOAA"

export type BasicUser = {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  avatarUrl?: string | null
}

export type CurrentUser = BasicUser & {
  lastLoginAt?: string | null
  createdAt?: string
  studentProfile?: Record<string, unknown> | null
  facultyProfile?: Record<string, unknown> | null
  staffProfile?: Record<string, unknown> | null
  deanOfficeHeld?: { office: DeanOffice; assignedAt: string } | null
  staffBuildings?: Array<{
    assignedAt: string
    building: { id: string; code: string; name: string; isActive: boolean }
  }>
}

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type ApprovedIdentity = {
  id: string
  email: string
  initialRole: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
  invitedBy: Pick<BasicUser, "id" | "name" | "email"> | null
  registeredUser: BasicUser | null
}

export type AdminUser = CurrentUser & {
  updatedAt: string
  staffBuildings: Array<{
    id: string
    assignedAt: string
    building: { id: string; code: string; name: string; isActive: boolean }
  }>
}

export type DeanOfficeEntry = {
  office: DeanOffice
  assignment: {
    id: string
    office: DeanOffice
    assignedAt: string
    updatedAt: string
    user: BasicUser
    assignedBy: Pick<BasicUser, "id" | "name" | "email"> | null
  } | null
}

export type StaffAssignment = {
  id: string
  assignedAt: string
  building: { id: string; code: string; name: string; isActive: boolean }
  staffUser: BasicUser
  assignedBy: Pick<BasicUser, "id" | "name" | "email"> | null
}

export type AssignmentOptions = {
  buildings: Array<{ id: string; code: string; name: string }>
  staffUsers: Array<Pick<BasicUser, "id" | "name" | "email">>
}

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

type ApiErrorEnvelope = {
  success: false
  error?: { code?: string; message?: string; details?: unknown }
  requestId?: string
}

export class ApiClientError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
    this.details = details
  }
}

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(
  /\/$/,
  "",
)

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  })

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | ApiErrorEnvelope
    | null

  if (!response.ok) {
    const failure = payload as ApiErrorEnvelope | null
    throw new ApiClientError(
      response.status,
      failure?.error?.code || "REQUEST_FAILED",
      failure?.error?.message || "The request could not be completed",
      failure?.error?.details,
    )
  }

  return (payload as ApiEnvelope<T>).data
}

function queryString(values: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value))
  })
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ""
}

export const authApi = {
  login(email: string, password: string) {
    return request<{ user: BasicUser; expiresAt: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },
  register(name: string, email: string, password: string) {
    return request<{ user: BasicUser; expiresAt: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    })
  },
  google(credential: string) {
    return request<{ user: BasicUser; expiresAt: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    })
  },
  me() {
    return request<{ user: CurrentUser; sessionExpiresAt: string }>("/auth/me")
  },
  logout() {
    return request<null>("/auth/logout", { method: "POST" })
  },
  logoutAll() {
    return request<null>("/auth/logout-all", { method: "POST" })
  },
  setPassword(currentPassword: string | undefined, newPassword: string) {
    return request<{ expiresAt: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify({
        ...(currentPassword ? { currentPassword } : {}),
        newPassword,
      }),
    })
  },
}

export const adminAccessApi = {
  listApprovedUsers(values: {
    page?: number
    pageSize?: number
    search?: string
    role?: Role
    isActive?: boolean
  }) {
    return request<{ records: ApprovedIdentity[]; pagination: Pagination }>(
      `/admin/approved-users${queryString(values)}`,
    )
  },
  createApprovedUser(email: string, initialRole: Role) {
    return request<{ approvedUser: ApprovedIdentity }>("/admin/approved-users", {
      method: "POST",
      body: JSON.stringify({ email, initialRole }),
    })
  },
  updateApprovedUser(id: string, changes: { initialRole?: Role; isActive?: boolean }) {
    return request<{ approvedUser: ApprovedIdentity }>(`/admin/approved-users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    })
  },
  listUsers(values: {
    page?: number
    pageSize?: number
    search?: string
    role?: Role
    isActive?: boolean
  }) {
    return request<{ records: AdminUser[]; pagination: Pagination }>(
      `/admin/users${queryString(values)}`,
    )
  },
  updateUserAccess(id: string, changes: { role?: Role; isActive?: boolean }) {
    return request<{ user: AdminUser }>(`/admin/users/${id}/access`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    })
  },
  getDeanOffices() {
    return request<{ offices: DeanOfficeEntry[] }>("/admin/dean-offices")
  },
  assignDeanOffice(office: DeanOffice, userId: string) {
    return request<{ assignment: DeanOfficeEntry["assignment"] }>(
      `/admin/dean-offices/${office}`,
      { method: "PUT", body: JSON.stringify({ userId }) },
    )
  },
  listStaffAssignments(values: { page?: number; pageSize?: number } = {}) {
    return request<{ records: StaffAssignment[]; pagination: Pagination }>(
      `/admin/staff-building-assignments${queryString(values)}`,
    )
  },
  getStaffAssignmentOptions() {
    return request<AssignmentOptions>("/admin/staff-building-assignment-options")
  },
  createStaffAssignment(buildingId: string, staffUserId: string) {
    return request<{ assignment: StaffAssignment }>("/admin/staff-building-assignments", {
      method: "POST",
      body: JSON.stringify({ buildingId, staffUserId }),
    })
  },
  deleteStaffAssignment(id: string) {
    return request<null>(`/admin/staff-building-assignments/${id}`, { method: "DELETE" })
  },
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiClientError && Array.isArray(error.details)) {
    const messages = error.details
      .map((detail) =>
        typeof detail === "object" && detail !== null && "message" in detail
          ? String(detail.message)
          : null,
      )
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) return [...new Set(messages)].join(". ")
  }
  return error instanceof Error ? error.message : "The request could not be completed"
}
