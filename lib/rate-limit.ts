import 'server-only';

import { prisma } from '@/lib/db';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/** Lightweight per-user guard for bounded application requests. */
export function consumeRateLimitedRequest(
  userId: string,
  scope: string,
  now = Date.now(),
  maxRequests = MAX_REQUESTS_PER_WINDOW
): RateLimitResult {
  const key = `${userId}:${scope}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function assertSharedRateLimitAllowed(
  userId: string,
  scope: string,
  maxRequests = MAX_REQUESTS_PER_WINDOW,
  message = 'Request limit reached'
): Promise<void> {
  const now = new Date();
  const key = `${userId}:${scope}`;
  const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "updatedAt")
    VALUES (${key}, ${now}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE
    SET "count" = CASE
      WHEN "RateLimitBucket"."windowStart" <= ${now} - (${WINDOW_MS} * INTERVAL '1 millisecond') THEN 1
      ELSE "RateLimitBucket"."count" + 1
    END,
    "windowStart" = CASE
      WHEN "RateLimitBucket"."windowStart" <= ${now} - (${WINDOW_MS} * INTERVAL '1 millisecond') THEN ${now}
      ELSE "RateLimitBucket"."windowStart"
    END,
    "updatedAt" = ${now}
    RETURNING "count", "windowStart"
  `;
  const row = rows[0];
  const result = row
    ? {
        allowed: row.count <= maxRequests,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((new Date(row.windowStart).getTime() + WINDOW_MS - now.getTime()) / 1000)
        ),
      }
    : { allowed: false, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
  if (!result.allowed) {
    throw new Error(`${message}. Try again in ${result.retryAfterSeconds} seconds.`);
  }
}
