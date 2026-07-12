-- The initial migration retained report fields that the current model no
-- longer uses. They were NOT NULL and prevented clean installs from saving a
-- report because the application never supplied values for them.
ALTER TABLE "Report" DROP COLUMN IF EXISTS "dateRangeStart";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "dateRangeEnd";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "projectFilter";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "style";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "tone";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "updatedAt";
