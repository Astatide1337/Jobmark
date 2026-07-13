import { describe, expect, it } from 'vitest';
import { prepareTurn, type PersistedChatMessage } from './turn-persistence';

const user = (id: string, content: string): PersistedChatMessage => ({ id, role: 'user', content });
const assistant = (id: string, content: string): PersistedChatMessage => ({
  id,
  role: 'assistant',
  content,
});

describe('chat turn persistence', () => {
  it('reuses an initial user turn without creating a duplicate', () => {
    const messages = [user('u1', 'Help me prepare for review')];
    const prepared = prepareTurn(messages, {
      userMessage: messages[0].content,
      reuseExistingUserTurn: true,
    });

    expect(prepared.shouldCreateUserMessage).toBe(false);
    expect(prepared.history).toEqual([]);
  });

  it('regenerates by deleting only the latest assistant response', () => {
    const messages = [user('u1', 'Give me feedback'), assistant('a1', 'Original feedback')];
    const prepared = prepareTurn(messages, {
      userMessage: 'Give me feedback',
      regenerateMessageId: 'a1',
    });

    expect(prepared.shouldCreateUserMessage).toBe(false);
    expect(prepared.assistantIdToDelete).toBe('a1');
    expect(prepared.history).toEqual([]);
  });

  it('rejects a reused turn when the browser state does not match', () => {
    expect(() =>
      prepareTurn([user('u1', 'Stored prompt')], {
        userMessage: 'Different prompt',
        reuseExistingUserTurn: true,
      })
    ).toThrow('does not match');
  });
});
