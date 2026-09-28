import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import { pagination, pageOffset } from "../utils/pagination.js"

const DEAN_OFFICES = ["DOSA", "ADOSA", "DOAA"]

const approvalSelect = {
    id: true,
    email: true,
    initialRole: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    invitedBy: {
        select: { id: true, name: true, email: true },
    },
}

const userAccessSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    avatarUrl: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    studentProfile: true,
    facultyProfile: true,
    staffProfile: true,
    deanOfficeHeld: {
        select: { office: true, assignedAt: true },
    },
    staffBuildings: {
        select: {
            id: true,
            assignedAt: true,
            building: {
                select: { id: true, code: true, name: true, isActive: true },
            },
        },
        orderBy: { building: { code: "asc" } },
    },
}

const deanAssignmentSelect = {
    id: true,
    office: true,
    assignedAt: true,
    updatedAt: true,
    user: {
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
        },
    },
    assignedBy: {
        select: { id: true, name: true, email: true },
    },
}

const staffAssignmentSelect = {
    id: true,
    assignedAt: true,
    building: {
        select: { id: true, code: true, name: true, isActive: true },
    },
    staffUser: {
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
        },
    },
    assignedBy: {
        select: { id: true, name: true, email: true },
    },
}

export async function listApprovedUsers({
    page,
    pageSize,
    search,
    role,
    isActive,
}) {
    const where = {
        ...(search ? { email: { contains: search, mode: "insensitive" } } : {}),
        ...(role ? { initialRole: role } : {}),
        ...(isActive === undefined ? {} : { isActive }),
    }

    const [records, total] = await prisma.$transaction([
        prisma.approvedUser.findMany({
            where,
            select: approvalSelect,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.approvedUser.count({ where }),
    ])

    const registeredUsers = records.length
        ? await prisma.user.findMany({
              where: { email: { in: records.map((record) => record.email) } },
              select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                  isActive: true,
              },
          })
        : []
    const usersByEmail = new Map(
        registeredUsers.map((user) => [user.email, user])
    )

    return {
        records: records.map((record) => ({
            ...record,
            registeredUser: usersByEmail.get(record.email) || null,
        })),
        pagination: pagination(page, pageSize, total),
    }
}

export function createApprovedUser({ email, initialRole, actorUserId }) {
    return prisma.approvedUser.create({
        data: {
            email,
            initialRole,
            invitedByUserId: actorUserId,
        },
        select: approvalSelect,
    })
}

export async function updateApprovedUser({ id, changes }) {
    return prisma.$transaction(async (tx) => {
        const approval = await tx.approvedUser.findUnique({
            where: { id },
            select: { id: true, email: true, initialRole: true },
        })
        if (!approval) {
            throw new ApiError(404, "Approved identity was not found", {
                code: "APPROVED_USER_NOT_FOUND",
            })
        }

        if (
            changes.initialRole &&
            changes.initialRole !== approval.initialRole
        ) {
            const registeredUser = await tx.user.findUnique({
                where: { email: approval.email },
                select: { id: true },
            })
            if (registeredUser) {
                throw new ApiError(
                    409,
                    "This identity has already registered; update its role from user administration",
                    { code: "APPROVED_USER_ALREADY_REGISTERED" }
                )
            }
        }

        return tx.approvedUser.update({
            where: { id },
            data: changes,
            select: approvalSelect,
        })
    })
}

export async function listUsers({ page, pageSize, search, role, isActive }) {
    const where = {
        ...(search
            ? {
                  OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                  ],
              }
            : {}),
        ...(role ? { role } : {}),
        ...(isActive === undefined ? {} : { isActive }),
    }

    const [records, total] = await prisma.$transaction([
        prisma.user.findMany({
            where,
            select: userAccessSelect,
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.user.count({ where }),
    ])

    return { records, pagination: pagination(page, pageSize, total) }
}

async function synchronizeProfileForRole(tx, userId, role) {
    if (role === "STUDENT") {
        await tx.facultyProfile.deleteMany({ where: { userId } })
        await tx.staffProfile.deleteMany({ where: { userId } })
        await tx.studentProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        })
        return
    }

    if (role === "FACULTY") {
        await tx.studentProfile.deleteMany({ where: { userId } })
        await tx.staffProfile.deleteMany({ where: { userId } })
        await tx.facultyProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        })
        return
    }

    if (role === "STAFF") {
        await tx.studentProfile.deleteMany({ where: { userId } })
        await tx.facultyProfile.deleteMany({ where: { userId } })
        await tx.staffProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        })
        return
    }

    await tx.studentProfile.deleteMany({ where: { userId } })
    await tx.facultyProfile.deleteMany({ where: { userId } })
    await tx.staffProfile.deleteMany({ where: { userId } })
}

