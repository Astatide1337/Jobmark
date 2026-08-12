import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from './db';
import { assertSharedRateLimitAllowed } from './rate-limit';

const enabled = process.env.INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('shared PostgreSQL rate limiting', () => {
  const userId = `rate-limit-test-${Date.now()}`;
  const scope = `test-${Math.random().toString(36).slice(2)}`;

  afterAll(async () => {
    await prisma.rateLimitBucket.deleteMany({ where: { key: `${userId}:${scope}` } });
  });

  it('atomically limits concurrent requests across callers', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () => assertSharedRateLimitAllowed(userId, scope, 2, 'limited'))
    );
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(2);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  });
});
