import { prisma } from '@/lib/db';
import { DEFAULT_TIME_ZONE, getCalendarDate, isValidTimeZone } from '@/lib/date-semantics';
import { ContextStrategy, ConversationContext } from './types';

/**
 * GoalContextProvider
 *
 * Why: Injects the specific "Why" and "Deadline" of a user's goal into the prompt.
 * This allows the AI to hold the user accountable and provide advice that
 * aligns with their stated long-term objectives.
 */
export class GoalContextProvider implements ContextStrategy {
  name = 'GoalContext';

  shouldRun(conversation: ConversationContext): boolean {
    return !!conversation.goalId;
  }

  async provide(conversation: ConversationContext, userId: string): Promise<string> {
    if (!conversation.goalId) return '';

    const goal = await prisma.goal.findUnique({
      where: {
        id: conversation.goalId,
        userId: userId,
      },
    });

    if (!goal) return '';

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { timeZone: true },
    });
    const timeZone =
      settings?.timeZone && isValidTimeZone(settings.timeZone)
        ? settings.timeZone
        : DEFAULT_TIME_ZONE;

    return `\n\nReferenced Goal: "${goal.title}"${
      goal.deadline ? `\nDeadline: ${getCalendarDate(goal.deadline, timeZone)}` : ''
    }${goal.why ? `\nWhy it matters: ${goal.why}` : ''}`;
  }
}
