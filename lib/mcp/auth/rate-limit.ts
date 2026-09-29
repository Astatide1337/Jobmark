import 'server-only';

import { isIPv6 } from 'node:net';

import { prisma } from '@/lib/db';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export const RATE_LIMITS = {
  authorize: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: 'rl:authz' }, // 10/min/IP
  register: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: 'rl:register' }, // 10/min/IP
  token: { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'rl:token' }, // 30/min/IP
  introspect: { windowMs: 60 * 1000, maxRequests: 120, keyPrefix: 'rl:introspect' }, // 120/min/IP
  mcp: { windowMs: 60 * 1000, maxRequests: 120, keyPrefix: 'rl:mcp' }, // 120/min/connection
  mcpBurst: { windowMs: 1000, maxRequests: 20, keyPrefix: 'rl:mcp:burst' }, // burst 20/sec
} as const;

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfter?: number }> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const nowDate = new Date(now);
  const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "updatedAt")
    VALUES (${key}, ${nowDate}, 1, ${nowDate})
    ON CONFLICT ("key") DO UPDATE
    SET "count" = CASE
      WHEN "RateLimitBucket"."windowStart" <= ${nowDate} - (${config.windowMs} * INTERVAL '1 millisecond') THEN 1
      ELSE "RateLimitBucket"."count" + 1
    END,
    "windowStart" = CASE
      WHEN "RateLimitBucket"."windowStart" <= ${nowDate} - (${config.windowMs} * INTERVAL '1 millisecond') THEN ${nowDate}
      ELSE "RateLimitBucket"."windowStart"
    END,
    "updatedAt" = ${nowDate}
    RETURNING "count", "windowStart"
  `;

  const row = rows[0];
  if (!row) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + config.windowMs,
      retryAfter: Math.ceil(config.windowMs / 1000),
    };
  }

  const windowStart = new Date(row.windowStart).getTime();
  const resetAt = windowStart + config.windowMs;
  const allowed = row.count <= config.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - row.count),
    resetAt,
    ...(allowed ? {} : { retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)) }),
  };
}

export async function checkMcpRateLimit(
  connectionId: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfter?: number }> {
  // Check both sustained and burst limits
  const [sustained, burst] = await Promise.all([
    checkRateLimit(connectionId, RATE_LIMITS.mcp),
    checkRateLimit(connectionId, RATE_LIMITS.mcpBurst),
  ]);

  if (!sustained.allowed) return sustained;
  if (!burst.allowed) return burst;

  return {
    allowed: true,
    remaining: Math.min(sustained.remaining, burst.remaining),
    resetAt: Math.min(sustained.resetAt, burst.resetAt),
  };
}

/**
 * The client key for per-IP rate limits. An IPv6 client usually controls a whole
 * /64, so every address in it shares one key; IPv4 addresses are used as-is.
 */
export function getClientIp(request: Request): string {
  return rateLimitAddress(clientAddress(request));
}

function clientAddress(request: Request): string {
  // Cloudflare sets CF-Connecting-IP itself; the first X-Forwarded-For entry is whatever the client sent.
  const cloudflare = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflare) return cloudflare;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function rateLimitAddress(address: string): string {
  const withoutZone = address.split('%')[0];
  if (!isIPv6(withoutZone)) return address;

  const mappedIPv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(withoutZone);
  if (mappedIPv4) return mappedIPv4[1];

  const [head, tail = ''] = withoutZone.toLowerCase().split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = withoutZone.includes('::') && tail ? tail.split(':') : [];
  const groups = withoutZone.includes('::')
    ? [...headGroups, ...Array(8 - headGroups.length - tailGroups.length).fill('0'), ...tailGroups]
    : headGroups;
  return `${groups
    .slice(0, 4)
    .map(group => parseInt(group, 16).toString(16))
    .join(':')}::/64`;
}

export function createRateLimitHeaders(
  result: { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number },
  config: RateLimitConfig
): HeadersInit {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}
