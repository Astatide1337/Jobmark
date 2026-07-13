-- The original initial migration omitted UserSettings even though the
-- application schema and later migrations depend on it. Keep this idempotent
-- so it is safe for databases that were provisioned with db push already.
CREATE TABLE IF NOT EXISTS "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryGoal" TEXT,
    "goalDeadline" TIMESTAMP(3),
    "whyStatement" TEXT,
    "dailyTarget" INTEGER NOT NULL DEFAULT 1,
    "weeklyTarget" INTEGER NOT NULL DEFAULT 10,
    "monthlyTarget" INTEGER NOT NULL DEFAULT 40,
    "defaultTone" TEXT NOT NULL DEFAULT 'professional',
    "customInstructions" TEXT,
    "themePreset" TEXT NOT NULL DEFAULT 'cafe',
    "themeMode" TEXT NOT NULL DEFAULT 'dark',
    "hideArchived" BOOLEAN NOT NULL DEFAULT false,
    "showConfetti" BOOLEAN NOT NULL DEFAULT true,
    "aiProvider" TEXT NOT NULL DEFAULT 'gemini',
    "aiModel" TEXT,
    "aiKeys" JSONB,
    "focusConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSettings_userId_key" ON "UserSettings"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserSettings_userId_fkey'
  ) THEN
    ALTER TABLE "UserSettings"
      ADD CONSTRAINT "UserSettings_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
