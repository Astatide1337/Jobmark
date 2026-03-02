/**
 * Types for the AI Context Strategy Pattern.
 *
 * Why: A formal interface allows us to modularize how different pieces
 * of data (Projects, Goals, Contacts) are injected into the AI's prompt.
 * This makes the system extensible without bloating the API route.
 */
export interface ConversationContext {
  mode: string;
  projectId: string | null;
  goalId: string | null;
  contactId: string | null;
  reportIds: string[];
}

export interface ContextStrategy {
  name: string;
  shouldRun(conversation: ConversationContext): boolean;
  provide(conversation: ConversationContext, userId: string): Promise<string>;
}
