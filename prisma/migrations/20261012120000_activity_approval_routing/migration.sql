-- Replace the global institutional approver list with activity-specific,
-- unanimous approval routes. Existing approval tasks are historical records
-- and deliberately remain unchanged.

CREATE TABLE "BookingActivityType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "BookingActivityType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingActivityApprover" (
    "id" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewerLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "BookingActivityApprover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingActivityType_normalizedName_key"
    ON "BookingActivityType"("normalizedName");
CREATE INDEX "BookingActivityType_isActive_name_idx"
    ON "BookingActivityType"("isActive", "name");
CREATE UNIQUE INDEX "BookingActivityApprover_activityTypeId_userId_key"
    ON "BookingActivityApprover"("activityTypeId", "userId");
CREATE INDEX "BookingActivityApprover_activityTypeId_isActive_assignedAt_idx"
    ON "BookingActivityApprover"("activityTypeId", "isActive", "assignedAt");
CREATE INDEX "BookingActivityApprover_userId_isActive_idx"
    ON "BookingActivityApprover"("userId", "isActive");

ALTER TABLE "BookingActivityApprover"
    ADD CONSTRAINT "BookingActivityApprover_activityTypeId_fkey"
    FOREIGN KEY ("activityTypeId") REFERENCES "BookingActivityType"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingActivityApprover"
    ADD CONSTRAINT "BookingActivityApprover_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "BookingActivityType" ("id", "name", "normalizedName", "isActive", "updatedAt") VALUES
    ('activity_institute', 'Institute Activities', 'institute activities', false, CURRENT_TIMESTAMP),
    ('activity_academic', 'Academic Activities', 'academic activities', false, CURRENT_TIMESTAMP),
    ('activity_student', 'Student Activities', 'student activities', false, CURRENT_TIMESTAMP),
    ('activity_research_development', 'Research and Development Activities', 'research and development activities', false, CURRENT_TIMESTAMP),
    ('activity_staff_administrative', 'Staff / Administrative Activities', 'staff / administrative activities', false, CURRENT_TIMESTAMP),
    ('activity_international_relations', 'International Relations Activities', 'international relations activities', false, CURRENT_TIMESTAMP),
    ('activity_digital_infrastructure', 'Digital Infrastructure Activities', 'digital infrastructure activities', false, CURRENT_TIMESTAMP),
    ('activity_resource_alumni', 'Resource and Alumni Engagement', 'resource and alumni engagement', false, CURRENT_TIMESTAMP),
    ('activity_faculty', 'Faculty-related Activities', 'faculty-related activities', false, CURRENT_TIMESTAMP),
    ('activity_infrastructure', 'Infrastructure-related Activities', 'infrastructure-related activities', false, CURRENT_TIMESTAMP),
    ('activity_cultural_community', 'Cultural, Community, Social, Commercial and Government Activities', 'cultural, community, social, commercial and government activities', false, CURRENT_TIMESTAMP),
    ('activity_legacy_meeting', 'Meeting', 'meeting', false, CURRENT_TIMESTAMP),
    ('activity_legacy_workshop', 'Workshop', 'workshop', false, CURRENT_TIMESTAMP),
    ('activity_legacy_seminar', 'Seminar', 'seminar', false, CURRENT_TIMESTAMP),
    ('activity_legacy_other', 'Other', 'other', false, CURRENT_TIMESTAMP);

ALTER TABLE "BookingRequest"
    ADD COLUMN "activityTypeId" TEXT,
    ADD COLUMN "activityTypeNameSnapshot" TEXT;

UPDATE "BookingRequest"
SET
    "activityTypeId" = CASE "eventType"::text
        WHEN 'ACADEMIC' THEN 'activity_academic'
        WHEN 'CLUB' THEN 'activity_student'
        WHEN 'MEETING' THEN 'activity_legacy_meeting'
        WHEN 'WORKSHOP' THEN 'activity_legacy_workshop'
        WHEN 'SEMINAR' THEN 'activity_legacy_seminar'
        ELSE 'activity_legacy_other'
    END,
    "activityTypeNameSnapshot" = CASE "eventType"::text
        WHEN 'ACADEMIC' THEN 'Academic Activities'
        WHEN 'CLUB' THEN 'Student Activities'
        WHEN 'MEETING' THEN 'Meeting'
        WHEN 'WORKSHOP' THEN 'Workshop'
        WHEN 'SEMINAR' THEN 'Seminar'
        ELSE 'Other'
    END;

ALTER TABLE "BookingRequest"
    ALTER COLUMN "activityTypeId" SET NOT NULL,
    ALTER COLUMN "activityTypeNameSnapshot" SET NOT NULL;

CREATE INDEX "BookingRequest_activityTypeId_createdAt_idx"
    ON "BookingRequest"("activityTypeId", "createdAt");
ALTER TABLE "BookingRequest"
    ADD CONSTRAINT "BookingRequest_activityTypeId_fkey"
    FOREIGN KEY ("activityTypeId") REFERENCES "BookingActivityType"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingRequest" DROP COLUMN "eventType";
DROP TYPE "BookingEventType";

-- Global memberships are intentionally not copied. Administrators must make
-- explicit assignments for each activity type.
DROP TABLE "InstitutionalApprover";
