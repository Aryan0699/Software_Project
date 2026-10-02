ALTER TABLE "TimetableImportRow"
DROP CONSTRAINT IF EXISTS "TimetableImportRow_valid_resolution";

ALTER TYPE "ImportRowStatus" RENAME VALUE 'VALID' TO 'READY';

UPDATE "TimetableImportRow"
SET "initialClassification" = 'UNRESOLVED_SLOT'
WHERE "initialClassification"::text = 'CONFLICTING_MAPPING';

ALTER TYPE "ImportRowStatus" RENAME TO "ImportRowStatus_old";

CREATE TYPE "ImportRowStatus" AS ENUM (
  'READY',
  'UNRESOLVED_SLOT',
  'UNRESOLVED_ROOM',
  'DUPLICATE_ROW',
  'MISSING_REQUIRED_FIELD'
);

ALTER TABLE "TimetableImportRow"
ALTER COLUMN "initialClassification" TYPE "ImportRowStatus"
USING ("initialClassification"::text::"ImportRowStatus");

DROP TYPE "ImportRowStatus_old";

ALTER TABLE "TimetableImportRow"
ADD CONSTRAINT "TimetableImportRow_valid_resolution"
CHECK (
  ("isResolved" = false AND "resolvedAt" IS NULL AND "resolvedByUserId" IS NULL)
  OR (
    "isResolved" = true
    AND ("initialClassification" = 'READY' OR "adminDecision" <> 'PENDING')
  )
);
