import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../utils/logger.js";
import {
    getMyProfile as getMyProfileService,
    updateStudentProfile as updateStudentProfileService,
    updateFacultyProfile as updateFacultyProfileService,
    updateStaffProfile as updateStaffProfileService,
} from "../services/profile.service.js";

export const getMyProfile = asyncHandler(async (req, res) => {
    logger.info(`Fetching profile for user ${req.user.userId}`);
    const profile = await getMyProfileService(req.user.userId);
    return res.status(200).json(
        new ApiResponse(200, "Profile fetched successfully", profile)
    );
});

export const updateStudentProfile = asyncHandler(async (req, res) => {
    logger.info(`Updating student profile for user ${req.user.userId}`);
    const profile = await updateStudentProfileService(req.user.userId, req.body);
    return res.status(200).json(
        new ApiResponse(200, "Student profile updated successfully", profile)
    );
});

export const updateFacultyProfile = asyncHandler(async (req, res) => {
    logger.info(`Updating faculty profile for user ${req.user.userId}`);
    const profile = await updateFacultyProfileService(req.user.userId, req.body);
    return res.status(200).json(
        new ApiResponse(200, "Faculty profile updated successfully", profile)
    );
});

export const updateStaffProfile = asyncHandler(async (req, res) => {
    logger.info(`Updating staff profile for user ${req.user.userId}`);
    const profile = await updateStaffProfileService(req.user.userId, req.body);
    return res.status(200).json(
        new ApiResponse(200, "Staff profile updated successfully", profile)
    );
});
