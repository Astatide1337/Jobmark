import { prisma } from '@/lib/db';
import { buildLockedActivityFilter, getLockedProjectIds } from '@/lib/project-lock';
import {
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';
import { ContextStrategy, ConversationContext } from './types';

/**
 * UserSummaryProvider
 *
 * Why: The AI needs a high-level understanding of who the user is to provide
 * personalized career advice. This provider injects basic stats like total
 * activities, active projects, and current streaks into every conversation.
 *
 * Pattern: This is a "Global" strategy (shouldRun always returns true)
 * because user context is relevant regardless of the specific project or goal selected.
 */
export class UserSummaryProvider implements ContextStrategy {
  name = 'UserSummary';

  shouldRun(): boolean {
    return true; // Always include user summary
  }

  async provide(_conversation: ConversationContext, userId: string): Promise<string> {
    const lockedIds = await getLockedProjectIds(userId);
    const lockedFilter = buildLockedActivityFilter(lockedIds);
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timeZone: true },
    });
    const timeZone =
      settings?.timeZone && isValidTimeZone(settings.timeZone)
        ? settings.timeZone
        : DEFAULT_TIME_ZONE;
    const [user, activityCount, projectCount, goalsCount, goals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      prisma.activity.count({ where: { userId, ...lockedFilter } }),
      prisma.project.count({
        where: {
          userId,
          archived: false,
          ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
        },
      }),
      prisma.goal.count({ where: { userId } }),
      prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const currentStreak = await this.calculateStreak(userId, lockedFilter, timeZone);

    let context = `\n\nUser Profile:\n- Name: ${user?.name || 'User'}\n- Total logged activities: ${activityCount}\n- Active projects: ${projectCount}\n- Current streak: ${currentStreak} days\n- Goals set: ${goalsCount}`;

    if (_conversation.mode === 'goal-coach' && goals.length > 0) {
      context += `\n\nExisting Goals:\n${goals
        .map(
          goal =>
            `- ${goal.title}${goal.deadline ? ` (due ${getCalendarDate(goal.deadline, timeZone)})` : ''}`
        )
        .join('\n')}`;
    }

    return context;
  }

  private async calculateStreak(
    userId: string,
    lockedFilter: Record<string, unknown>,
    timeZone: string
  ): Promise<number> {
    const recentActivities = await prisma.activity.findMany({
      where: { userId, ...lockedFilter },
      orderBy: { logDate: 'desc' },
      select: { logDate: true },
      take: 365,
    });

    const activityDateStrings = recentActivities.map(a => a.logDate.toISOString().slice(0, 10));
    const uniqueDates = [...new Set(activityDateStrings)].sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    const today = getCalendarDate(new Date(), timeZone);
    const yesterday = shiftCalendarDate(today, -1);
    const latest = uniqueDates[0];

    if (latest < yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const previous = uniqueDates[i];
      const expectedPrevious = shiftCalendarDate(uniqueDates[i - 1], -1);

      if (previous === expectedPrevious) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
