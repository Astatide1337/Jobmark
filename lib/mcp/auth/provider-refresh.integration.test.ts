import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createRefreshToken, hashToken, rotateRefreshToken } from './provider';

const integrationEnabled = process.env.INTEGRATION_TESTS === '1';

describe.skipIf(!integrationEnabled)('PostgreSQL OAuth refresh rotation', () => {
  const clientId = `rotation-test-${randomUUID()}`;
  const userId = randomUUID();

  beforeAll(async () => {
    await prisma.oAuthAccessToken.deleteMany({ where: { clientId } });
    await prisma.oAuthRefreshToken.deleteMany({ where: { clientId } });
  });

  afterAll(async () => {
    await prisma.oAuthAccessToken.deleteMany({ where: { clientId } });
    await prisma.oAuthRefreshToken.deleteMany({ where: { clientId } });
  });

  it('does not leave a usable successor after concurrent reuse of one refresh token', async () => {
    const initial = await createRefreshToken(clientId, userId, 'jobmark:read');
    const original = await prisma.oAuthRefreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(initial.token) },
    });

    const results = await Promise.all([
      rotateRefreshToken(initial.token, clientId, userId, 'jobmark:read'),
      rotateRefreshToken(initial.token, clientId, userId, 'jobmark:read'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter(result => result === null)).toHaveLength(1);

    const family = await prisma.oAuthRefreshToken.findMany({
      where: { familyId: original.familyId },
    });
    expect(family).toHaveLength(2);
    expect(family.every(token => token.consumedAt !== null)).toBe(true);
    expect(await prisma.oAuthAccessToken.count({ where: { clientId, revokedAt: null } })).toBe(1);
  });
});
