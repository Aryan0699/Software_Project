import type { Role } from "../../lib/api"

export const roles: Role[] = ["ADMIN", "STAFF", "FACULTY", "STUDENT"]

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  STAFF: "Staff",
  FACULTY: "Faculty",
  STUDENT: "Student",
}
