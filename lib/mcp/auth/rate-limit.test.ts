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

  it('keys IPv6 clients by their /64 so rotating addresses inside it shares one limit', () => {
    const key = getClientIp(
      request({ 'cf-connecting-ip': '2001:db8:abcd:12:1111:2222:3333:4444' })
    );
    expect(key).toBe('2001:db8:abcd:12::/64');
    expect(getClientIp(request({ 'cf-connecting-ip': '2001:DB8:ABCD:0012::9' }))).toBe(key);
    expect(getClientIp(request({ 'cf-connecting-ip': '2001:db8::1' }))).toBe('2001:db8:0:0::/64');
    expect(getClientIp(request({ 'cf-connecting-ip': '::1' }))).toBe('0:0:0:0::/64');
    expect(getClientIp(request({ 'cf-connecting-ip': 'CA33::15CE:0:0:0:0.0.113.100' }))).toBe(
      'ca33:0:15ce:0::/64'
    );
    expect(
      getClientIp(request({ 'cf-connecting-ip': '::2748:7B7A:1688:0000:ca94:0.0.207.216' }))
    ).toBe('0:2748:7b7a:1688::/64');
  });

  it('keeps IPv4 and IPv4-mapped addresses as the IPv4 address', () => {
    expect(getClientIp(request({ 'cf-connecting-ip': '::ffff:203.0.113.7' }))).toBe('203.0.113.7');
    expect(getClientIp(request({ 'cf-connecting-ip': '0:0:0:0:0:ffff:203.0.113.7' }))).toBe(
      '203.0.113.7'
    );
    expect(getClientIp(request({ 'cf-connecting-ip': '::ffff:cb00:7107' }))).toBe('203.0.113.7');
    expect(getClientIp(request({ 'cf-connecting-ip': '203.0.113.7' }))).toBe('203.0.113.7');
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
