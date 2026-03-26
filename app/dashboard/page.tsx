/**
 * Main User Dashboard
 *
 * Why: The central landing spot for logged-in users. It provides a
 * "bird's-eye view" of recent wins, current goals, and productivity stats.
 *
 * Logic:
 * - Session Lifting: Fetches the session once and passes `userId` to
 *   all subsequent data calls to avoid DB waterfalls.
 * - Dynamic Greeting: Calculates a time-of-day greeting (Morning/Afternoon/Evening)
 *   server-side to ensure it's correct on first paint.
 * - Hydration Safety: Passes `serverDate` to the `StatsCards` to prevent
 *   mismatches between server-rendered and client-calculated streaks.
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getActivities, getActivityStats } from '@/app/actions/activities';
import { getProjects } from '@/app/actions/projects';
import { getUserSettings } from '@/app/actions/settings';
import {
  QuickCapture,
  ActivityTimeline,
  GoalMotivator,
  WorkflowStarter,
  NextBestAction,
} from './dashboard-client';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

import { getGoals } from '@/app/actions/goals';
import { getReports } from '@/app/actions/reports';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Get user settings first to know if we should hide archived
  const settings = await getUserSettings(userId);
  const hideArchived = settings?.hideArchived ?? false;

  const [activities, stats, projects, goals, reports] = await Promise.all([
    getActivities(20, 0, hideArchived, userId),
    getActivityStats(userId),
    getProjects('active', userId),
    getGoals(userId),
    getReports(userId),
  ]);

  const totalCount = stats.totalCount;

  // Get time-appropriate greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardShell
      header={
        <DashboardHeader userName={session.user.name} userImage={session.user.image} showDate />
      }
    >
      <div className="mx-auto w-full max-w-(--container-content)">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-foreground mb-1 text-2xl font-bold">
            {greeting}, {session.user.name?.split(' ')[0]}.
          </h1>
          <p className="text-muted-foreground">Document today&apos;s work while it is still fresh.</p>
        </div>

        {stats.totalCount < 5 && (
          <WorkflowStarter
            activityCount={stats.totalCount}
            projectCount={projects.length}
            summaryCount={reports.length}
          />
        )}

        {/* Goal Motivator (Carousel) */}
        <GoalMotivator goals={goals} settings={settings} />

        {/* Quick Capture */}
        <div className="mb-8">
          <QuickCapture
            projects={projects.map(
              (p: { id: string; name: string; color: string; archived?: boolean }) => ({
                id: p.id,
                name: p.name,
                color: p.color,
                archived: p.archived,
              })
            )}
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
            summaries={reports.length}
            serverDate={new Date().toISOString()}
          />
        </div>

        <div className="mb-8">
          <NextBestAction
            activityCount={stats.totalCount}
            projectCount={projects.length}
            summaryCount={reports.length}
          />
        </div>

        {/* Activity Timeline */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Recent Activity</h2>
            <span className="text-muted-foreground text-sm">
              Evidence captured this week:{' '}
              <span className="text-foreground font-medium">
                {stats.thisWeek}/{stats.weeklyGoal}
              </span>
            </span>
          </div>
          <ActivityTimeline activities={activities} totalCount={totalCount} />
        </div>
      </div>
    </DashboardShell>
  );
}
