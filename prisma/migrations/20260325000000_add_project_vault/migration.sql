-- AlterTable
ALTER TABLE "Project" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "vaultPasswordHash" TEXT;

-- CreateIndex
CREATE INDEX "Project_userId_locked_idx" ON "Project"("userId", "locked");
