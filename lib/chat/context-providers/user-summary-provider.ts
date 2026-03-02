import { prisma } from '@/lib/db';
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
    const [user, activityCount, projectCount, goals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      prisma.activity.count({ where: { userId } }),
      prisma.project.count({ where: { userId, archived: false } }),
      prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const currentStreak = await this.calculateStreak(userId);

    let context = `\n\nUser Profile:\n- Name: ${user?.name || 'User'}\n- Total logged activities: ${activityCount}\n- Active projects: ${projectCount}\n- Current streak: ${currentStreak} days\n- Goals set: ${goals.length}`;

    if (_conversation.mode === 'goal-coach' && goals.length > 0) {
      context += `\n\nExisting Goals:\n${goals
        .map(
          goal =>
            `- ${goal.title}${goal.deadline ? ` (due ${goal.deadline.toLocaleDateString()})` : ''}`
        )
        .join('\n')}`;
    }

    return context;
  }

  private async calculateStreak(userId: string): Promise<number> {
    const recentActivities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
      take: 365,
    });

    const activityDateStrings = recentActivities.map(a => a.createdAt.toLocaleDateString('en-CA'));
    const uniqueDates = [...new Set(activityDateStrings)].sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    const latest = uniqueDates[0];

    if (latest < yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const current = new Date(uniqueDates[i - 1] + 'T12:00:00');
      const previous = uniqueDates[i];
      const expectedPrevious = new Date(current.getTime() - 86400000).toISOString().split('T')[0];

      if (previous === expectedPrevious) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
