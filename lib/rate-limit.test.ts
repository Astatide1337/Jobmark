import { describe, expect, it } from 'vitest';
import { consumeRateLimitedRequest } from './rate-limit';

describe('request limits', () => {
  it('limits requests per user and scope without affecting another user', () => {
    expect(consumeRateLimitedRequest('user-a', 'capture', 1_000, 2).allowed).toBe(true);
    expect(consumeRateLimitedRequest('user-a', 'capture', 1_001, 2).allowed).toBe(true);
    expect(consumeRateLimitedRequest('user-a', 'capture', 1_002, 2)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(consumeRateLimitedRequest('user-b', 'capture', 1_002, 2).allowed).toBe(true);
  });

  it('resets a bucket after its window', () => {
    expect(consumeRateLimitedRequest('reset-user', 'capture', 10_000, 1).allowed).toBe(true);
    expect(consumeRateLimitedRequest('reset-user', 'capture', 70_000, 1).allowed).toBe(true);
  });
});
