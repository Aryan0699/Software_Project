import { Router } from "express";
import verifyJWTToken from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import { validate, validateMultiple } from "../middlewares/validate.middleware.js";
import { idParamSchema, paginationSchema } from "../validators/common.validator.js";

// Admin controllers
import {
    assignStaff,
    removeStaff,
    updateAssignment,
    getAssignments,
    getBuildingsForStaff,
    getStaffForBuilding,
    getBookingHistory,
    getAllBookings,
    getStats,
    createApprovedUser,
    listApprovedUsers,
    updateApprovedUser,
    deleteApprovedUser,
} from "../controllers/admin.controller.js";

// Master data controllers
import {
    createBuilding, getBuilding, listBuildings, updateBuilding, softDeleteBuilding, hardDeleteBuilding,
    createRoom, getRoom, listRooms, updateRoom, softDeleteRoom, hardDeleteRoom,
    createRoomType, listRoomTypes, updateRoomType, softDeleteRoomType, hardDeleteRoomType,
    createRoomFeature, listRoomFeatures, updateRoomFeature, softDeleteRoomFeature, hardDeleteRoomFeature,
    assignFeatureToRoom, removeFeatureFromRoom,
    createDepartment, listDepartments, updateDepartment, softDeleteDepartment, hardDeleteDepartment,
    createSlotSystem, getSlotSystem, listSlotSystems, updateSlotSystem, softDeleteSlotSystem, hardDeleteSlotSystem,
    createSlotAlias, listSlotAliases, deleteSlotAlias,
    createCourse, getCourse, listCourses, updateCourse, softDeleteCourse, hardDeleteCourse,
    allocateRoomToCourse, removeRoomFromCourse,
} from "../controllers/masterData.controller.js";

// Admin validators
import {
    assignStaffSchema,
    updateAssignmentSchema,
    bookingHistoryQuerySchema,
    allBookingsQuerySchema,
    createApprovedUserSchema,
    updateApprovedUserSchema as updateApprovedUserValidatorSchema,
    listApprovedUsersQuerySchema,
} from "../validators/admin.validator.js";

// Master data validators
import {
    createBuildingSchema, updateBuildingSchema, getBuildingsQuerySchema,
    createRoomSchema, updateRoomSchema, getRoomsQuerySchema,
    createRoomTypeSchema, updateRoomTypeSchema,
    createRoomFeatureSchema, updateRoomFeatureSchema, assignRoomFeatureSchema,
    createDepartmentSchema, updateDepartmentSchema, getDepartmentsQuerySchema,
    createSlotSystemSchema, updateSlotSystemSchema,
    createSlotAliasSchema, getSlotAliasesQuerySchema,
    createCourseSchema, updateCourseSchema, getCoursesQuerySchema, allocateRoomToCourseSchema,
} from "../validators/masterData.validator.js";

const adminRouter = Router();

// All admin routes require auth + ADMIN role
adminRouter.use(verifyJWTToken, authorizeRoles("ADMIN"));

// ==================== STAFF-BUILDING ASSIGNMENTS ====================

adminRouter.post(
    "/staff-assignments",
    validate(assignStaffSchema),
    assignStaff
);

adminRouter.delete(
    "/staff-assignments/:buildingId/:staffUserId",
    removeStaff
);

adminRouter.patch(
    "/staff-assignments/:buildingId/:staffUserId",
    validate(updateAssignmentSchema),
    updateAssignment
);

adminRouter.get(
    "/staff-assignments",
    validate(paginationSchema, "query"),
    getAssignments
);

adminRouter.get(
    "/staff-assignments/by-staff/:staffUserId",
    getBuildingsForStaff
);

adminRouter.get(
    "/staff-assignments/by-building/:buildingId",
    getStaffForBuilding
);

// ==================== BOOKING MONITORING ====================

adminRouter.get(
    "/booking-history",
    validate(bookingHistoryQuerySchema, "query"),
    getBookingHistory
);

adminRouter.get(
    "/bookings",
    validate(allBookingsQuerySchema, "query"),
    getAllBookings
);

adminRouter.get("/stats", getStats);

// ==================== MASTER DATA: BUILDINGS ====================

adminRouter.post(
    "/master/buildings",
    validate(createBuildingSchema),
    createBuilding
);

adminRouter.get(
    "/master/buildings",
    validate(getBuildingsQuerySchema, "query"),
    listBuildings
);

adminRouter.get(
    "/master/buildings/:id",
    validate(idParamSchema, "params"),
    getBuilding
);

adminRouter.patch(
    "/master/buildings/:id",
    validate(idParamSchema, "params"),
    validate(updateBuildingSchema),
    updateBuilding
);

adminRouter.patch(
    "/master/buildings/:id/deactivate",
    validate(idParamSchema, "params"),
    softDeleteBuilding
);

adminRouter.delete(
    "/master/buildings/:id",
    validate(idParamSchema, "params"),
    hardDeleteBuilding
);

// ==================== MASTER DATA: ROOMS ====================

adminRouter.post(
    "/master/rooms",
    validate(createRoomSchema),
    createRoom
);

adminRouter.get(
    "/master/rooms",
    validate(getRoomsQuerySchema, "query"),
    listRooms
);

adminRouter.get(
    "/master/rooms/:id",
    validate(idParamSchema, "params"),
    getRoom
);

adminRouter.patch(
    "/master/rooms/:id",
    validate(idParamSchema, "params"),
    validate(updateRoomSchema),
    updateRoom
);

adminRouter.patch(
    "/master/rooms/:id/deactivate",
    validate(idParamSchema, "params"),
    softDeleteRoom
);

