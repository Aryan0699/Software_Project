import { Router } from "express";
import verifyJWTToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    getMyProfile,
    updateStudentProfile,
    updateFacultyProfile,
    updateStaffProfile,
} from "../controllers/profile.controller.js";
import {
    updateStudentProfileSchema,
    updateFacultyProfileSchema,
    updateStaffProfileSchema,
} from "../validators/profile.validator.js";

const profileRouter = Router();

// All profile routes require authentication
profileRouter.use(verifyJWTToken);

// Get own profile (any authenticated user)
profileRouter.get("/me", getMyProfile);

// Student profile update (USER role only)
profileRouter.patch(
    "/student",
    authorizeRoles("USER"),
    validate(updateStudentProfileSchema),
    updateStudentProfile
);

// Faculty profile update (FACULTY role only)
profileRouter.patch(
    "/faculty",
    authorizeRoles("FACULTY"),
    validate(updateFacultyProfileSchema),
    updateFacultyProfile
);

// Staff profile update (STAFF role only)
profileRouter.patch(
    "/staff",
    authorizeRoles("STAFF"),
    validate(updateStaffProfileSchema),
    updateStaffProfile
);

export default profileRouter;
