/**
 * Main User Dashboard
 *
 * Why: The central landing spot for logged-in users. It provides a
 * "bird's-eye view" of recent wins, current goals, and productivity stats.
 *
 * Logic:
 * - Server-side identity: Read actions derive the tenant from the authenticated
 *   session rather than trusting a caller-supplied user ID.
 * - Dynamic Greeting: Calculates a time-of-day greeting (Morning/Afternoon/Evening)
 *   server-side to ensure it's correct on first paint.
 * - Hydration Safety: Passes the server's calendar date to `StatsCards` so
 *   streaks do not change when a browser uses a different timezone.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getActivities, getActivityStats } from '@/app/actions/activities';
import { getProjects } from '@/app/actions/projects';
import { getUserSettings } from '@/app/actions/settings';
import { QuickCapture, ActivityTimeline } from './dashboard-client';
import {
  GoalMotivator,
  NextBestAction,
  WorkflowStarter,
} from '@/components/dashboard/dashboard-widgets';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DEFAULT_TIME_ZONE, isValidTimeZone } from '@/lib/date-semantics';

import { getGoals } from '@/app/actions/goals';
import { getLockedProjectIds } from '@/lib/project-lock';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  // Get user settings first to know if we should hide archived
  const settings = await getUserSettings();
  const hideArchived = settings?.hideArchived ?? false;
  const lockedProjectIds = await getLockedProjectIds(session.user.id);

  const [activities, stats, projects, goals, reports, activeMcpConnections] = await Promise.all([
    getActivities(20, 0, hideArchived),
    getActivityStats(),
    getProjects('active'),
    getGoals(),
    prisma.report.count({
      where: {
        userId: session.user.id,
        ...(lockedProjectIds.length > 0
          ? { OR: [{ projectId: null }, { projectId: { notIn: lockedProjectIds } }] }
          : {}),
      },
    }),
    prisma.mcpConnection.count({
      where: { userId: session.user.id, revokedAt: null },
    }),
  ]);

  const totalCount = stats.totalCount;

  // Get time-appropriate greeting
  const timeZone =
    settings?.timeZone && isValidTimeZone(settings.timeZone)
      ? settings.timeZone
      : DEFAULT_TIME_ZONE;
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone }).format()
  );
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

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
          <p className="text-muted-foreground">Write down what you did today while it is fresh.</p>
        </div>

        {stats.totalCount < 5 && (
          <WorkflowStarter
            activityCount={stats.totalCount}
            projectCount={projects.length}
            summaryCount={reports}
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
            todayCount={stats.todayCount}
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
            summaries={reports}
            today={stats.today}
          />
        </div>

        <div className="mb-8">
          <NextBestAction
            activityCount={stats.totalCount}
            projectCount={projects.length}
            summaryCount={reports}
            hasMcpConnection={activeMcpConnections > 0}
          />
        </div>

        {/* Activity Timeline */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Recent notes</h2>
            <span className="text-muted-foreground text-sm">
              Notes this week:{' '}
              <span className="text-foreground font-medium">
                {stats.thisWeek}/{stats.weeklyGoal}
              </span>
            </span>
          </div>
          <ActivityTimeline
            key={activities.map(activity => activity.id).join('|') || `empty-${totalCount}`}
            activities={activities}
            totalCount={totalCount}
            initialTimeZone={timeZone}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
