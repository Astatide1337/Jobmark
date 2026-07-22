-- AlterTable: Add familyId and consumedAt to OAuthRefreshToken
ALTER TABLE "OAuthRefreshToken" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OAuthRefreshToken" ADD COLUMN "consumedAt" TIMESTAMP(3);

-- Backfill existing rows with unique familyIds
UPDATE "OAuthRefreshToken" SET "familyId" = gen_random_uuid()::text WHERE "familyId" = '';

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_familyId_idx" ON "OAuthRefreshToken"("familyId");
