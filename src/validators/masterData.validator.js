import { z } from "zod";
import { cuidSchema, paginationSchema, minuteSchema } from "./common.validator.js";

// Building Validators
export const createBuildingSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase(),
    name: z.string().min(1).max(100).trim(),
    location: z.string().max(200).trim().optional(),
});

export const updateBuildingSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase().optional(),
    name: z.string().min(1).max(100).trim().optional(),
    location: z.string().max(200).trim().optional().nullable(),
    isActive: z.boolean().optional(),
});

// Room Validators
export const createRoomSchema = z.object({
    buildingId: cuidSchema,
    roomNumber: z.string().min(1).max(20).trim(),
    roomTypeId: cuidSchema.optional(),
    displayName: z.string().max(100).trim().optional(),
    capacity: z.number().int().positive().optional(),
    notes: z.string().max(500).trim().optional(),
});

export const updateRoomSchema = z.object({
    roomNumber: z.string().min(1).max(20).trim().optional(),
    roomTypeId: cuidSchema.optional().nullable(),
    displayName: z.string().max(100).trim().optional().nullable(),
    capacity: z.number().int().positive().optional().nullable(),
    notes: z.string().max(500).trim().optional().nullable(),
    isActive: z.boolean().optional(),
});

export const getRoomsQuerySchema = z.object({
    buildingId: cuidSchema.optional(),
    roomTypeId: cuidSchema.optional(),
    isActive: z.coerce.boolean().optional(),
}).merge(paginationSchema);

// RoomType Validators (aligned with Prisma: code + name, no description)
export const createRoomTypeSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase(),
    name: z.string().min(1).max(50).trim(),
});

export const updateRoomTypeSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase().optional(),
    name: z.string().min(1).max(50).trim().optional(),
    isActive: z.boolean().optional(),
});

// RoomFeature Validators (aligned with Prisma: code + name, no description)
export const createRoomFeatureSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase(),
    name: z.string().min(1).max(50).trim(),
});

export const updateRoomFeatureSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase().optional(),
    name: z.string().min(1).max(50).trim().optional(),
    isActive: z.boolean().optional(),
});

// Room Feature Assignment Validators
export const assignRoomFeatureSchema = z.object({
    featureId: cuidSchema,
    value: z.string().max(100).trim().optional(),
});

// Department Validators
export const createDepartmentSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase(),
    name: z.string().min(1).max(100).trim(),
});

export const updateDepartmentSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase().optional(),
    name: z.string().min(1).max(100).trim().optional(),
    isActive: z.boolean().optional(),
});

// SlotSystem Validators
export const createSlotSystemSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase(),
    name: z.string().min(1).max(50).trim(),
    description: z.string().max(200).trim().optional(),
    applicableFor: z.string().max(100).trim().optional(),
});

export const updateSlotSystemSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase().optional(),
    name: z.string().min(1).max(50).trim().optional(),
    description: z.string().max(200).trim().optional().nullable(),
    applicableFor: z.string().max(100).trim().optional().nullable(),
    isActive: z.boolean().optional(),
});

// Slot Validators
export const createSlotSchema = z.object({
    slotSystemId: cuidSchema,
    code: z.string().min(1).max(20).trim().toUpperCase(),
    slotKind: z.enum(["LECTURE", "LAB", "TUTORIAL", "SPECIAL"]).default("LECTURE"),
});

export const updateSlotSchema = z.object({
    code: z.string().min(1).max(20).trim().toUpperCase().optional(),
    slotKind: z.enum(["LECTURE", "LAB", "TUTORIAL", "SPECIAL"]).optional(),
    isActive: z.boolean().optional(),
});

export const getSlotsQuerySchema = z.object({
    slotSystemId: cuidSchema.optional(),
    isActive: z.coerce.boolean().optional(),
}).merge(paginationSchema);

// SlotAlias Validators
export const createSlotAliasSchema = z.object({
    slotSystemId: cuidSchema,
    effectiveSlotId: cuidSchema,
    rawCode: z.string().min(1).max(20).trim().toUpperCase(),
    note: z.string().max(200).trim().optional(),
});

export const getSlotAliasesQuerySchema = z.object({
    slotSystemId: cuidSchema.optional(),
    effectiveSlotId: cuidSchema.optional(),
}).merge(paginationSchema);

// Filter schemas for listings
export const getBuildingsQuerySchema = z.object({
    isActive: z.coerce.boolean().optional(),
}).merge(paginationSchema);

export const getDepartmentsQuerySchema = z.object({
    isActive: z.coerce.boolean().optional(),
}).merge(paginationSchema);
