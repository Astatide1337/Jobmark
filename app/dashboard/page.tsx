import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivities, getActivityStats, getActivityCount } from "@/app/actions/activities";
import { getProjects } from "@/app/actions/projects";
import { getUserSettings } from "@/app/actions/settings";
import { QuickCapture } from "@/components/activity/quick-capture";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { GoalMotivator } from "@/components/dashboard/goal-motivator";

import { getGoals } from "@/app/actions/goals";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get user settings first to know if we should hide archived
  const settings = await getUserSettings();
  const hideArchived = settings?.hideArchived ?? false;

  const [activities, stats, projects, totalCount, goals] = await Promise.all([
    getActivities(20, 0, hideArchived),
    getActivityStats(),
    getProjects(),
    getActivityCount(),
    getGoals(),
  ]);

  // Get time-appropriate greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          showDate
        />
      }
    >
      <div className="max-w-(--container-content) mx-auto w-full">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {greeting}, {session.user.name?.split(" ")[0]}.
          </h1>
          <p className="text-muted-foreground">
            Ready to capture your wins?
          </p>
        </div>

        {/* Goal Motivator (Carousel) */}
        <GoalMotivator goals={goals} settings={settings} />

        {/* Quick Capture */}
        <div className="mb-8">
          <QuickCapture 
            projects={projects.map(p => ({ id: p.id, name: p.name, color: p.color, archived: p.archived }))} 
            todayCount={stats.today}
            dailyGoal={stats.dailyGoal}
          />
        </div>

        {/* Stats */}
        <div className="mb-8">
          <StatsCards
            thisMonth={stats.thisMonth}
            dates={stats.recentDates}
            projects={stats.projects}
            monthlyGoal={stats.monthlyGoal}
          />
        </div>

        {/* Activity Timeline */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <span className="text-sm text-muted-foreground">
              This week: <span className="text-foreground font-medium">{stats.thisWeek}/{stats.weeklyGoal}</span>
            </span>
          </div>
          <ActivityTimeline activities={activities} totalCount={totalCount} />
        </div>
      </div>
    </DashboardShell>
  );
}
