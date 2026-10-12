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
    bookingActivityApprovals: {
        where: { isActive: true },
        select: {
            id: true,
            reviewerLabel: true,
            activityType: { select: { id: true, name: true, isActive: true } },
        },
        orderBy: { assignedAt: "asc" },
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

const activityApproverSelect = {
    id: true,
    reviewerLabel: true,
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
}

const activityTypeSelect = {
    id: true,
    name: true,
    normalizedName: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    approvers: {
        select: activityApproverSelect,
        orderBy: [{ isActive: "desc" }, { assignedAt: "asc" }, { id: "asc" }],
    },
    _count: { select: { requests: true } },
}

function normalizeActivityName(name) {
    return name.trim().replace(/\s+/g, " ").toLocaleLowerCase()
}

function effectiveApproverWhere(activityTypeId, excludeId) {
    return {
        activityTypeId,
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        user: { isActive: true, role: { in: ["FACULTY", "STAFF"] } },
    }
}

async function lockActivityType(tx, activityTypeId) {
    await tx.$queryRawUnsafe(
        'SELECT "id" FROM "BookingActivityType" WHERE "id" = $1 FOR UPDATE',
        activityTypeId
    )
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
                bookingActivityApprovals: {
                    where: { isActive: true },
                    select: { id: true },
                    take: 1,
                },
                bookingApprovals: {
                    where: { status: "PENDING" },
                    select: { id: true, reviewerKind: true },
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
            user.bookingActivityApprovals.length > 0 &&
            (!nextIsActive || !["FACULTY", "STAFF"].includes(nextRole))
        ) {
            throw new ApiError(
                409,
                "Deactivate this user's activity approval assignments before changing the account",
                { code: "USER_IS_ACTIVITY_APPROVER" }
            )
        }

        const hasPendingFacultyTask = user.bookingApprovals.some(
            (approval) => approval.reviewerKind === "FACULTY"
        )
        const pendingRoleInvalid = hasPendingFacultyTask
            ? nextRole !== "FACULTY"
            : !["FACULTY", "STAFF"].includes(nextRole)
        if (
            user.bookingApprovals.length > 0 &&
            (!nextIsActive || pendingRoleInvalid)
        ) {
            throw new ApiError(
                409,
                "This user still has pending booking decisions",
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

export function listBookingActivityTypes() {
    return prisma.bookingActivityType.findMany({
        select: activityTypeSelect,
        orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
    })
}

export async function getBookingApproverOptions() {
    return prisma.user.findMany({
        where: {
            role: { in: ["FACULTY", "STAFF"] },
            isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
    })
}

export async function createBookingActivityType({ name }) {
    const normalizedName = normalizeActivityName(name)
    const existing = await prisma.bookingActivityType.findUnique({
        where: { normalizedName },
        select: { id: true },
    })
    if (existing) {
        throw new ApiError(
            409,
            "An activity type with this name already exists",
            {
                code: "ACTIVITY_TYPE_EXISTS",
            }
        )
    }
    return prisma.bookingActivityType.create({
        data: { name: name.trim().replace(/\s+/g, " "), normalizedName },
        select: activityTypeSelect,
    })
}

export async function updateBookingActivityType({ id, changes }) {
    return prisma.$transaction(async (tx) => {
        await lockActivityType(tx, id)
        const existing = await tx.bookingActivityType.findUnique({
            where: { id },
            select: { id: true, isActive: true },
        })
        if (!existing) {
            throw new ApiError(404, "Activity type was not found", {
                code: "ACTIVITY_TYPE_NOT_FOUND",
            })
        }
        if (changes.isActive === true && !existing.isActive) {
            const activeApprovers = await tx.bookingActivityApprover.count({
                where: effectiveApproverWhere(id),
            })
            if (!activeApprovers) {
                throw new ApiError(
                    409,
                    "Add at least one active faculty or staff approver before activating this activity type",
                    { code: "ACTIVITY_TYPE_HAS_NO_APPROVERS" }
                )
            }
        }
        const normalizedName = changes.name
            ? normalizeActivityName(changes.name)
            : undefined
        return tx.bookingActivityType.update({
            where: { id },
            data: {
                ...changes,
                ...(changes.name
                    ? {
                          name: changes.name.trim().replace(/\s+/g, " "),
                          normalizedName,
                      }
                    : {}),
            },
            select: activityTypeSelect,
        })
    })
}

export async function deleteBookingActivityType(id) {
    return prisma.$transaction(async (tx) => {
        await lockActivityType(tx, id)
        const activityType = await tx.bookingActivityType.findUnique({
            where: { id },
            select: {
                id: true,
                isActive: true,
                _count: { select: { requests: true } },
            },
        })
        if (!activityType) {
            throw new ApiError(404, "Activity type was not found", {
                code: "ACTIVITY_TYPE_NOT_FOUND",
            })
        }
        if (activityType.isActive) {
            throw new ApiError(
                409,
                "Deactivate this activity type before deleting it",
                {
                    code: "ACTIVITY_TYPE_ACTIVE",
                }
            )
        }
        if (activityType._count.requests > 0) {
            throw new ApiError(
                409,
                "This activity type has booking history and cannot be deleted",
                { code: "ACTIVITY_TYPE_IN_USE" }
            )
        }

        await tx.bookingActivityApprover.deleteMany({
            where: { activityTypeId: id },
        })
        await tx.bookingActivityType.delete({ where: { id } })
    })
}

export async function createBookingActivityApprover({
    activityTypeId,
    userId,
    reviewerLabel,
}) {
    return prisma.$transaction(async (tx) => {
        await lockActivityType(tx, activityTypeId)
        const [activityType, user] = await Promise.all([
            tx.bookingActivityType.findUnique({
                where: { id: activityTypeId },
                select: { id: true },
            }),
            tx.user.findFirst({
                where: {
                    id: userId,
                    isActive: true,
                    role: { in: ["FACULTY", "STAFF"] },
                },
                select: { id: true },
            }),
        ])
        if (!activityType) {
            throw new ApiError(404, "Activity type was not found", {
                code: "ACTIVITY_TYPE_NOT_FOUND",
            })
        }
        if (!user) {
            throw new ApiError(409, "Choose an active faculty or staff user", {
                code: "INVALID_ACTIVITY_APPROVER",
            })
        }
        return tx.bookingActivityApprover.upsert({
            where: { activityTypeId_userId: { activityTypeId, userId } },
            create: { activityTypeId, userId, reviewerLabel },
            update: {
                reviewerLabel,
                isActive: true,
                deactivatedAt: null,
            },
            select: activityApproverSelect,
        })
    })
}

export async function updateBookingActivityApprover({
    activityTypeId,
    id,
    changes,
}) {
    return prisma.$transaction(async (tx) => {
        await lockActivityType(tx, activityTypeId)
        const existing = await tx.bookingActivityApprover.findFirst({
            where: { id, activityTypeId },
            select: {
                id: true,
                activityTypeId: true,
                isActive: true,
                user: { select: { isActive: true, role: true } },
                activityType: { select: { isActive: true } },
            },
        })
        if (!existing) {
            throw new ApiError(
                404,
                "Activity approver assignment was not found",
                {
                    code: "ACTIVITY_APPROVER_NOT_FOUND",
                }
            )
        }
        if (
            changes.isActive === true &&
            (!existing.user.isActive ||
                !["FACULTY", "STAFF"].includes(existing.user.role))
        ) {
            throw new ApiError(
                409,
                "The faculty or staff account must be active",
                {
                    code: "INVALID_ACTIVITY_APPROVER",
                }
            )
        }
        if (
            changes.isActive === false &&
            existing.isActive &&
            existing.activityType.isActive
        ) {
            const remaining = await tx.bookingActivityApprover.count({
                where: effectiveApproverWhere(activityTypeId, id),
            })
            if (!remaining) {
                throw new ApiError(
                    409,
                    "An active activity type must keep at least one active approver",
                    { code: "ACTIVITY_TYPE_REQUIRES_APPROVER" }
                )
            }
        }
        return tx.bookingActivityApprover.update({
            where: { id },
            data: {
                ...changes,
                ...(changes.isActive === undefined
                    ? {}
                    : { deactivatedAt: changes.isActive ? null : new Date() }),
            },
            select: activityApproverSelect,
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
