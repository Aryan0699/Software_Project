import { z } from "zod";
import { cuidSchema, minuteSchema, dateStringSchema } from "./common.validator.js";

export const createBookingSchema = z.object({
    roomId: cuidSchema,
    bookingDate: dateStringSchema,
    startMinute: minuteSchema,
    endMinute: minuteSchema,
    title: z.string().min(1, "Title is required").max(200).trim(),
    purpose: z.string().max(1000).trim().optional(),
    minCapacityRequired: z.number().int().positive("Capacity must be positive").optional(),
    facultyReviewerUserId: cuidSchema.optional(),
}).refine(data => data.startMinute < data.endMinute, {
    message: "Start minute must be less than end minute",
    path: ["endMinute"],
});

export const checkAvailabilitySchema = z.object({
    roomId: cuidSchema,
    bookingDate: dateStringSchema,
    startMinute: minuteSchema,
    endMinute: minuteSchema,
}).refine(data => data.startMinute < data.endMinute, {
    message: "Start minute must be less than end minute",
    path: ["endMinute"],
});

export const rejectBookingSchema = z.object({
    rejectionReason: z.string().min(1, "Rejection reason is required").max(500).trim(),
});

export const getAvailableRoomsSchema = z.object({
    bookingDate: dateStringSchema,
    startMinute: z.coerce.number().int().min(0).max(1439),
    endMinute: z.coerce.number().int().min(0).max(1439),
    buildingId: cuidSchema.optional(),
    roomTypeId: cuidSchema.optional(),
    minCapacity: z.coerce.number().int().positive().optional(),
}).refine(data => data.startMinute < data.endMinute, {
    message: "Start minute must be less than end minute",
    path: ["endMinute"],
});

export const suggestRoomsSchema = z.object({
    roomId: cuidSchema.optional(),
    bookingDate: dateStringSchema,
    startMinute: z.coerce.number().int().min(0).max(1439),
    endMinute: z.coerce.number().int().min(0).max(1439),
    buildingId: cuidSchema.optional(),
    minCapacity: z.coerce.number().int().positive().optional(),
    roomTypeId: cuidSchema.optional(),
}).refine(data => data.startMinute < data.endMinute, {
    message: "Start minute must be less than end minute",
    path: ["endMinute"],
});

export const buildingRoomMapSchema = z.object({
    buildingId: cuidSchema,
    bookingDate: dateStringSchema,
    startMinute: z.coerce.number().int().min(0).max(1439),
    endMinute: z.coerce.number().int().min(0).max(1439),
}).refine(data => data.startMinute < data.endMinute, {
    message: "Start minute must be less than end minute",
    path: ["endMinute"],
});
