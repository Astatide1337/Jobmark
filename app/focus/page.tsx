import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DecompressionWizard } from "@/components/focus/decompression-wizard";
import { useUI } from "@/components/providers/ui-provider";

export const metadata = {
  title: "Decompress | JobMark",
  description: "End your day with intention.",
};

export default async function FocusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // 1. Get today's activity stats
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const todaysActivities = await prisma.activity.findMany({
    where: {
      userId: session.user.id,
      logDate: {
        gte: startOfDay,
      },
    },
    include: {
      project: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const dailyCount = todaysActivities.length;
  // Get the most recent project name if it exists
  const lastProjectName = todaysActivities[0]?.project?.name || null;

  // 2. Get user's primary goal
  // First try UserSettings, then fallback to the first Goal
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  let primaryGoal = userSettings?.primaryGoal;

  if (!primaryGoal) {
    const firstGoal = await prisma.goal.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    primaryGoal = firstGoal?.title;
  }

  // Fallback if absolutely nothing is found
  const finalGoal = primaryGoal || "peace of mind";
  
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#1a1412] text-[#f5f0e8] relative overflow-y-auto py-12">
       {/* Background Film Grain Overlay would ideally be here or globally applied */}
       <DecompressionWizard 
          dailyCount={dailyCount}
          lastProjectName={lastProjectName}
          userGoal={finalGoal}
       />
    </main>
  );
}
