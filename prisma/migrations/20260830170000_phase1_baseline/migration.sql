-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'FACULTY', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "AcademicTermStatus" AS ENUM ('PLANNED', 'CURRENT', 'CLOSED');

-- CreateEnum
CREATE TYPE "DeanOffice" AS ENUM ('DOSA', 'ADOSA', 'DOAA');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RoomRestrictionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SlotKind" AS ENUM ('LECTURE', 'LAB', 'TUTORIAL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "SlotGridStatus" AS ENUM ('DRAFT', 'LOCKED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "CalendarExceptionType" AS ENUM ('NO_CLASSES', 'FOLLOW_DAY');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PREVIEWED', 'PUBLISHED', 'SUPERSEDED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('VALID', 'UNRESOLVED_SLOT', 'UNRESOLVED_ROOM', 'CONFLICTING_MAPPING', 'DUPLICATE_ROW', 'MISSING_REQUIRED_FIELD');

-- CreateEnum
CREATE TYPE "ImportDecisionAction" AS ENUM ('PENDING', 'RESOLVE', 'SKIP');

-- CreateEnum
CREATE TYPE "ComponentKind" AS ENUM ('LECTURE', 'TUTORIAL', 'LAB', 'SEMINAR', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_FACULTY', 'PENDING_DEANS', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM ('ACADEMIC', 'CLUB', 'MEETING', 'WORKSHOP', 'SEMINAR', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingApprovalRole" AS ENUM ('FACULTY', 'DOSA', 'ADOSA', 'DOAA');

-- CreateEnum
CREATE TYPE "BookingApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BookingActionType" AS ENUM ('CREATED', 'FACULTY_APPROVED', 'FACULTY_REJECTED', 'SENT_TO_DEANS', 'DEAN_APPROVED', 'DEAN_REJECTED', 'FINAL_APPROVED', 'AUTO_REJECTED_CONFLICT', 'CANCELLED', 'ADMIN_CONFLICT_RELOCATED', 'ADMIN_CONFLICT_RESCHEDULED', 'ADMIN_CONFLICT_CANCELLED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FACULTY_REVIEW_REQUIRED', 'FACULTY_APPROVED', 'FACULTY_REJECTED', 'DEAN_REVIEW_REQUIRED', 'DEAN_APPROVAL_PROGRESS', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'BOOKING_AUTO_REJECTED', 'BOOKING_CANCELLED', 'BOOKING_RELOCATED', 'BOOKING_RESCHEDULED', 'ADMIN_ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "AdministrativeAuditAction" AS ENUM ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'DISCARD', 'ASSIGN', 'UNASSIGN', 'RESOLVE', 'SKIP', 'SET_CURRENT', 'CLOSE', 'PUBLISH', 'SUPERSEDE', 'CANCEL', 'REBUILD');

-- CreateEnum
CREATE TYPE "AdministrativeEntityType" AS ENUM ('ACADEMIC_TERM', 'DEPARTMENT', 'SLOT_SYSTEM', 'SLOT_GRID_VERSION', 'SLOT', 'CALENDAR_EXCEPTION', 'BUILDING', 'ROOM_TYPE', 'ROOM', 'ROOM_RESTRICTION', 'USER', 'USER_ROLE', 'DEAN_OFFICE_ASSIGNMENT', 'STAFF_BUILDING_ASSIGNMENT', 'TIMETABLE_IMPORT', 'TIMETABLE_IMPORT_ROW', 'TIMETABLE_PUBLICATION', 'OCCUPANCY_PROJECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "initialRole" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ApprovedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rollNumber" TEXT,
    "batchYear" INTEGER,
    "departmentId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designation" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FacultyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designation" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeanOfficeAssignment" (
    "id" TEXT NOT NULL,
    "office" "DeanOffice" NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DeanOfficeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingStaffAssignment" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingStaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "roomNumber" TEXT NOT NULL,
    "fullCode" TEXT NOT NULL,
    "displayName" TEXT,
    "capacity" INTEGER,
    "isAccessible" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomRestriction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "restrictionDate" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RoomRestrictionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "cancelledByUserId" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RoomRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "termCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AcademicTermStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarException" (
    "id" TEXT NOT NULL,
    "academicTermId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exceptionType" "CalendarExceptionType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "targetDayOfWeek" "DayOfWeek",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMPTZ(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CalendarException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotSystem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "applicableFor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SlotSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotGridVersion" (
    "id" TEXT NOT NULL,
    "slotSystemId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "SlotGridStatus" NOT NULL DEFAULT 'DRAFT',
    "basedOnVersionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "discardedAt" TIMESTAMPTZ(3),

    CONSTRAINT "SlotGridVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "slotGridVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slotKind" "SlotKind" NOT NULL DEFAULT 'LECTURE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotOccurrence" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableImportBatch" (
    "id" TEXT NOT NULL,
    "academicTermId" TEXT NOT NULL,
    "slotSystemId" TEXT NOT NULL,
    "slotGridVersionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PREVIEWED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "failureReason" TEXT,
    "revisionNumber" INTEGER,
    "publishedByUserId" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "supersededAt" TIMESTAMPTZ(3),
    "supersededById" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimetableImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rowHash" TEXT,
    "rawRow" JSONB,
    "auxiliaryData" JSONB,
    "rawCourseCode" TEXT,
    "rawSlot" TEXT,
    "rawClassroom" TEXT,
    "rawInstructor" TEXT,
    "normalizedCourseCode" TEXT,
    "normalizedSlot" TEXT,
    "normalizedClassroom" TEXT,
    "initialClassification" "ImportRowStatus" NOT NULL,
    "adminDecision" "ImportDecisionAction" NOT NULL DEFAULT 'PENDING',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "issues" JSONB,
    "resolvedCourseId" TEXT,
    "resolvedSlotId" TEXT,
    "resolvedRoomId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolutionNote" TEXT,
    "publishedAssignmentId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimetableImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "courseType" TEXT,
    "ltp" TEXT,
    "credits" DECIMAL(4,1),
    "departmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSlotAssignment" (
    "id" TEXT NOT NULL,
    "timetableBatchId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "componentKind" "ComponentKind" NOT NULL DEFAULT 'OTHER',
    "rawCourseCode" TEXT,
    "rawSlotCode" TEXT,
    "rawInstructor" TEXT,
    "variantLabel" TEXT,
    "registeredCount" INTEGER,
    "auxiliaryData" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSlotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSlotAssignmentFaculty" (
    "courseSlotAssignmentId" TEXT NOT NULL,
    "facultyUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSlotAssignmentFaculty_pkey" PRIMARY KEY ("courseSlotAssignmentId","facultyUserId")
);

-- CreateTable
CREATE TABLE "CourseRoomAllocation" (
    "id" TEXT NOT NULL,
    "courseSlotAssignmentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseRoomAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomSlotOccupancy" (
    "id" TEXT NOT NULL,
    "academicTermId" TEXT NOT NULL,
    "timetableBatchId" TEXT NOT NULL,
    "courseSlotAssignmentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "slotOccurrenceId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomSlotOccupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "requesterRoleSnapshot" "Role" NOT NULL,
    "roomId" TEXT NOT NULL,
    "bookingDate" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "eventType" "BookingEventType" NOT NULL DEFAULT 'OTHER',
    "expectedParticipants" INTEGER,
    "requiredFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialRequirements" TEXT,
    "status" "BookingStatus" NOT NULL,
    "statusReason" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(3),
    "rejectedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledByUserId" TEXT,
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingApproval" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "reviewerRole" "BookingApprovalRole" NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "status" "BookingApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingActionHistory" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "actionType" "BookingActionType" NOT NULL,
    "performedByUserId" TEXT,
    "previousStatus" "BookingStatus",
    "newStatus" "BookingStatus",
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingActionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeAuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AdministrativeAuditAction" NOT NULL,
    "entityType" "AdministrativeEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrativeAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedUser_email_key" ON "ApprovedUser"("email");

-- CreateIndex
CREATE INDEX "ApprovedUser_initialRole_isActive_idx" ON "ApprovedUser"("initialRole", "isActive");

-- CreateIndex
CREATE INDEX "ApprovedUser_invitedByUserId_idx" ON "ApprovedUser"("invitedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_rollNumber_key" ON "StudentProfile"("rollNumber");

-- CreateIndex
CREATE INDEX "StudentProfile_departmentId_idx" ON "StudentProfile"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyProfile_userId_key" ON "FacultyProfile"("userId");

-- CreateIndex
CREATE INDEX "FacultyProfile_departmentId_idx" ON "FacultyProfile"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeanOfficeAssignment_office_key" ON "DeanOfficeAssignment"("office");

-- CreateIndex
CREATE UNIQUE INDEX "DeanOfficeAssignment_userId_key" ON "DeanOfficeAssignment"("userId");

-- CreateIndex
CREATE INDEX "DeanOfficeAssignment_assignedByUserId_idx" ON "DeanOfficeAssignment"("assignedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Building_code_key" ON "Building"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Building_name_key" ON "Building"("name");

-- CreateIndex
CREATE INDEX "Building_isActive_idx" ON "Building"("isActive");

-- CreateIndex
CREATE INDEX "BuildingStaffAssignment_staffUserId_idx" ON "BuildingStaffAssignment"("staffUserId");

-- CreateIndex
CREATE INDEX "BuildingStaffAssignment_assignedByUserId_idx" ON "BuildingStaffAssignment"("assignedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingStaffAssignment_buildingId_staffUserId_key" ON "BuildingStaffAssignment"("buildingId", "staffUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_code_key" ON "RoomType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_name_key" ON "RoomType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_fullCode_key" ON "Room"("fullCode");

-- CreateIndex
CREATE INDEX "Room_buildingId_status_idx" ON "Room"("buildingId", "status");

-- CreateIndex
CREATE INDEX "Room_roomTypeId_idx" ON "Room"("roomTypeId");

-- CreateIndex
CREATE INDEX "Room_capacity_idx" ON "Room"("capacity");

-- CreateIndex
CREATE UNIQUE INDEX "Room_buildingId_roomNumber_key" ON "Room"("buildingId", "roomNumber");

-- CreateIndex
CREATE INDEX "RoomRestriction_roomId_restrictionDate_status_startMinute_e_idx" ON "RoomRestriction"("roomId", "restrictionDate", "status", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "RoomRestriction_createdByUserId_idx" ON "RoomRestriction"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_termCode_key" ON "AcademicTerm"("termCode");

-- CreateIndex
CREATE INDEX "AcademicTerm_status_idx" ON "AcademicTerm"("status");

-- CreateIndex
CREATE INDEX "AcademicTerm_startDate_endDate_idx" ON "AcademicTerm"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "CalendarException_academicTermId_isActive_startDate_endDate_idx" ON "CalendarException"("academicTermId", "isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CalendarException_exceptionType_idx" ON "CalendarException"("exceptionType");

-- CreateIndex
CREATE UNIQUE INDEX "SlotSystem_code_key" ON "SlotSystem"("code");

-- CreateIndex
CREATE INDEX "SlotSystem_isActive_idx" ON "SlotSystem"("isActive");

-- CreateIndex
CREATE INDEX "SlotGridVersion_slotSystemId_status_idx" ON "SlotGridVersion"("slotSystemId", "status");

-- CreateIndex
CREATE INDEX "SlotGridVersion_basedOnVersionId_idx" ON "SlotGridVersion"("basedOnVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotGridVersion_slotSystemId_versionNumber_key" ON "SlotGridVersion"("slotSystemId", "versionNumber");

-- CreateIndex
CREATE INDEX "Slot_slotGridVersionId_idx" ON "Slot"("slotGridVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_slotGridVersionId_code_key" ON "Slot"("slotGridVersionId", "code");

-- CreateIndex
CREATE INDEX "SlotOccurrence_dayOfWeek_startMinute_endMinute_idx" ON "SlotOccurrence"("dayOfWeek", "startMinute", "endMinute");

-- CreateIndex
CREATE UNIQUE INDEX "SlotOccurrence_slotId_dayOfWeek_startMinute_endMinute_key" ON "SlotOccurrence"("slotId", "dayOfWeek", "startMinute", "endMinute");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableImportBatch_supersededById_key" ON "TimetableImportBatch"("supersededById");

-- CreateIndex
CREATE INDEX "TimetableImportBatch_academicTermId_slotSystemId_fileHash_idx" ON "TimetableImportBatch"("academicTermId", "slotSystemId", "fileHash");

-- CreateIndex
CREATE INDEX "TimetableImportBatch_slotGridVersionId_idx" ON "TimetableImportBatch"("slotGridVersionId");

-- CreateIndex
CREATE INDEX "TimetableImportBatch_status_createdAt_idx" ON "TimetableImportBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TimetableImportBatch_createdByUserId_idx" ON "TimetableImportBatch"("createdByUserId");

-- CreateIndex
CREATE INDEX "TimetableImportBatch_publishedByUserId_idx" ON "TimetableImportBatch"("publishedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableImportBatch_academicTermId_slotSystemId_revisionNu_key" ON "TimetableImportBatch"("academicTermId", "slotSystemId", "revisionNumber");

-- CreateIndex
CREATE INDEX "TimetableImportRow_batchId_initialClassification_isResolved_idx" ON "TimetableImportRow"("batchId", "initialClassification", "isResolved");

-- CreateIndex
CREATE INDEX "TimetableImportRow_rowHash_idx" ON "TimetableImportRow"("rowHash");

-- CreateIndex
CREATE INDEX "TimetableImportRow_resolvedCourseId_idx" ON "TimetableImportRow"("resolvedCourseId");

-- CreateIndex
CREATE INDEX "TimetableImportRow_resolvedSlotId_idx" ON "TimetableImportRow"("resolvedSlotId");

-- CreateIndex
CREATE INDEX "TimetableImportRow_resolvedRoomId_idx" ON "TimetableImportRow"("resolvedRoomId");

-- CreateIndex
CREATE INDEX "TimetableImportRow_resolvedByUserId_idx" ON "TimetableImportRow"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "TimetableImportRow_publishedAssignmentId_idx" ON "TimetableImportRow"("publishedAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableImportRow_batchId_rowIndex_key" ON "TimetableImportRow"("batchId", "rowIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Course_departmentId_idx" ON "Course"("departmentId");

-- CreateIndex
CREATE INDEX "Course_isActive_idx" ON "Course"("isActive");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_timetableBatchId_idx" ON "CourseSlotAssignment"("timetableBatchId");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_courseId_idx" ON "CourseSlotAssignment"("courseId");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_slotId_idx" ON "CourseSlotAssignment"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSlotAssignment_timetableBatchId_courseId_slotId_key" ON "CourseSlotAssignment"("timetableBatchId", "courseId", "slotId");

-- CreateIndex
CREATE INDEX "CourseSlotAssignmentFaculty_facultyUserId_idx" ON "CourseSlotAssignmentFaculty"("facultyUserId");

-- CreateIndex
CREATE INDEX "CourseRoomAllocation_roomId_idx" ON "CourseRoomAllocation"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRoomAllocation_courseSlotAssignmentId_roomId_key" ON "CourseRoomAllocation"("courseSlotAssignmentId", "roomId");

-- CreateIndex
CREATE INDEX "RoomSlotOccupancy_roomId_academicTermId_dayOfWeek_startMinu_idx" ON "RoomSlotOccupancy"("roomId", "academicTermId", "dayOfWeek", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "RoomSlotOccupancy_timetableBatchId_idx" ON "RoomSlotOccupancy"("timetableBatchId");

-- CreateIndex
CREATE INDEX "RoomSlotOccupancy_courseSlotAssignmentId_idx" ON "RoomSlotOccupancy"("courseSlotAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSlotOccupancy_timetableBatchId_courseSlotAssignmentId_r_key" ON "RoomSlotOccupancy"("timetableBatchId", "courseSlotAssignmentId", "roomId", "slotOccurrenceId");

-- CreateIndex
CREATE INDEX "BookingRequest_roomId_bookingDate_status_startMinute_endMin_idx" ON "BookingRequest"("roomId", "bookingDate", "status", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "BookingRequest_requesterUserId_createdAt_idx" ON "BookingRequest"("requesterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_status_submittedAt_idx" ON "BookingRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "BookingRequest_cancelledByUserId_idx" ON "BookingRequest"("cancelledByUserId");

-- CreateIndex
CREATE INDEX "BookingApproval_reviewerUserId_status_assignedAt_idx" ON "BookingApproval"("reviewerUserId", "status", "assignedAt");

-- CreateIndex
CREATE INDEX "BookingApproval_bookingRequestId_status_idx" ON "BookingApproval"("bookingRequestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookingApproval_bookingRequestId_reviewerRole_key" ON "BookingApproval"("bookingRequestId", "reviewerRole");

-- CreateIndex
CREATE INDEX "BookingActionHistory_bookingRequestId_createdAt_idx" ON "BookingActionHistory"("bookingRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingActionHistory_performedByUserId_createdAt_idx" ON "BookingActionHistory"("performedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingActionHistory_actionType_createdAt_idx" ON "BookingActionHistory"("actionType", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_isRead_createdAt_idx" ON "Notification"("recipientId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_resourceType_resourceId_idx" ON "Notification"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_entityType_entityId_createdAt_idx" ON "AdministrativeAuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_actorUserId_createdAt_idx" ON "AdministrativeAuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_action_createdAt_idx" ON "AdministrativeAuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_correlationId_idx" ON "AdministrativeAuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_createdAt_idx" ON "AdministrativeAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ApprovedUser" ADD CONSTRAINT "ApprovedUser_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyProfile" ADD CONSTRAINT "FacultyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyProfile" ADD CONSTRAINT "FacultyProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeanOfficeAssignment" ADD CONSTRAINT "DeanOfficeAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeanOfficeAssignment" ADD CONSTRAINT "DeanOfficeAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingStaffAssignment" ADD CONSTRAINT "BuildingStaffAssignment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingStaffAssignment" ADD CONSTRAINT "BuildingStaffAssignment_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingStaffAssignment" ADD CONSTRAINT "BuildingStaffAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRestriction" ADD CONSTRAINT "RoomRestriction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRestriction" ADD CONSTRAINT "RoomRestriction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRestriction" ADD CONSTRAINT "RoomRestriction_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarException" ADD CONSTRAINT "CalendarException_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarException" ADD CONSTRAINT "CalendarException_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarException" ADD CONSTRAINT "CalendarException_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotGridVersion" ADD CONSTRAINT "SlotGridVersion_slotSystemId_fkey" FOREIGN KEY ("slotSystemId") REFERENCES "SlotSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotGridVersion" ADD CONSTRAINT "SlotGridVersion_basedOnVersionId_fkey" FOREIGN KEY ("basedOnVersionId") REFERENCES "SlotGridVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotGridVersion" ADD CONSTRAINT "SlotGridVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_slotGridVersionId_fkey" FOREIGN KEY ("slotGridVersionId") REFERENCES "SlotGridVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotOccurrence" ADD CONSTRAINT "SlotOccurrence_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportBatch" ADD CONSTRAINT "TimetableImportBatch_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportBatch" ADD CONSTRAINT "TimetableImportBatch_slotSystemId_fkey" FOREIGN KEY ("slotSystemId") REFERENCES "SlotSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportBatch" ADD CONSTRAINT "TimetableImportBatch_slotGridVersionId_fkey" FOREIGN KEY ("slotGridVersionId") REFERENCES "SlotGridVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportBatch" ADD CONSTRAINT "TimetableImportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportBatch" ADD CONSTRAINT "TimetableImportBatch_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportBatch" ADD CONSTRAINT "TimetableImportBatch_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "TimetableImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportRow" ADD CONSTRAINT "TimetableImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TimetableImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportRow" ADD CONSTRAINT "TimetableImportRow_resolvedCourseId_fkey" FOREIGN KEY ("resolvedCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportRow" ADD CONSTRAINT "TimetableImportRow_resolvedSlotId_fkey" FOREIGN KEY ("resolvedSlotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportRow" ADD CONSTRAINT "TimetableImportRow_resolvedRoomId_fkey" FOREIGN KEY ("resolvedRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportRow" ADD CONSTRAINT "TimetableImportRow_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableImportRow" ADD CONSTRAINT "TimetableImportRow_publishedAssignmentId_fkey" FOREIGN KEY ("publishedAssignmentId") REFERENCES "CourseSlotAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignment" ADD CONSTRAINT "CourseSlotAssignment_timetableBatchId_fkey" FOREIGN KEY ("timetableBatchId") REFERENCES "TimetableImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignment" ADD CONSTRAINT "CourseSlotAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignment" ADD CONSTRAINT "CourseSlotAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignmentFaculty" ADD CONSTRAINT "CourseSlotAssignmentFaculty_courseSlotAssignmentId_fkey" FOREIGN KEY ("courseSlotAssignmentId") REFERENCES "CourseSlotAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignmentFaculty" ADD CONSTRAINT "CourseSlotAssignmentFaculty_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRoomAllocation" ADD CONSTRAINT "CourseRoomAllocation_courseSlotAssignmentId_fkey" FOREIGN KEY ("courseSlotAssignmentId") REFERENCES "CourseSlotAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRoomAllocation" ADD CONSTRAINT "CourseRoomAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSlotOccupancy" ADD CONSTRAINT "RoomSlotOccupancy_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSlotOccupancy" ADD CONSTRAINT "RoomSlotOccupancy_timetableBatchId_fkey" FOREIGN KEY ("timetableBatchId") REFERENCES "TimetableImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSlotOccupancy" ADD CONSTRAINT "RoomSlotOccupancy_courseSlotAssignmentId_fkey" FOREIGN KEY ("courseSlotAssignmentId") REFERENCES "CourseSlotAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSlotOccupancy" ADD CONSTRAINT "RoomSlotOccupancy_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSlotOccupancy" ADD CONSTRAINT "RoomSlotOccupancy_slotOccurrenceId_fkey" FOREIGN KEY ("slotOccurrenceId") REFERENCES "SlotOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingApproval" ADD CONSTRAINT "BookingApproval_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingApproval" ADD CONSTRAINT "BookingApproval_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingActionHistory" ADD CONSTRAINT "BookingActionHistory_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingActionHistory" ADD CONSTRAINT "BookingActionHistory_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeAuditEvent" ADD CONSTRAINT "AdministrativeAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Phase 1 domain invariants that Prisma cannot express directly.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX "AcademicTerm_one_current"
ON "AcademicTerm" ((1))
WHERE "status" = 'CURRENT';

CREATE UNIQUE INDEX "SlotGridVersion_one_draft_per_system"
ON "SlotGridVersion" ("slotSystemId")
WHERE "status" = 'DRAFT';

CREATE UNIQUE INDEX "TimetableImportBatch_one_live_revision"
ON "TimetableImportBatch" ("academicTermId", "slotSystemId")
WHERE "status" = 'PUBLISHED';

ALTER TABLE "User"
ADD CONSTRAINT "User_has_login_identity"
CHECK ("hashedPassword" IS NOT NULL OR "googleId" IS NOT NULL),
ADD CONSTRAINT "User_normalized_email"
CHECK ("email" = lower("email"));

ALTER TABLE "ApprovedUser"
ADD CONSTRAINT "ApprovedUser_normalized_email"
CHECK ("email" = lower("email"));

ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_valid_lifecycle"
CHECK (
  "expiresAt" > "createdAt"
  AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
);

ALTER TABLE "AcademicTerm"
ADD CONSTRAINT "AcademicTerm_valid_dates"
CHECK ("startDate" <= "endDate");

ALTER TABLE "Room"
ADD CONSTRAINT "Room_nonnegative_capacity"
CHECK ("capacity" IS NULL OR "capacity" >= 0);

ALTER TABLE "RoomRestriction"
ADD CONSTRAINT "RoomRestriction_valid_minutes"
CHECK ("startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440),
ADD CONSTRAINT "RoomRestriction_valid_cancellation"
CHECK (
  ("status" = 'ACTIVE' AND "cancelledAt" IS NULL AND "cancelledByUserId" IS NULL)
  OR ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL)
);

ALTER TABLE "CalendarException"
ADD CONSTRAINT "CalendarException_valid_dates"
CHECK ("startDate" <= "endDate"),
ADD CONSTRAINT "CalendarException_valid_type"
CHECK (
  ("exceptionType" = 'FOLLOW_DAY' AND "startDate" = "endDate" AND "targetDayOfWeek" IS NOT NULL)
  OR ("exceptionType" = 'NO_CLASSES' AND "targetDayOfWeek" IS NULL)
),
ADD CONSTRAINT "CalendarException_valid_active_state"
CHECK (
  ("isActive" = true AND "deactivatedAt" IS NULL)
  OR ("isActive" = false AND "deactivatedAt" IS NOT NULL)
);

ALTER TABLE "SlotOccurrence"
ADD CONSTRAINT "SlotOccurrence_valid_minutes"
CHECK ("startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440);

ALTER TABLE "SlotGridVersion"
ADD CONSTRAINT "SlotGridVersion_valid_lifecycle"
CHECK (
  ("status" = 'DRAFT' AND "lockedAt" IS NULL AND "discardedAt" IS NULL)
  OR ("status" = 'LOCKED' AND "lockedAt" IS NOT NULL AND "discardedAt" IS NULL)
  OR ("status" = 'DISCARDED' AND "discardedAt" IS NOT NULL)
);

ALTER TABLE "TimetableImportBatch"
ADD CONSTRAINT "TimetableImportBatch_valid_counts"
CHECK (
  "totalRows" >= 0
  AND "validRows" >= 0
  AND "errorRows" >= 0
  AND "skippedRows" >= 0
  AND "validRows" + "errorRows" <= "totalRows"
  AND "skippedRows" <= "totalRows"
),
ADD CONSTRAINT "TimetableImportBatch_valid_file_size"
CHECK ("fileSizeBytes" IS NULL OR "fileSizeBytes" >= 0),
ADD CONSTRAINT "TimetableImportBatch_valid_revision"
CHECK ("revisionNumber" IS NULL OR "revisionNumber" > 0),
ADD CONSTRAINT "TimetableImportBatch_valid_lifecycle"
CHECK (
  (
    "status" = 'PREVIEWED'
    AND "revisionNumber" IS NULL
    AND "publishedAt" IS NULL
    AND "supersededAt" IS NULL
    AND "supersededById" IS NULL
    AND "cancelledAt" IS NULL
  )
  OR (
    "status" = 'PUBLISHED'
    AND "revisionNumber" IS NOT NULL
    AND "publishedAt" IS NOT NULL
    AND "supersededAt" IS NULL
    AND "supersededById" IS NULL
    AND "cancelledAt" IS NULL
  )
  OR (
    "status" = 'SUPERSEDED'
    AND "revisionNumber" IS NOT NULL
    AND "publishedAt" IS NOT NULL
    AND "supersededAt" IS NOT NULL
    AND "supersededById" IS NOT NULL
    AND "cancelledAt" IS NULL
  )
  OR (
    "status" = 'CANCELLED'
    AND "revisionNumber" IS NULL
    AND "publishedAt" IS NULL
    AND "supersededAt" IS NULL
    AND "supersededById" IS NULL
    AND "cancelledAt" IS NOT NULL
  )
  OR (
    "status" = 'FAILED'
    AND "revisionNumber" IS NULL
    AND "publishedAt" IS NULL
    AND "supersededAt" IS NULL
    AND "supersededById" IS NULL
    AND "cancelledAt" IS NULL
  )
);

ALTER TABLE "TimetableImportRow"
ADD CONSTRAINT "TimetableImportRow_valid_resolution"
CHECK (
  ("isResolved" = false AND "resolvedAt" IS NULL AND "resolvedByUserId" IS NULL)
  OR (
    "isResolved" = true
    AND ("initialClassification" = 'VALID' OR "adminDecision" <> 'PENDING')
  )
);

ALTER TABLE "CourseSlotAssignment"
ADD CONSTRAINT "CourseSlotAssignment_nonnegative_registered_count"
CHECK ("registeredCount" IS NULL OR "registeredCount" >= 0);

ALTER TABLE "RoomSlotOccupancy"
ADD CONSTRAINT "RoomSlotOccupancy_valid_minutes"
CHECK ("startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440);

ALTER TABLE "BookingRequest"
ADD CONSTRAINT "BookingRequest_valid_minutes"
CHECK ("startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440),
ADD CONSTRAINT "BookingRequest_nonnegative_participants"
CHECK ("expectedParticipants" IS NULL OR "expectedParticipants" >= 0),
ADD CONSTRAINT "BookingRequest_positive_version"
CHECK ("version" >= 1),
ADD CONSTRAINT "BookingRequest_valid_terminal_state"
CHECK (
  ("status" <> 'APPROVED' OR "approvedAt" IS NOT NULL)
  AND ("status" <> 'REJECTED' OR "rejectedAt" IS NOT NULL)
  AND (
    "status" <> 'CANCELLED'
    OR ("cancelledAt" IS NOT NULL AND "cancellationReason" IS NOT NULL)
  )
);

ALTER TABLE "BookingApproval"
ADD CONSTRAINT "BookingApproval_valid_decision_state"
CHECK (
  ("status" = 'PENDING' AND "decidedAt" IS NULL AND "closedAt" IS NULL)
  OR ("status" IN ('APPROVED', 'REJECTED') AND "decidedAt" IS NOT NULL)
  OR ("status" = 'CLOSED' AND "closedAt" IS NOT NULL)
);

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_valid_read_state"
CHECK (
  ("isRead" = false AND "readAt" IS NULL)
  OR ("isRead" = true AND "readAt" IS NOT NULL)
);

ALTER TABLE "BookingRequest"
ADD CONSTRAINT "BookingRequest_no_approved_overlap"
EXCLUDE USING gist (
  "roomId" WITH =,
  "bookingDate" WITH =,
  int4range("startMinute", "endMinute", '[)') WITH &&
)
WHERE ("status" = 'APPROVED');

ALTER TABLE "RoomSlotOccupancy"
ADD CONSTRAINT "RoomSlotOccupancy_no_academic_overlap"
EXCLUDE USING gist (
  "academicTermId" WITH =,
  "roomId" WITH =,
  "dayOfWeek" WITH =,
  int4range("startMinute", "endMinute", '[)') WITH &&
);

ALTER TABLE "CalendarException"
ADD CONSTRAINT "CalendarException_no_active_overlap"
EXCLUDE USING gist (
  "academicTermId" WITH =,
  daterange("startDate", "endDate", '[]') WITH &&
)
WHERE ("isActive" = true);

ALTER TABLE "RoomRestriction"
ADD CONSTRAINT "RoomRestriction_no_active_overlap"
EXCLUDE USING gist (
  "roomId" WITH =,
  "restrictionDate" WITH =,
  int4range("startMinute", "endMinute", '[)') WITH &&
)
WHERE ("status" = 'ACTIVE');
