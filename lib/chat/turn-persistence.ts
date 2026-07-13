import 'server-only';

export type PersistedChatMessage = {
  id: string;
  role: string;
  content: string;
};

export type TurnRequest = {
  userMessage: string;
  regenerateMessageId?: string;
  reuseExistingUserTurn?: boolean;
};

export type PreparedTurn = {
  history: PersistedChatMessage[];
  assistantIdToDelete?: string;
  existingUserIdToClaim?: string;
  shouldCreateUserMessage: boolean;
};

/**
 * Decide how a stream request changes persisted chat history.
 * Initial auto-start reuses an already-persisted user turn; regeneration
 * removes only the latest assistant response; normal sends create one user
 * turn. Keeping this decision pure makes duplicate-history regressions easy
 * to test without requiring a provider or database.
 */
export function prepareTurn(messages: PersistedChatMessage[], request: TurnRequest): PreparedTurn {
  if (request.regenerateMessageId) {
    const assistantIndex = messages.findIndex(
      message => message.id === request.regenerateMessageId
    );
    const previousUser = assistantIndex > 0 ? messages[assistantIndex - 1] : undefined;
    if (
      assistantIndex < 0 ||
      assistantIndex !== messages.length - 1 ||
      messages[assistantIndex]?.role !== 'assistant' ||
      previousUser?.role !== 'user' ||
      previousUser.content !== request.userMessage
    ) {
      throw new Error('Only the latest assistant response can be regenerated');
    }
    return {
      history: messages.slice(0, assistantIndex - 1),
      assistantIdToDelete: request.regenerateMessageId,
      shouldCreateUserMessage: false,
    };
  }

  if (request.reuseExistingUserTurn) {
    const existingUser = messages.at(-1);
    if (existingUser?.role !== 'user' || existingUser.content !== request.userMessage) {
      throw new Error('Initial user turn does not match conversation state');
    }
    return {
      history: messages.slice(0, -1),
      existingUserIdToClaim: existingUser.id,
      shouldCreateUserMessage: false,
    };
  }

  return { history: messages, shouldCreateUserMessage: true };
}
