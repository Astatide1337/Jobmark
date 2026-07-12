import 'server-only';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

export type AiRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/** Lightweight per-user guard for provider-costing requests. */
export function consumeAiRequest(
  userId: string,
  scope: string,
  now = Date.now(),
  maxRequests = MAX_REQUESTS_PER_WINDOW
): AiRateLimitResult {
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

export function assertAiRequestAllowed(userId: string, scope: string): void {
  const result = consumeAiRequest(userId, scope);
  if (!result.allowed) {
    throw new Error(`AI request limit reached. Try again in ${result.retryAfterSeconds} seconds.`);
  }
}
