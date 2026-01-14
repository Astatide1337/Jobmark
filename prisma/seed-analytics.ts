/**
 * Comprehensive Seed Script for Analytics Testing
 * 
 * Run with: npx tsx prisma/seed-analytics.ts
 * 
 * Creates:
 * - 3 test projects with different colors
 * - 6 months of varied activity data (realistic patterns)
 * - Activities with different day-of-week patterns (more on weekdays)
 * - Streak-building data
 */

import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.error("No user found! Please sign in first.");
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.id})`);

  // Create test projects
  const projectsData = [
    { name: "Job Search", color: "#10b981", description: "Tracking job applications and interviews" },
    { name: "Portfolio Website", color: "#8b5cf6", description: "Building personal portfolio" },
    { name: "Learning React", color: "#f59e0b", description: "React tutorials and projects" },
  ];

  const projects: { id: string; name: string }[] = [];

  for (const p of projectsData) {
    let project = await prisma.project.findFirst({
      where: { userId: user.id, name: p.name },
    });

    if (!project) {
      project = await prisma.project.create({
        data: { userId: user.id, ...p },
      });
      console.log(`Created project: ${p.name}`);
    } else {
      console.log(`Using existing project: ${p.name}`);
    }
    projects.push({ id: project.id, name: project.name });
  }

  // Activity content templates
  const activities = {
    "Job Search": [
      "Applied to Senior Developer position at TechCorp",
      "Updated resume with latest project experience",
      "Prepared for technical interview",
      "Completed take-home coding challenge",
      "Had phone screen with recruiter",
      "Researched company culture and values",
      "Sent follow-up email to hiring manager",
      "Practiced system design questions",
      "Reviewed job description and requirements",
      "Connected with employees on LinkedIn",
    ],
    "Portfolio Website": [
      "Designed hero section layout",
      "Implemented responsive navigation",
      "Added project showcase gallery",
      "Optimized images for web",
      "Set up contact form with validation",
      "Added dark mode toggle",
      "Deployed to Vercel",
      "Fixed mobile layout issues",
      "Added animation effects",
      "Wrote project case studies",
    ],
    "Learning React": [
      "Completed hooks tutorial",
      "Built todo app from scratch",
      "Learned about useEffect cleanup",
      "Studied React Query patterns",
      "Practiced state management",
      "Built custom hook for form handling",
      "Reviewed context API usage",
      "Completed Zustand tutorial",
      "Built data fetching component",
      "Studied Server Components",
    ],
  };

  // Delete existing activities (clean slate)
  const deleted = await prisma.activity.deleteMany({
    where: { userId: user.id },
  });
  console.log(`\nDeleted ${deleted.count} existing activities`);

  // Generate 6 months of data
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  let totalCreated = 0;
  const currentDate = new Date(sixMonthsAgo);

  console.log(`\nGenerating activities from ${sixMonthsAgo.toDateString()} to ${now.toDateString()}...`);

  while (currentDate <= now) {
    const dayOfWeek = currentDate.getDay();
    
    // More likely to have activities on weekdays
    const baseChance = dayOfWeek === 0 || dayOfWeek === 6 ? 0.4 : 0.75;
    
    // Random number of activities (0-4) weighted by day
    let numActivities = 0;
    if (Math.random() < baseChance) {
      numActivities = Math.floor(Math.random() * 4) + 1;
      
      // Occasionally have very productive days
      if (Math.random() < 0.1) {
        numActivities = Math.floor(Math.random() * 3) + 5; // 5-7 activities
      }
    }

    for (let i = 0; i < numActivities; i++) {
      // Pick random project
      const project = projects[Math.floor(Math.random() * projects.length)];
      const contentList = activities[project.name as keyof typeof activities];
      const content = contentList[Math.floor(Math.random() * contentList.length)];

      // Random hour during the day
      const hour = Math.floor(Math.random() * 14) + 8; // 8 AM - 10 PM
      const minute = Math.floor(Math.random() * 60);

      const createdAt = new Date(currentDate);
      createdAt.setHours(hour, minute, 0, 0);

      await prisma.activity.create({
        data: {
          userId: user.id,
          projectId: project.id,
          content,
          logDate: new Date(currentDate.toISOString().split('T')[0]),
          createdAt,
        },
      });
      totalCreated++;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Add a streak for recent days (last 7 days guaranteed)
  console.log("\nEnsuring recent streak...");
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const existingToday = await prisma.activity.findFirst({
      where: {
        userId: user.id,
        logDate: {
          gte: new Date(date.toISOString().split('T')[0]),
          lt: new Date(new Date(date).setDate(date.getDate() + 1)),
        },
      },
    });

    if (!existingToday) {
      const project = projects[Math.floor(Math.random() * projects.length)];
      const contentList = activities[project.name as keyof typeof activities];
      const content = contentList[Math.floor(Math.random() * contentList.length)];

      await prisma.activity.create({
        data: {
          userId: user.id,
          projectId: project.id,
          content,
          logDate: new Date(date.toISOString().split('T')[0]),
          createdAt: date,
        },
      });
      totalCreated++;
      console.log(`  Added activity for ${date.toDateString()}`);
    }
  }

  console.log(`\n✅ Created ${totalCreated} activities`);
  console.log("\nRefresh your Insights page to see the data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
