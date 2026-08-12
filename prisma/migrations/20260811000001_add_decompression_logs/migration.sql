CREATE TABLE "DecompressionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "moodBefore" INTEGER NOT NULL,
    "moodAfter" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecompressionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DecompressionLog_userId_createdAt_idx"
  ON "DecompressionLog"("userId", "createdAt" DESC);

ALTER TABLE "DecompressionLog"
  ADD CONSTRAINT "DecompressionLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
