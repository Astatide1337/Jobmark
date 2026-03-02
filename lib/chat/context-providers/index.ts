/**
 * AI Context Strategy Registry
 *
 * Why: This is the orchestrator for the Strategy Pattern used in the chat API.
 * Instead of having a single monolithic function that knows how to fetch
 * everything, we delegate data gathering to specialized "Providers".
 *
 * Scalability: To add a new type of context (e.g., "Skill Recommendations"),
 * simply create a new provider class and add it to the `strategies` array here.
 */
import { ContextStrategy, ConversationContext } from './types';
import { UserSummaryProvider } from './user-summary-provider';
import { ProjectContextProvider } from './project-provider';
import { GoalContextProvider } from './goal-provider';
import { ContactContextProvider } from './contact-provider';
import { ReportsContextProvider } from './reports-provider';

const strategies: ContextStrategy[] = [
  new UserSummaryProvider(),
  new ProjectContextProvider(),
  new GoalContextProvider(),
  new ContactContextProvider(),
  new ReportsContextProvider(),
];

/**
 * Build a unified context string for the AI using the Strategy Pattern
 */
export async function buildContextString(
  conversation: ConversationContext,
  userId: string
): Promise<string> {
  // Execute all active strategies in parallel
  const contextParts = await Promise.all(
    strategies
      .filter(strategy => strategy.shouldRun(conversation))
      .map(async strategy => {
        try {
          return await strategy.provide(conversation, userId);
        } catch (error) {
          console.error(`[ContextStrategy] Error in ${strategy.name}:`, error);
          return '';
        }
      })
  );

  return contextParts.join('').trim();
}

export * from './types';
