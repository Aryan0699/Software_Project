import { z } from "zod";
import { cuidSchema, paginationSchema, dateStringSchema } from "./common.validator.js";

// Staff-Building Assignment Validators
export const assignStaffSchema = z.object({
    staffUserId: cuidSchema,
    buildingId: cuidSchema,
});

export const updateAssignmentSchema = z.object({
    newStaffUserId: cuidSchema.optional(),
    newBuildingId: cuidSchema.optional(),
}).refine(data => data.newStaffUserId || data.newBuildingId, {
    message: "At least one field (newStaffUserId or newBuildingId) is required",
});

// Booking History Query Validators
export const bookingHistoryQuerySchema = z.object({
    bookingRequestId: cuidSchema.optional(),
    performedByUserId: cuidSchema.optional(),
    actionType: z.enum(["CREATED", "FACULTY_APPROVED", "FACULTY_REJECTED", "STAFF_APPROVED", "STAFF_REJECTED", "CANCELLED"]).optional(),
    fromDate: dateStringSchema.optional(),
    toDate: dateStringSchema.optional(),
}).merge(paginationSchema);

export const allBookingsQuerySchema = z.object({
    status: z.enum(["PENDING_FACULTY", "PENDING_STAFF", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
    fromDate: dateStringSchema.optional(),
    toDate: dateStringSchema.optional(),
    requesterId: cuidSchema.optional(),
    roomId: cuidSchema.optional(),
    buildingId: cuidSchema.optional(),
}).merge(paginationSchema);
