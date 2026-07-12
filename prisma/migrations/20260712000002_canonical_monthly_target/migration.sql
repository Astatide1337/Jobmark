-- UserSettings.monthlyTarget is the canonical monthly activity target.
-- Preserve existing legacy values during the one-way transition.
-- UserSettings is optional, so create the missing rows before removing the
-- legacy User column. The md5 value is a migration-only text id equivalent
-- to Prisma's application-generated cuid for this table's primary key.
INSERT INTO "UserSettings" ("id", "userId", "monthlyTarget", "createdAt", "updatedAt")
SELECT md5(users."id" || ':canonical-monthly-target'), users."id", users."monthlyActivityGoal", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" AS users
WHERE NOT EXISTS (
  SELECT 1 FROM "UserSettings" AS settings WHERE settings."userId" = users."id"
);

UPDATE "UserSettings" AS settings
SET "monthlyTarget" = users."monthlyActivityGoal"
FROM "User" AS users
WHERE settings."userId" = users."id";
