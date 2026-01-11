import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivities, getActivityStats, getActivityCount } from "@/app/actions/activities";
import { getProjects } from "@/app/actions/projects";
import { QuickCapture } from "@/components/activity/quick-capture";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [activities, stats, projects, totalCount] = await Promise.all([
    getActivities(20),
    getActivityStats(),
    getProjects(),
    getActivityCount(),
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
      <div className="max-w-4xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {greeting}, {session.user.name?.split(" ")[0]}.
          </h1>
          <p className="text-muted-foreground">
            Ready to capture your wins?
          </p>
        </div>

        {/* Quick Capture */}
        <div className="mb-8">
          <QuickCapture projects={projects.map(p => ({ id: p.id, name: p.name, color: p.color }))} />
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
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <ActivityTimeline activities={activities} totalCount={totalCount} />
        </div>
      </div>
    </DashboardShell>
  );
}