export async function updateUserAccess({ id, changes, actorUserId }) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id },
            select: {
                id: true,
                role: true,
                isActive: true,
                deanOfficeHeld: { select: { office: true } },
                _count: { select: { staffBuildings: true } },
            },
        })
        if (!user) {
            throw new ApiError(404, "User was not found", {
                code: "USER_NOT_FOUND",
            })
        }

        const nextRole = changes.role ?? user.role
        const nextIsActive = changes.isActive ?? user.isActive

        if (
            id === actorUserId &&
            (nextRole !== user.role || nextIsActive === false)
        ) {
            throw new ApiError(
                409,
                "You cannot remove your own administrator access or deactivate your own account",
                { code: "SELF_ACCESS_CHANGE_FORBIDDEN" }
            )
        }

        if (user.deanOfficeHeld && (!nextIsActive || nextRole !== "FACULTY")) {
            throw new ApiError(
                409,
                `Reassign the ${user.deanOfficeHeld.office} office before changing this user`,
                { code: "USER_HAS_DEAN_OFFICE" }
            )
        }

        if (
            user._count.staffBuildings > 0 &&
            (!nextIsActive || nextRole !== "STAFF")
        ) {
            throw new ApiError(
                409,
                "Remove this user's building assignments before changing the account",
                { code: "USER_HAS_BUILDING_ASSIGNMENTS" }
            )
        }

        const roleChanged = nextRole !== user.role
        const shouldRevokeSessions = roleChanged || nextIsActive === false

        if (roleChanged) {
            await synchronizeProfileForRole(tx, id, nextRole)
        }

        const updated = await tx.user.update({
            where: { id },
            data: changes,
            select: userAccessSelect,
        })

        if (shouldRevokeSessions) {
            await tx.authSession.updateMany({
                where: { userId: id, revokedAt: null },
                data: { revokedAt: new Date() },
            })
        }

        return updated
    })
}

export async function getDeanOffices() {
    const assignments = await prisma.deanOfficeAssignment.findMany({
        select: deanAssignmentSelect,
        orderBy: { office: "asc" },
    })
    const byOffice = new Map(
        assignments.map((assignment) => [assignment.office, assignment])
    )

    return DEAN_OFFICES.map((office) => ({
        office,
        assignment: byOffice.get(office) || null,
    }))
}

export async function assignDeanOffice({ office, userId, actorUserId }) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                isActive: true,
                deanOfficeHeld: { select: { office: true } },
            },
        })
        if (!user) {
            throw new ApiError(404, "User was not found", {
                code: "USER_NOT_FOUND",
            })
        }
        if (!user.isActive || user.role !== "FACULTY") {
            throw new ApiError(
                409,
                "A dean office can be assigned only to an active faculty user",
                { code: "INVALID_DEAN_ASSIGNEE" }
            )
        }
        if (user.deanOfficeHeld?.office === office) {
            return tx.deanOfficeAssignment.findUnique({
                where: { office },
                select: deanAssignmentSelect,
            })
        }
        if (user.deanOfficeHeld) {
            throw new ApiError(
                409,
                `This user already holds the ${user.deanOfficeHeld.office} office`,
                { code: "USER_ALREADY_HAS_DEAN_OFFICE" }
            )
        }

        return tx.deanOfficeAssignment.upsert({
            where: { office },
            update: {
                userId,
                assignedByUserId: actorUserId,
                assignedAt: new Date(),
            },
            create: {
                office,
                userId,
                assignedByUserId: actorUserId,
            },
            select: deanAssignmentSelect,
        })
    })
}

export async function listStaffAssignments({
    page,
    pageSize,
    buildingId,
    staffUserId,
}) {
    const where = {
        ...(buildingId ? { buildingId } : {}),
        ...(staffUserId ? { staffUserId } : {}),
    }
    const [records, total] = await prisma.$transaction([
        prisma.buildingStaffAssignment.findMany({
            where,
            select: staffAssignmentSelect,
            orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
            skip: pageOffset(page, pageSize),
            take: pageSize,
        }),
        prisma.buildingStaffAssignment.count({ where }),
    ])

    return { records, pagination: pagination(page, pageSize, total) }
}

export async function getStaffAssignmentOptions() {
    const [buildings, staffUsers] = await prisma.$transaction([
        prisma.building.findMany({
            where: { isActive: true },
            select: { id: true, code: true, name: true },
            orderBy: [{ code: "asc" }, { id: "asc" }],
        }),
        prisma.user.findMany({
            where: { role: "STAFF", isActive: true },
            select: { id: true, name: true, email: true },
            orderBy: [{ name: "asc" }, { id: "asc" }],
        }),
    ])

    return { buildings, staffUsers }
}

export async function createStaffAssignment({
    buildingId,
    staffUserId,
    actorUserId,
}) {
    return prisma.$transaction(async (tx) => {
        const [building, staffUser] = await Promise.all([
            tx.building.findUnique({
                where: { id: buildingId },
                select: { id: true, isActive: true },
            }),
            tx.user.findUnique({
                where: { id: staffUserId },
                select: { id: true, role: true, isActive: true },
            }),
        ])

        if (!building) {
            throw new ApiError(404, "Building was not found", {
                code: "BUILDING_NOT_FOUND",
            })
        }
        if (!building.isActive) {
            throw new ApiError(
                409,
                "Staff cannot be assigned to an inactive building",
                { code: "BUILDING_INACTIVE" }
            )
        }
        if (!staffUser) {
            throw new ApiError(404, "User was not found", {
                code: "USER_NOT_FOUND",
            })
        }
        if (!staffUser.isActive || staffUser.role !== "STAFF") {
            throw new ApiError(
                409,
                "A building can be assigned only to an active staff user",
                { code: "INVALID_BUILDING_STAFF" }
            )
        }

        return tx.buildingStaffAssignment.create({
            data: { buildingId, staffUserId, assignedByUserId: actorUserId },
            select: staffAssignmentSelect,
        })
    })
}

export async function deleteStaffAssignment(id) {
    const assignment = await prisma.buildingStaffAssignment.findUnique({
        where: { id },
        select: { id: true },
    })
    if (!assignment) {
        throw new ApiError(404, "Staff-building assignment was not found", {
            code: "STAFF_ASSIGNMENT_NOT_FOUND",
        })
    }

    await prisma.buildingStaffAssignment.delete({ where: { id } })
}
