import { describe, expect, it } from 'vitest';
import { getMcpProviderKey, getMcpProviderName } from './provider-identity';

describe('MCP provider identity', () => {
  it('classifies trusted client identifiers and redirect hosts', () => {
    expect(
      getMcpProviderKey({
        clientId: 'https://claude.ai/api/oauth/mcp-oauth-client-metadata',
        clientName: 'untrusted display name',
      })
    ).toBe('claude');
    expect(
      getMcpProviderKey({
        clientId: 'opaque-chatgpt-client',
        redirectUris: ['https://chatgpt.com/connector_platform_oauth_redirect'],
      })
    ).toBe('chatgpt');
    expect(
      getMcpProviderKey({
        clientId: 'opaque-gemini-client',
        redirectUris: [
          'https://oauth-redirect.googleusercontent.com/r/user_bound_custom-mcp-jobmark',
        ],
      })
    ).toBe('gemini');
    expect(
      getMcpProviderName({
        clientId: 'opaque-gemini-client',
        redirectUris: [
          'https://oauth-redirect-sandbox.googleusercontent.com/r/user_bound_custom-mcp-jobmark',
        ],
        clientName: 'Google',
      })
    ).toBe('Gemini');
  });

  it('does not classify from attacker-controlled display names or lookalike hosts', () => {
    expect(getMcpProviderKey({ clientId: 'opaque-1', clientName: 'Gemini' })).toBe(
      'client:opaque-1'
    );
    expect(
      getMcpProviderKey({
        clientId: 'opaque-2',
        clientName: 'Claude',
        redirectUris: ['https://claude.ai.attacker.example/callback'],
      })
    ).toBe('client:opaque-2');
  });

  it('keeps unknown clients separate by OAuth client identifier', () => {
    expect(getMcpProviderKey({ clientId: 'Acme-Client' })).toBe('client:acme-client');
  });

  it('keeps opaque client identifiers out of human-facing names', () => {
    expect(getMcpProviderName({ clientId: 'opaque-1', clientName: 'client:opaque-1' })).toBe(
      'Other assistant'
    );
    expect(
      getMcpProviderName({ clientId: 'opaque-2', clientName: 'https://example.com/app' })
    ).toBe('Other assistant');
    expect(getMcpProviderName({ clientId: 'opaque-3', clientName: '  Acme Assistant  ' })).toBe(
      'Acme Assistant'
    );
  });
});
