import { Router } from "express";
import verifyJWTToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import {
    getBuildings,
    getDepartments,
    getRoomTypes,
    getRoomFeatures,
    getRooms,
    getFacultyList,
    getStaffList,
    getCourses,
    getSlotSystems,
} from "../controllers/info.controller.js";

const infoRouter = Router();

// All info routes require authentication
infoRouter.use(verifyJWTToken);

// Public to any authenticated user — for frontend dropdowns
infoRouter.get("/buildings", getBuildings);
infoRouter.get("/departments", getDepartments);
infoRouter.get("/room-types", getRoomTypes);
infoRouter.get("/room-features", getRoomFeatures);
infoRouter.get("/rooms", getRooms);               // optional ?buildingId=
infoRouter.get("/faculty", getFacultyList);
infoRouter.get("/courses", getCourses);            // optional ?departmentId=
infoRouter.get("/slot-systems", getSlotSystems);

// Staff list — ADMIN only (used for staff-building assignment dropdown)
infoRouter.get("/staff", authorizeRoles("ADMIN"), getStaffList);

export default infoRouter;
