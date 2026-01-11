/**
 * Test Seed Script for Date/Timezone Edge Cases
 * 
 * Run with: npx tsx prisma/seed-test.ts
 * 
 * This script creates activities with specific timestamps to test:
 * 1. Same-day log (no "For X" label)
 * 2. Backdated log (shows "For X" label)
 * 3. Streak calculation with 3 consecutive days
 * 4. Late-night EST entry (to verify timezone handling)
 */

import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  // Get the first user (you should be logged in)
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.error("No user found! Please sign in first.");
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.id})`);

  // Get or create a test project
  let project = await prisma.project.findFirst({
    where: { userId: user.id, name: "Test Project" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        name: "Test Project",
        color: "#10b981", // Green
        description: "For testing timezone edge cases",
      },
    });
    console.log("Created test project");
  }

  // Current time info (for reference)
  const now = new Date();
  console.log(`\nCurrent time (local): ${now.toLocaleString()}`);
  console.log(`Current time (UTC): ${now.toISOString()}`);
  console.log(`Today (local): ${now.toLocaleDateString("en-CA")}`);

  // Helper to create a date in EST timezone
  // EST is UTC-5, so we add 5 hours to get UTC time
  function estToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
    // Create date as if it's UTC, then adjust for EST offset
    // EST = UTC - 5 hours, so UTC = EST + 5 hours
    return new Date(Date.UTC(year, month - 1, day, hour + 5, minute, 0));
  }

  // Define test cases
  // Based on current time: Jan 11, 2026, ~12:57 AM EST
  const testCases = [
    // CASE 1: Entry created TODAY for TODAY (no "For X" label expected)
    // Created: Jan 11, 12:30 AM EST → logDate: Jan 11
    {
      content: "TEST CASE 1: Same-day entry (Today for Today) - Should NOT show 'For X' label",
      logDate: new Date("2026-01-11"), // Jan 11 (date only)
      createdAt: estToUtc(2026, 1, 11, 0, 30), // Jan 11 @ 12:30 AM EST
    },

    // CASE 2: Entry created TODAY but backdated to Jan 8 (shows "For Jan 8")
    // Created: Jan 11, 12:15 AM EST → logDate: Jan 8
    {
      content: "TEST CASE 2: Backdated entry (Today for Jan 8) - Should show 'For Jan 8'",
      logDate: new Date("2026-01-08"), // Jan 8 (backdated)
      createdAt: estToUtc(2026, 1, 11, 0, 15), // Jan 11 @ 12:15 AM EST
    },

    // CASE 3: Entry created YESTERDAY (Jan 10) for Jan 10 (same day, no label)
    // Created: Jan 10, 3:00 PM EST → logDate: Jan 10
    {
      content: "TEST CASE 3: Yesterday's entry for same day - Should NOT show 'For X' label",
      logDate: new Date("2026-01-10"), // Jan 10
      createdAt: estToUtc(2026, 1, 10, 15, 0), // Jan 10 @ 3:00 PM EST
    },

    // CASE 4: Entry created 2 days ago (Jan 9) for Jan 9 (same day, no label)
    // Created: Jan 9, 9:00 PM EST → logDate: Jan 9
    {
      content: "TEST CASE 4: Friday's entry (Jan 9) - Streak day 1",
      logDate: new Date("2026-01-09"), // Jan 9
      createdAt: estToUtc(2026, 1, 9, 21, 0), // Jan 9 @ 9:00 PM EST (this is Jan 10 2am UTC!)
    },

    // CASE 5: Late-night boundary test
    // Created: Jan 9, 11:30 PM EST (which is Jan 10 4:30 AM UTC)
    // logDate: Jan 9
    // This tests that 11:30 PM EST on Jan 9 shows as Jan 9, not Jan 10
    {
      content: "TEST CASE 5: Late-night EST (11:30 PM Jan 9) - Should group under Jan 9, NOT Jan 10",
      logDate: new Date("2026-01-09"), // Jan 9
      createdAt: estToUtc(2026, 1, 9, 23, 30), // Jan 9 @ 11:30 PM EST = Jan 10 4:30 AM UTC
    },
  ];

  // Delete existing activities for this user (clean slate)
  const deleted = await prisma.activity.deleteMany({
    where: { userId: user.id },
  });
  console.log(`\nDeleted ${deleted.count} existing activities`);

  // Create test activities
  console.log("\nCreating test activities...\n");

  for (const tc of testCases) {
    const activity = await prisma.activity.create({
      data: {
        userId: user.id,
        projectId: project.id,
        content: tc.content,
        logDate: tc.logDate,
        createdAt: tc.createdAt,
      },
    });

    console.log(`Created: ${tc.content.substring(0, 50)}...`);
    console.log(`  logDate: ${tc.logDate.toISOString().split('T')[0]}`);
    console.log(`  createdAt (UTC): ${tc.createdAt.toISOString()}`);
    console.log(`  createdAt (EST): ${tc.createdAt.toLocaleString("en-US", { timeZone: "America/New_York" })}`);
    console.log("");
  }

  console.log("=".repeat(60));
  console.log("EXPECTED RESULTS:");
  console.log("=".repeat(60));
  console.log(`
TIMELINE:
- Today (Jan 11): 2 entries
  - Case 1: NO "For X" label (same day)
  - Case 2: Shows "For Jan 8" label (backdated)

- Yesterday (Jan 10): 1 entry
  - Case 3: NO "For X" label (same day)

- Friday, January 9: 2 entries
  - Case 4: NO "For X" label (same day)  
  - Case 5: NO "For X" label, grouped under Jan 9 (not Jan 10!)

STREAK: Should be 3 days (Jan 9, 10, 11)
  `);

  console.log("\nTest data seeded! Refresh your dashboard to verify.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
