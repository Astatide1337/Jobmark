import { describe, expect, it } from 'vitest';
import { consumeAiRequest } from './ai-rate-limit';

describe('AI request limits', () => {
  it('limits requests per user and scope without affecting another user', () => {
    expect(consumeAiRequest('user-a', 'chat', 1_000, 2).allowed).toBe(true);
    expect(consumeAiRequest('user-a', 'chat', 1_001, 2).allowed).toBe(true);
    expect(consumeAiRequest('user-a', 'chat', 1_002, 2)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(consumeAiRequest('user-b', 'chat', 1_002, 2).allowed).toBe(true);
  });

  it('resets a bucket after its window', () => {
    expect(consumeAiRequest('reset-user', 'dictation', 10_000, 1).allowed).toBe(true);
    expect(consumeAiRequest('reset-user', 'dictation', 70_000, 1).allowed).toBe(true);
  });
});
