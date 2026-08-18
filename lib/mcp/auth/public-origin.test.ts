import { afterEach, describe, expect, it } from 'vitest';
import { getMcpPublicBaseUrl, isAllowedMcpOrigin } from './public-origin';

const originalPublicBaseUrl = process.env.MCP_PUBLIC_BASE_URL;
const originalAllowedOrigins = process.env.MCP_ALLOWED_ORIGINS;

afterEach(() => {
  if (originalPublicBaseUrl === undefined) delete process.env.MCP_PUBLIC_BASE_URL;
  else process.env.MCP_PUBLIC_BASE_URL = originalPublicBaseUrl;
  if (originalAllowedOrigins === undefined) delete process.env.MCP_ALLOWED_ORIGINS;
  else process.env.MCP_ALLOWED_ORIGINS = originalAllowedOrigins;
});

describe('MCP public base URL resolution', () => {
  it('prefers the configured public URL over the container request URL', () => {
    process.env.MCP_PUBLIC_BASE_URL = 'https://jobmark.astatide.com/';

    expect(getMcpPublicBaseUrl(new Request('https://0.0.0.0:3000/mcp'))).toBe(
      'https://jobmark.astatide.com'
    );
  });

  it('uses forwarded host and protocol when no public URL is configured', () => {
    delete process.env.MCP_PUBLIC_BASE_URL;

    const request = new Request('http://0.0.0.0:3000/mcp', {
      headers: {
        host: 'internal:3000',
        'x-forwarded-host': 'jobmark-preview.astatide.com, internal:3000',
        'x-forwarded-proto': 'https, http',
      },
    });

    expect(getMcpPublicBaseUrl(request)).toBe('https://jobmark-preview.astatide.com');
  });

  it('falls back to the request origin for local requests', () => {
    delete process.env.MCP_PUBLIC_BASE_URL;

    expect(getMcpPublicBaseUrl(new Request('http://localhost:3000/mcp'))).toBe(
      'http://localhost:3000'
    );
  });

  it('ignores an invalid configured URL and uses the request origin', () => {
    process.env.MCP_PUBLIC_BASE_URL = 'not-a-url';

    expect(getMcpPublicBaseUrl(new Request('http://localhost:3000/mcp'))).toBe(
      'http://localhost:3000'
    );
  });

  it('allows absent and same-origin requests but rejects untrusted Origins', () => {
    delete process.env.MCP_PUBLIC_BASE_URL;
    const requestUrl = 'https://jobmark.example.com/mcp';

    expect(isAllowedMcpOrigin(new Request(requestUrl))).toBe(true);
    expect(
      isAllowedMcpOrigin(
        new Request(requestUrl, { headers: { origin: 'https://jobmark.example.com' } })
      )
    ).toBe(true);
    expect(
      isAllowedMcpOrigin(
        new Request(requestUrl, { headers: { origin: 'https://attacker.example' } })
      )
    ).toBe(false);
    expect(isAllowedMcpOrigin(new Request(requestUrl, { headers: { origin: 'null' } }))).toBe(
      false
    );
  });

  it('supports an explicit browser Origin allowlist without allowing a wildcard', () => {
    process.env.MCP_ALLOWED_ORIGINS = 'https://assistant.example';
    const request = new Request('https://jobmark.example.com/mcp', {
      headers: { origin: 'https://assistant.example' },
    });

    expect(isAllowedMcpOrigin(request)).toBe(true);
    process.env.MCP_ALLOWED_ORIGINS = '*';
    expect(isAllowedMcpOrigin(request)).toBe(false);
  });
});
