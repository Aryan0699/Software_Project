/*
  Warnings:

  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SlotKind" AS ENUM ('LECTURE', 'LAB', 'TUTORIAL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- AlterTable
ALTER TABLE "ApprovedUser" ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "username",
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rollNumber" TEXT,
    "batchYear" INTEGER,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designation" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingStaffAssignment" (
    "buildingId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildingStaffAssignment_pkey" PRIMARY KEY ("buildingId","staffUserId")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomFeature" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomFeatureAssignment" (
    "roomId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "RoomFeatureAssignment_pkey" PRIMARY KEY ("roomId","featureId")
);

-- CreateTable
CREATE TABLE "SlotSystem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "applicableFor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "slotSystemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slotKind" "SlotKind" NOT NULL DEFAULT 'LECTURE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotOccurrence" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotAlias" (
    "id" TEXT NOT NULL,
    "rawCode" TEXT NOT NULL,
    "effectiveSlotId" TEXT NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courseType" TEXT,
    "ltp" TEXT,
    "credits" DECIMAL(4,1),
    "departmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSlotAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "facultyUserId" TEXT,
    "rawSlotCode" TEXT,
    "variantLabel" TEXT,
    "registeredCount" INTEGER,
    "sourceType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSlotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseRoomAllocation" (
    "id" TEXT NOT NULL,
    "courseSlotAssignmentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseRoomAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomSlotOccupancy" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "sourceType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomSlotOccupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "studentId" TEXT NOT NULL,
    "courseSlotAssignmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("studentId","courseSlotAssignmentId")
);

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
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Building_code_key" ON "Building"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Building_name_key" ON "Building"("name");

-- CreateIndex
CREATE INDEX "BuildingStaffAssignment_staffUserId_idx" ON "BuildingStaffAssignment"("staffUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_code_key" ON "RoomType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_name_key" ON "RoomType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_fullCode_key" ON "Room"("fullCode");

-- CreateIndex
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");

-- CreateIndex
CREATE INDEX "Room_roomTypeId_idx" ON "Room"("roomTypeId");

-- CreateIndex
CREATE INDEX "Room_capacity_idx" ON "Room"("capacity");

-- CreateIndex
CREATE INDEX "Room_isActive_idx" ON "Room"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Room_buildingId_roomNumber_key" ON "Room"("buildingId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RoomFeature_code_key" ON "RoomFeature"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RoomFeature_name_key" ON "RoomFeature"("name");

-- CreateIndex
CREATE INDEX "RoomFeatureAssignment_featureId_idx" ON "RoomFeatureAssignment"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotSystem_code_key" ON "SlotSystem"("code");

-- CreateIndex
CREATE INDEX "Slot_slotSystemId_idx" ON "Slot"("slotSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_slotSystemId_code_key" ON "Slot"("slotSystemId", "code");

-- CreateIndex
CREATE INDEX "SlotOccurrence_slotId_idx" ON "SlotOccurrence"("slotId");

-- CreateIndex
CREATE INDEX "SlotOccurrence_dayOfWeek_idx" ON "SlotOccurrence"("dayOfWeek");

-- CreateIndex
CREATE INDEX "SlotOccurrence_dayOfWeek_startMinute_endMinute_idx" ON "SlotOccurrence"("dayOfWeek", "startMinute", "endMinute");

-- CreateIndex
CREATE UNIQUE INDEX "SlotAlias_rawCode_key" ON "SlotAlias"("rawCode");

-- CreateIndex
CREATE INDEX "SlotAlias_effectiveSlotId_idx" ON "SlotAlias"("effectiveSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Course_departmentId_idx" ON "Course"("departmentId");

-- CreateIndex
CREATE INDEX "Course_isActive_idx" ON "Course"("isActive");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_courseId_idx" ON "CourseSlotAssignment"("courseId");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_slotId_idx" ON "CourseSlotAssignment"("slotId");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_facultyUserId_idx" ON "CourseSlotAssignment"("facultyUserId");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_rawSlotCode_idx" ON "CourseSlotAssignment"("rawSlotCode");

-- CreateIndex
CREATE INDEX "CourseSlotAssignment_isActive_idx" ON "CourseSlotAssignment"("isActive");

-- CreateIndex
CREATE INDEX "CourseRoomAllocation_roomId_idx" ON "CourseRoomAllocation"("roomId");

-- CreateIndex
CREATE INDEX "CourseRoomAllocation_isActive_idx" ON "CourseRoomAllocation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRoomAllocation_courseSlotAssignmentId_roomId_key" ON "CourseRoomAllocation"("courseSlotAssignmentId", "roomId");

-- CreateIndex
CREATE INDEX "RoomSlotOccupancy_slotId_idx" ON "RoomSlotOccupancy"("slotId");

-- CreateIndex
CREATE INDEX "RoomSlotOccupancy_isActive_idx" ON "RoomSlotOccupancy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSlotOccupancy_roomId_slotId_key" ON "RoomSlotOccupancy"("roomId", "slotId");

-- CreateIndex
CREATE INDEX "Enrollment_courseSlotAssignmentId_idx" ON "Enrollment"("courseSlotAssignmentId");

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
ALTER TABLE "BuildingStaffAssignment" ADD CONSTRAINT "BuildingStaffAssignment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingStaffAssignment" ADD CONSTRAINT "BuildingStaffAssignment_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFeatureAssignment" ADD CONSTRAINT "RoomFeatureAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFeatureAssignment" ADD CONSTRAINT "RoomFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "RoomFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_slotSystemId_fkey" FOREIGN KEY ("slotSystemId") REFERENCES "SlotSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotOccurrence" ADD CONSTRAINT "SlotOccurrence_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAlias" ADD CONSTRAINT "SlotAlias_effectiveSlotId_fkey" FOREIGN KEY ("effectiveSlotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignment" ADD CONSTRAINT "CourseSlotAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignment" ADD CONSTRAINT "CourseSlotAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlotAssignment" ADD CONSTRAINT "CourseSlotAssignment_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRoomAllocation" ADD CONSTRAINT "CourseRoomAllocation_courseSlotAssignmentId_fkey" FOREIGN KEY ("courseSlotAssignmentId") REFERENCES "CourseSlotAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRoomAllocation" ADD CONSTRAINT "CourseRoomAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSlotOccupancy" ADD CONSTRAINT "RoomSlotOccupancy_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSlotOccupancy" ADD CONSTRAINT "RoomSlotOccupancy_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseSlotAssignmentId_fkey" FOREIGN KEY ("courseSlotAssignmentId") REFERENCES "CourseSlotAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
