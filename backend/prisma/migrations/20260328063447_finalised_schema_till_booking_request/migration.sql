/*
  Warnings:

  - A unique constraint covering the columns `[slotSystemId,rawCode]` on the table `SlotAlias` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slotSystemId` to the `SlotAlias` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_FACULTY', 'PENDING_STAFF', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingActionType" AS ENUM ('CREATED', 'FACULTY_APPROVED', 'FACULTY_REJECTED', 'STAFF_APPROVED', 'STAFF_REJECTED', 'CANCELLED');

-- DropIndex
DROP INDEX "SlotAlias_rawCode_key";

-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SlotAlias" ADD COLUMN     "slotSystemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "minCapacityRequired" INTEGER,
    "status" "BookingStatus" NOT NULL,
    "rejectionReason" TEXT,
    "facultyReviewerUserId" TEXT,
    "staffReviewerUserId" TEXT,
    "facultyDecisionAt" TIMESTAMP(3),
    "staffDecisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingActionHistory" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "actionType" "BookingActionType" NOT NULL,
    "performedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingActionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingRequest_roomId_bookingDate_idx" ON "BookingRequest"("roomId", "bookingDate");

-- CreateIndex
CREATE INDEX "BookingRequest_requesterUserId_idx" ON "BookingRequest"("requesterUserId");

-- CreateIndex
CREATE INDEX "BookingRequest_status_idx" ON "BookingRequest"("status");

-- CreateIndex
CREATE INDEX "BookingRequest_bookingDate_startMinute_endMinute_idx" ON "BookingRequest"("bookingDate", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "BookingRequest_facultyReviewerUserId_idx" ON "BookingRequest"("facultyReviewerUserId");

-- CreateIndex
CREATE INDEX "BookingRequest_staffReviewerUserId_idx" ON "BookingRequest"("staffReviewerUserId");

-- CreateIndex
CREATE INDEX "BookingActionHistory_bookingRequestId_idx" ON "BookingActionHistory"("bookingRequestId");

-- CreateIndex
CREATE INDEX "BookingActionHistory_performedByUserId_idx" ON "BookingActionHistory"("performedByUserId");

-- CreateIndex
CREATE INDEX "BookingActionHistory_actionType_idx" ON "BookingActionHistory"("actionType");

-- CreateIndex
CREATE INDEX "BookingActionHistory_createdAt_idx" ON "BookingActionHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlotAlias_slotSystemId_rawCode_key" ON "SlotAlias"("slotSystemId", "rawCode");

-- AddForeignKey
ALTER TABLE "SlotAlias" ADD CONSTRAINT "SlotAlias_slotSystemId_fkey" FOREIGN KEY ("slotSystemId") REFERENCES "SlotSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_facultyReviewerUserId_fkey" FOREIGN KEY ("facultyReviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_staffReviewerUserId_fkey" FOREIGN KEY ("staffReviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingActionHistory" ADD CONSTRAINT "BookingActionHistory_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingActionHistory" ADD CONSTRAINT "BookingActionHistory_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
