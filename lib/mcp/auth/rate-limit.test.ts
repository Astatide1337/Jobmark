import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import { getClientIp, RATE_LIMITS } from './rate-limit';

function request(headers: Record<string, string>): Request {
  return new Request('https://jobmark.example/api/auth/mcp/token', { headers });
}

describe('getClientIp', () => {
  it('uses the address Cloudflare observed instead of a client-supplied X-Forwarded-For', () => {
    expect(
      getClientIp(
        request({
          'cf-connecting-ip': '203.0.113.7',
          'x-forwarded-for': '198.51.100.1, 203.0.113.7',
        })
      )
    ).toBe('203.0.113.7');
  });

  it('falls back to X-Forwarded-For without Cloudflare', () => {
    expect(getClientIp(request({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe(
      '198.51.100.1'
    );
  });

  it('falls back to unknown without any address header', () => {
    expect(getClientIp(request({}))).toBe('unknown');
  });
});

describe('RATE_LIMITS', () => {
  it('keeps client registration out of the authorize bucket', () => {
    expect(RATE_LIMITS.register.keyPrefix).not.toBe(RATE_LIMITS.authorize.keyPrefix);
  });
});
