const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export const RATE_LIMITS = {
  authorize: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: 'rl:authz' }, // 10/min/IP
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
  const windowStart = now - config.windowMs;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // First request in window or window expired
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limited
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfter: Math.max(1, retryAfter) };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export async function checkMcpRateLimit(connectionId: string): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfter?: number }> {
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

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
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