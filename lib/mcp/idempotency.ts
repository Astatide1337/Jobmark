import { prisma } from '@/lib/db';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_POLL_ATTEMPTS = 25;
const PENDING_POLL_INTERVAL_MS = 200;

export type IdempotencyClaim =
  | { kind: 'owner' }
  | { kind: 'cached'; result: unknown }
  | { kind: 'pending' };

type IdempotencyKey = {
  connectionId: string;
  toolName: string;
  requestKey: string;
};

function whereFor(key: IdempotencyKey) {
  return { connectionId_toolName_requestKey: key };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function claimIdempotency(key: IdempotencyKey): Promise<IdempotencyClaim> {
  try {
    await prisma.mcpIdempotency.create({
      data: {
        ...key,
        status: 'pending',
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    });
    return { kind: 'owner' };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  for (let attempt = 0; attempt < PENDING_POLL_ATTEMPTS; attempt += 1) {
    const record = await prisma.mcpIdempotency.findUnique({ where: whereFor(key) });

    if (!record) {
      return claimIdempotency(key);
    }

    if (record.expiresAt <= new Date()) {
      await prisma.mcpIdempotency.deleteMany({
        where: { ...key, expiresAt: { lte: new Date() } },
      });
      return claimIdempotency(key);
    }

    if (record.status === 'completed') {
      return { kind: 'cached', result: record.resultJson };
    }

    if (record.status === 'failed') {
      await prisma.mcpIdempotency.deleteMany({ where: key });
      return claimIdempotency(key);
    }

    if (attempt < PENDING_POLL_ATTEMPTS - 1) {
      await wait(PENDING_POLL_INTERVAL_MS);
    }
  }

  return { kind: 'pending' };
}

export async function completeIdempotency(key: IdempotencyKey, result: unknown): Promise<void> {
  await prisma.mcpIdempotency.update({
    where: whereFor(key),
    data: { status: 'completed', resultJson: result as never },
  });
}

export async function releaseIdempotency(key: IdempotencyKey): Promise<void> {
  await prisma.mcpIdempotency.deleteMany({ where: { ...key, status: 'pending' } });
}
