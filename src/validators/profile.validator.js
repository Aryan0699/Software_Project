import { z } from "zod";
import { cuidSchema } from "./common.validator.js";

export const updateStudentProfileSchema = z.object({
    rollNumber: z.string().min(1).max(30).trim().optional(),
    batchYear: z.number().int().min(2000).max(2100).optional(),
    departmentId: cuidSchema.optional().nullable(),
});

export const updateFacultyProfileSchema = z.object({
    designation: z.string().min(1).max(100).trim().optional(),
    departmentId: cuidSchema.optional().nullable(),
});

export const updateStaffProfileSchema = z.object({
    designation: z.string().min(1).max(100).trim().optional(),
});
