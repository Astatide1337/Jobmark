import { prisma } from '@/lib/db';
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

    return `\n\nReferenced Goal: "${goal.title}"${
      goal.deadline ? `\nDeadline: ${goal.deadline.toLocaleDateString()}` : ''
    }${goal.why ? `\nWhy it matters: ${goal.why}` : ''}`;
  }
}