adminRouter.delete(
    "/master/rooms/:id",
    validate(idParamSchema, "params"),
    hardDeleteRoom
);

// Room feature assignments
adminRouter.post(
    "/master/rooms/:roomId/features",
    validate(assignRoomFeatureSchema),
    assignFeatureToRoom
);

adminRouter.delete(
    "/master/rooms/:roomId/features/:featureId",
    removeFeatureFromRoom
);

// ==================== MASTER DATA: ROOM TYPES ====================

adminRouter.post(
    "/master/room-types",
    validate(createRoomTypeSchema),
    createRoomType
);

adminRouter.get(
    "/master/room-types",
    validate(paginationSchema, "query"),
    listRoomTypes
);

adminRouter.patch(
    "/master/room-types/:id",
    validate(idParamSchema, "params"),
    validate(updateRoomTypeSchema),
    updateRoomType
);

adminRouter.patch(
    "/master/room-types/:id/deactivate",
    validate(idParamSchema, "params"),
    softDeleteRoomType
);

adminRouter.delete(
    "/master/room-types/:id",
    validate(idParamSchema, "params"),
    hardDeleteRoomType
);

// ==================== MASTER DATA: ROOM FEATURES ====================

adminRouter.post(
    "/master/room-features",
    validate(createRoomFeatureSchema),
    createRoomFeature
);

adminRouter.get(
    "/master/room-features",
    validate(paginationSchema, "query"),
    listRoomFeatures
);

adminRouter.patch(
    "/master/room-features/:id",
    validate(idParamSchema, "params"),
    validate(updateRoomFeatureSchema),
    updateRoomFeature
);

adminRouter.patch(
    "/master/room-features/:id/deactivate",
    validate(idParamSchema, "params"),
    softDeleteRoomFeature
);

adminRouter.delete(
    "/master/room-features/:id",
    validate(idParamSchema, "params"),
    hardDeleteRoomFeature
);

// ==================== MASTER DATA: DEPARTMENTS ====================

adminRouter.post(
    "/master/departments",
    validate(createDepartmentSchema),
    createDepartment
);

adminRouter.get(
    "/master/departments",
    validate(getDepartmentsQuerySchema, "query"),
    listDepartments
);

adminRouter.patch(
    "/master/departments/:id",
    validate(idParamSchema, "params"),
    validate(updateDepartmentSchema),
    updateDepartment
);

adminRouter.patch(
    "/master/departments/:id/deactivate",
    validate(idParamSchema, "params"),
    softDeleteDepartment
);

adminRouter.delete(
    "/master/departments/:id",
    validate(idParamSchema, "params"),
    hardDeleteDepartment
);

// ==================== MASTER DATA: SLOT SYSTEMS ====================

adminRouter.post(
    "/master/slot-systems",
    validate(createSlotSystemSchema),
    createSlotSystem
);

adminRouter.get(
    "/master/slot-systems",
    validate(paginationSchema, "query"),
    listSlotSystems
);

adminRouter.get(
    "/master/slot-systems/:id",
    validate(idParamSchema, "params"),
    getSlotSystem
);

adminRouter.patch(
    "/master/slot-systems/:id",
    validate(idParamSchema, "params"),
    validate(updateSlotSystemSchema),
    updateSlotSystem
);

adminRouter.patch(
    "/master/slot-systems/:id/deactivate",
    validate(idParamSchema, "params"),
    softDeleteSlotSystem
);

adminRouter.delete(
    "/master/slot-systems/:id",
    validate(idParamSchema, "params"),
    hardDeleteSlotSystem
);

// ==================== MASTER DATA: SLOT ALIASES ====================

adminRouter.post(
    "/master/slot-aliases",
    validate(createSlotAliasSchema),
    createSlotAlias
);

adminRouter.get(
    "/master/slot-aliases",
    validate(getSlotAliasesQuerySchema, "query"),
    listSlotAliases
);

adminRouter.delete(
    "/master/slot-aliases/:id",
    validate(idParamSchema, "params"),
    deleteSlotAlias
);

// ==================== APPROVED USERS ====================

adminRouter.post(
    "/approved-users",
    validate(createApprovedUserSchema),
    createApprovedUser
);

adminRouter.get(
    "/approved-users",
    validate(listApprovedUsersQuerySchema, "query"),
    listApprovedUsers
);

adminRouter.patch(
    "/approved-users/:id",
    validate(idParamSchema, "params"),
    validate(updateApprovedUserValidatorSchema),
    updateApprovedUser
);

adminRouter.delete(
    "/approved-users/:id",
    validate(idParamSchema, "params"),
    deleteApprovedUser
);

// ==================== MASTER DATA: COURSES ====================

adminRouter.post(
    "/master/courses",
    validate(createCourseSchema),
    createCourse
);

adminRouter.get(
    "/master/courses",
    validate(getCoursesQuerySchema, "query"),
    listCourses
);

adminRouter.get(
    "/master/courses/:id",
    validate(idParamSchema, "params"),
    getCourse
);

adminRouter.patch(
    "/master/courses/:id",
    validate(idParamSchema, "params"),
    validate(updateCourseSchema),
    updateCourse
);

adminRouter.patch(
    "/master/courses/:id/deactivate",
    validate(idParamSchema, "params"),
    softDeleteCourse
);

adminRouter.delete(
    "/master/courses/:id",
    validate(idParamSchema, "params"),
    hardDeleteCourse
);

// Course Room Allocations
adminRouter.post(
    "/master/courses/:courseId/rooms",
    validate(allocateRoomToCourseSchema),
    allocateRoomToCourse
);

adminRouter.delete(
    "/master/courses/room-allocations/:allocationId",
    removeRoomFromCourse
);

export default adminRouter;
