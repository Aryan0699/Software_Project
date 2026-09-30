import { prisma } from "../db/index.js"
import ApiError from "../utils/ApiError.js"
import { pagination, pageOffset } from "../utils/pagination.js"

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
    institutionalApprover: {
        select: { id: true, title: true, isActive: true, assignedAt: true },
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

const institutionalApproverSelect = {
    id: true,
    title: true,
    isActive: true,
    assignedAt: true,
    deactivatedAt: true,
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
                institutionalApprover: {
                    select: { id: true, title: true, isActive: true },
                },
                bookingApprovals: {
                    where: { status: "PENDING" },
                    select: { id: true },
                    take: 1,
                },
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

        if (
            user.institutionalApprover?.isActive &&
            (!nextIsActive || nextRole !== "FACULTY")
        ) {
            throw new ApiError(
                409,
                "Deactivate this institutional approver membership before changing the account",
                { code: "USER_IS_INSTITUTIONAL_APPROVER" }
            )
        }

        if (
            user.bookingApprovals.length > 0 &&
            (!nextIsActive || nextRole !== "FACULTY")
        ) {
            throw new ApiError(
                409,
                "This faculty member still has pending booking decisions",
                { code: "USER_HAS_PENDING_APPROVALS" }
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

export function listInstitutionalApprovers() {
    return prisma.institutionalApprover.findMany({
        select: institutionalApproverSelect,
        orderBy: [{ isActive: "desc" }, { assignedAt: "asc" }, { id: "asc" }],
    })
}

export async function getInstitutionalApproverOptions() {
    return prisma.user.findMany({
        where: {
            role: "FACULTY",
            isActive: true,
            facultyProfile: { isNot: null },
        },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
    })
}

export async function createInstitutionalApprover({
    userId,
    title,
    actorUserId,
}) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findFirst({
            where: {
                id: userId,
                role: "FACULTY",
                isActive: true,
                facultyProfile: { isNot: null },
            },
            select: { id: true },
        })
        if (!user) {
            throw new ApiError(
                409,
                "Only an active faculty member can be an institutional approver",
                { code: "INVALID_INSTITUTIONAL_APPROVER" }
            )
        }
        const existing = await tx.institutionalApprover.findUnique({
            where: { userId },
            select: { id: true },
        })
        if (existing) {
            throw new ApiError(409, "This faculty member is already in the approver list", {
                code: "INSTITUTIONAL_APPROVER_EXISTS",
            })
        }
        const approver = await tx.institutionalApprover.create({
            data: { userId, title, assignedByUserId: actorUserId },
            select: institutionalApproverSelect,
        })
        await tx.administrativeAuditEvent.create({
            data: {
                actorUserId,
                action: "ASSIGN",
                entityType: "INSTITUTIONAL_APPROVER",
                entityId: approver.id,
                afterState: { userId, title, isActive: true },
                changedFields: ["userId", "title", "isActive"],
            },
        })
        return approver
    })
}

export async function updateInstitutionalApprover({ id, changes, actorUserId }) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.institutionalApprover.findUnique({
            where: { id },
            select: { id: true, userId: true, title: true, isActive: true, user: { select: { isActive: true, role: true } } },
        })
        if (!existing) {
            throw new ApiError(404, "Institutional approver was not found", {
                code: "INSTITUTIONAL_APPROVER_NOT_FOUND",
            })
        }
        if (changes.isActive === true && (!existing.user.isActive || existing.user.role !== "FACULTY")) {
            throw new ApiError(409, "The faculty account must be active before this membership can be activated", {
                code: "INVALID_INSTITUTIONAL_APPROVER",
            })
        }
        const approver = await tx.institutionalApprover.update({
            where: { id },
            data: {
                ...changes,
                ...(changes.isActive === undefined
                    ? {}
                    : { deactivatedAt: changes.isActive ? null : new Date() }),
            },
            select: institutionalApproverSelect,
        })
        await tx.administrativeAuditEvent.create({
            data: {
                actorUserId,
                action:
                    changes.isActive === true
                        ? "ACTIVATE"
                        : changes.isActive === false
                          ? "DEACTIVATE"
                          : "UPDATE",
                entityType: "INSTITUTIONAL_APPROVER",
                entityId: id,
                beforeState: {
                    userId: existing.userId,
                    title: existing.title,
                    isActive: existing.isActive,
                },
                afterState: {
                    userId: approver.user.id,
                    title: approver.title,
                    isActive: approver.isActive,
                },
                changedFields: Object.keys(changes),
            },
        })
        return approver
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
