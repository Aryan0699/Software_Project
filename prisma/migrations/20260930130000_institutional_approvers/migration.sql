-- Generalize the fixed dean-office workflow into an admin-managed unanimous
-- institutional approver list while preserving existing approvals.

ALTER TYPE "BookingStatus" RENAME VALUE 'PENDING_DEANS' TO 'PENDING_INSTITUTIONAL';
ALTER TYPE "BookingActionType" RENAME VALUE 'SENT_TO_DEANS' TO 'SENT_TO_INSTITUTIONAL_REVIEW';
ALTER TYPE "BookingActionType" RENAME VALUE 'DEAN_APPROVED' TO 'INSTITUTIONAL_APPROVED';
ALTER TYPE "BookingActionType" RENAME VALUE 'DEAN_REJECTED' TO 'INSTITUTIONAL_REJECTED';
ALTER TYPE "NotificationType" RENAME VALUE 'DEAN_REVIEW_REQUIRED' TO 'INSTITUTIONAL_REVIEW_REQUIRED';
ALTER TYPE "NotificationType" RENAME VALUE 'DEAN_APPROVAL_PROGRESS' TO 'INSTITUTIONAL_APPROVAL_PROGRESS';
ALTER TYPE "AdministrativeEntityType" RENAME VALUE 'DEAN_OFFICE_ASSIGNMENT' TO 'INSTITUTIONAL_APPROVER';

CREATE TYPE "BookingReviewerKind" AS ENUM ('FACULTY', 'INSTITUTIONAL');

CREATE TABLE "InstitutionalApprover" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "InstitutionalApprover_pkey" PRIMARY KEY ("id")
);

INSERT INTO "InstitutionalApprover" (
    "id", "userId", "title", "isActive", "assignedByUserId",
    "assignedAt", "updatedAt"
)
SELECT "id", "userId", "office"::text, true, "assignedByUserId",
       "assignedAt", "updatedAt"
FROM "DeanOfficeAssignment";

ALTER TABLE "BookingApproval"
    ADD COLUMN "reviewerKind" "BookingReviewerKind",
    ADD COLUMN "reviewerLabel" TEXT;

UPDATE "BookingApproval"
SET "reviewerKind" = CASE
        WHEN "reviewerRole" = 'FACULTY' THEN 'FACULTY'::"BookingReviewerKind"
        ELSE 'INSTITUTIONAL'::"BookingReviewerKind"
    END,
    "reviewerLabel" = CASE
        WHEN "reviewerRole" = 'FACULTY' THEN 'Faculty verifier'
        ELSE "reviewerRole"::text
    END;

ALTER TABLE "BookingApproval"
    ALTER COLUMN "reviewerKind" SET NOT NULL,
    ALTER COLUMN "reviewerLabel" SET NOT NULL;

DROP INDEX "BookingApproval_bookingRequestId_reviewerRole_key";
ALTER TABLE "BookingApproval" DROP COLUMN "reviewerRole";
DROP TYPE "BookingApprovalRole";

CREATE UNIQUE INDEX "InstitutionalApprover_userId_key"
    ON "InstitutionalApprover"("userId");
CREATE INDEX "InstitutionalApprover_isActive_assignedAt_idx"
    ON "InstitutionalApprover"("isActive", "assignedAt");
CREATE INDEX "InstitutionalApprover_assignedByUserId_idx"
    ON "InstitutionalApprover"("assignedByUserId");
CREATE UNIQUE INDEX "BookingApproval_bookingRequestId_reviewerKind_reviewerUserId_key"
    ON "BookingApproval"("bookingRequestId", "reviewerKind", "reviewerUserId");

ALTER TABLE "InstitutionalApprover"
    ADD CONSTRAINT "InstitutionalApprover_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstitutionalApprover"
    ADD CONSTRAINT "InstitutionalApprover_assignedByUserId_fkey"
    FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "DeanOfficeAssignment";
DROP TYPE "DeanOffice";
