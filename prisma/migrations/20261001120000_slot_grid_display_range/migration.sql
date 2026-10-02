ALTER TABLE "SlotGridVersion"
ADD COLUMN "dayStartMinute" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN "dayEndMinute" INTEGER NOT NULL DEFAULT 1130;

ALTER TABLE "SlotGridVersion"
ADD CONSTRAINT "SlotGridVersion_valid_day_range"
CHECK (
  "dayStartMinute" >= 0
  AND "dayStartMinute" < "dayEndMinute"
  AND "dayEndMinute" <= 1440
  AND "dayEndMinute" - "dayStartMinute" >= 50
  AND mod("dayEndMinute" - "dayStartMinute" - 50, 60) = 0
);

-- Earlier development work inserted these two examples. Remove their draft or
-- locked grids only when the system has never been used by an import.
DELETE FROM "SlotGridVersion" AS grid
USING "SlotSystem" AS system
WHERE grid."slotSystemId" = system."id"
  AND system."code" IN ('FIRST_YEAR', 'SECOND_YEAR_ONWARD')
  AND NOT EXISTS (
    SELECT 1 FROM "TimetableImportBatch" AS batch
    WHERE batch."slotSystemId" = system."id"
  );

DELETE FROM "SlotSystem" AS system
WHERE system."code" IN ('FIRST_YEAR', 'SECOND_YEAR_ONWARD')
  AND NOT EXISTS (
    SELECT 1 FROM "SlotGridVersion" AS grid
    WHERE grid."slotSystemId" = system."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "TimetableImportBatch" AS batch
    WHERE batch."slotSystemId" = system."id"
  );
