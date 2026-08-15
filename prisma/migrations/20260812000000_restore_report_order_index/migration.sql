-- Keep report history queries fast as a user's saved drafts grow.
CREATE INDEX IF NOT EXISTS "Report_userId_createdAt_idx"
ON "Report" ("userId", "createdAt" DESC);
