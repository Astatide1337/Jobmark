import { describe, expect, it } from 'vitest';
import { areValidOAuthRedirectUris, isValidOAuthRedirectUri } from './redirect-uri';

describe('OAuth redirect URI validation', () => {
  it('accepts HTTPS callbacks and loopback HTTP callbacks', () => {
    expect(isValidOAuthRedirectUri('https://claude.ai/api/mcp/auth_callback')).toBe(true);
    expect(isValidOAuthRedirectUri('http://localhost:3000/oauth/callback')).toBe(true);
    expect(isValidOAuthRedirectUri('http://127.0.0.1:8787/callback')).toBe(true);
    expect(isValidOAuthRedirectUri('http://[::1]:8787/callback')).toBe(true);
  });

  it('rejects plaintext remote, non-web, credentialed, and fragment callbacks', () => {
    expect(isValidOAuthRedirectUri('http://example.com/callback')).toBe(false);
    expect(isValidOAuthRedirectUri('javascript://example.com/callback')).toBe(false);
    expect(isValidOAuthRedirectUri('https://user:pass@example.com/callback')).toBe(false);
    expect(isValidOAuthRedirectUri('https://example.com/callback#fragment')).toBe(false);
  });

  it('requires every registered callback to pass validation', () => {
    expect(areValidOAuthRedirectUris(['https://example.com/callback'])).toBe(true);
    expect(areValidOAuthRedirectUris([])).toBe(false);
    expect(
      areValidOAuthRedirectUris(['https://example.com/callback', 'http://example.com/callback'])
    ).toBe(false);
  });
});
