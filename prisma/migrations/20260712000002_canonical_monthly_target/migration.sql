-- UserSettings.monthlyTarget is the canonical monthly activity target.
-- Preserve existing legacy values during the one-way transition.
UPDATE "UserSettings" AS settings
SET "monthlyTarget" = users."monthlyActivityGoal"
FROM "User" AS users
WHERE settings."userId" = users."id";
