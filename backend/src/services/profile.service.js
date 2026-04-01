import { prisma } from "../db/index.js";
import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";

/**
 * Get the full profile for a user, including role-specific sub-profile.
 */
export const getMyProfile = async (userId) => {
    logger.info(`Fetching profile for user ${userId}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            studentProfile: {
                include: {
                    department: {
                        select: { id: true, code: true, name: true },
                    },
                },
            },
            facultyProfile: {
                include: {
                    department: {
                        select: { id: true, code: true, name: true },
                    },
                },
            },
            staffProfile: true,
        },
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.isActive) {
        throw new ApiError(403, "Account is deactivated");
    }

    // Return only the relevant sub-profile
    const { studentProfile, facultyProfile, staffProfile, ...baseUser } = user;

    let profile = null;
    if (user.role === "USER" && studentProfile) {
        profile = studentProfile;
    } else if (user.role === "FACULTY" && facultyProfile) {
        profile = facultyProfile;
    } else if (user.role === "STAFF" && staffProfile) {
        profile = staffProfile;
    }

    return {
        ...baseUser,
        profile,
        profileComplete: profile !== null,
    };
};

/**
 * Create or update student profile.
 */
export const updateStudentProfile = async (userId, { rollNumber, batchYear, departmentId }) => {
    logger.info(`Updating student profile for user ${userId}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });

    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "USER") {
        throw new ApiError(400, "Only users with USER role can update student profile");
    }

    // Validate department exists if provided
    if (departmentId) {
        const dept = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!dept) throw new ApiError(404, "Department not found");
    }

    // Validate rollNumber uniqueness if provided
    if (rollNumber) {
        const existingRoll = await prisma.studentProfile.findUnique({
            where: { rollNumber },
        });
        if (existingRoll && existingRoll.userId !== userId) {
            throw new ApiError(409, "Roll number already in use by another student");
        }
    }

    const profile = await prisma.studentProfile.upsert({
        where: { userId },
        create: {
            userId,
            rollNumber,
            batchYear,
            departmentId: departmentId || null,
        },
        update: {
            ...(rollNumber !== undefined && { rollNumber }),
            ...(batchYear !== undefined && { batchYear }),
            ...(departmentId !== undefined && { departmentId: departmentId || null }),
        },
        include: {
            department: {
                select: { id: true, code: true, name: true },
            },
        },
    });

    logger.info(`Student profile updated for user ${userId}`);
    return profile;
};

/**
 * Create or update faculty profile.
 */
export const updateFacultyProfile = async (userId, { designation, departmentId }) => {
    logger.info(`Updating faculty profile for user ${userId}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });

    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "FACULTY") {
        throw new ApiError(400, "Only users with FACULTY role can update faculty profile");
    }

    if (departmentId) {
        const dept = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!dept) throw new ApiError(404, "Department not found");
    }

    const profile = await prisma.facultyProfile.upsert({
        where: { userId },
        create: {
            userId,
            designation,
            departmentId: departmentId || null,
        },
        update: {
            ...(designation !== undefined && { designation }),
            ...(departmentId !== undefined && { departmentId: departmentId || null }),
        },
        include: {
            department: {
                select: { id: true, code: true, name: true },
            },
        },
    });

    logger.info(`Faculty profile updated for user ${userId}`);
    return profile;
};

/**
 * Create or update staff profile.
 */
export const updateStaffProfile = async (userId, { designation }) => {
    logger.info(`Updating staff profile for user ${userId}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });

    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "STAFF") {
        throw new ApiError(400, "Only users with STAFF role can update staff profile");
    }

    const profile = await prisma.staffProfile.upsert({
        where: { userId },
        create: {
            userId,
            designation,
        },
        update: {
            ...(designation !== undefined && { designation }),
        },
    });

    logger.info(`Staff profile updated for user ${userId}`);
    return profile;
};
