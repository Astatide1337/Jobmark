ALTER TABLE "Report" ADD COLUMN "projectId" TEXT;

UPDATE "Report" AS report
SET "projectId" = report."metadata"->>'projectId'
FROM "Project" AS project
WHERE report."projectId" IS NULL
  AND report."metadata"->>'projectId' = project."id"
  AND report."userId" = project."userId";

CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");

ALTER TABLE "Report"
ADD CONSTRAINT "Report_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
