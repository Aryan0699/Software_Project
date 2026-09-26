import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"

const profileUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    avatarUrl: true,
    lastLoginAt: true,
    createdAt: true,
    studentProfile: { include: { department: true } },
    facultyProfile: { include: { department: true } },
    staffProfile: true,
    deanOfficeHeld: { select: { office: true, assignedAt: true } },
    staffBuildings: {
        select: {
            assignedAt: true,
            building: {
                select: { id: true, code: true, name: true, isActive: true },
            },
        },
    },
}

function cleanNullable(value) {
    if (value === undefined) return undefined
    if (value === null || value.trim() === "") return null
    return value.trim()
}

async function validateDepartment(tx, departmentId) {
    if (departmentId === undefined || departmentId === null) return
    const department = await tx.department.findUnique({
        where: { id: departmentId },
        select: { id: true, isActive: true },
    })
    if (!department) {
        throw new ApiError(404, "Department was not found", {
            code: "DEPARTMENT_NOT_FOUND",
        })
    }
    if (!department.isActive) {
        throw new ApiError(409, "An inactive department cannot be assigned", {
            code: "DEPARTMENT_INACTIVE",
        })
    }
}

function assertAllowedFields(role, changes) {
    const roleFields = {
        STUDENT: new Set(["name", "departmentId", "rollNumber", "batchYear"]),
        FACULTY: new Set(["name", "departmentId", "designation"]),
        STAFF: new Set(["name", "designation"]),
        ADMIN: new Set(["name"]),
    }
    const invalid = Object.keys(changes).filter(
        (field) => !roleFields[role].has(field)
    )
    if (invalid.length) {
        throw new ApiError(
            400,
            `These profile fields do not apply to a ${role.toLowerCase()} account: ${invalid.join(", ")}`,
            { code: "PROFILE_FIELDS_NOT_APPLICABLE" }
        )
    }
}

export function updateProfile(userId, changes) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        })
        if (!user) {
            throw new ApiError(404, "User was not found", {
                code: "USER_NOT_FOUND",
            })
        }
        assertAllowedFields(user.role, changes)
        await validateDepartment(tx, changes.departmentId)

        if (changes.name !== undefined) {
            await tx.user.update({
                where: { id: userId },
                data: { name: changes.name },
            })
        }

        if (user.role === "STUDENT") {
            await tx.studentProfile.upsert({
                where: { userId },
                update: {
                    ...(changes.rollNumber !== undefined
                        ? {
                              rollNumber:
                                  cleanNullable(
                                      changes.rollNumber
                                  )?.toUpperCase() || null,
                          }
                        : {}),
                    ...(changes.batchYear !== undefined
                        ? { batchYear: changes.batchYear }
                        : {}),
                    ...(changes.departmentId !== undefined
                        ? { departmentId: changes.departmentId }
                        : {}),
                },
                create: {
                    userId,
                    rollNumber:
                        cleanNullable(changes.rollNumber)?.toUpperCase() ||
                        null,
                    batchYear: changes.batchYear,
                    departmentId: changes.departmentId,
                },
            })
        } else if (user.role === "FACULTY") {
            await tx.facultyProfile.upsert({
                where: { userId },
                update: {
                    ...(changes.designation !== undefined
                        ? { designation: cleanNullable(changes.designation) }
                        : {}),
                    ...(changes.departmentId !== undefined
                        ? { departmentId: changes.departmentId }
                        : {}),
                },
                create: {
                    userId,
                    designation: cleanNullable(changes.designation),
                    departmentId: changes.departmentId,
                },
            })
        } else if (user.role === "STAFF") {
            await tx.staffProfile.upsert({
                where: { userId },
                update: {
                    ...(changes.designation !== undefined
                        ? { designation: cleanNullable(changes.designation) }
                        : {}),
                },
                create: {
                    userId,
                    designation: cleanNullable(changes.designation),
                },
            })
        }

        return tx.user.findUnique({
            where: { id: userId },
            select: profileUserSelect,
        })
    })
}
