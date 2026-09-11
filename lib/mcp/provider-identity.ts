export type McpProviderKey = 'claude' | 'chatgpt' | 'gemini' | `client:${string}`;

/**
 * OAuth metadata that is safe to use for provider identity decisions.
 *
 * clientName is deliberately display-only. OAuth client names are supplied by
 * the remote client and must never decide which provider's connections are
 * grouped or revoked together.
 */
export interface McpProviderIdentity {
  clientId?: string | null;
  clientName?: string | null;
  redirectUris?: readonly string[] | null;
}

const TRUSTED_PROVIDER_HOSTS: Record<
  Exclude<McpProviderKey, `client:${string}`>,
  readonly string[]
> = {
  claude: ['claude.ai', 'claude.com'],
  chatgpt: ['chatgpt.com', 'chat.openai.com'],
  gemini: [
    'gemini.google.com',
    'oauth-redirect.googleusercontent.com',
    'oauth-redirect-test.googleusercontent.com',
    'oauth-redirect-sandbox.googleusercontent.com',
  ],
};

function getHost(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hasTrustedHost(
  provider: Exclude<McpProviderKey, `client:${string}`>,
  values: readonly (string | null | undefined)[]
): boolean {
  const trustedHosts = TRUSTED_PROVIDER_HOSTS[provider];
  return values.some(value => {
    const host = getHost(value);
    return host !== null && trustedHosts.includes(host);
  });
}

function normalizeClientId(clientId: string | null | undefined): string | null {
  const normalized = clientId?.trim().toLowerCase();
  return normalized || null;
}

function getFallbackIdentity(identity: McpProviderIdentity): string {
  const clientId = normalizeClientId(identity.clientId);
  if (clientId) return clientId;

  const redirectUri = identity.redirectUris?.find(uri => uri.trim());
  if (redirectUri) return redirectUri.trim().toLowerCase();

  return 'unknown';
}

export function getMcpProviderKey(identity: McpProviderIdentity): McpProviderKey {
  const clientId = identity.clientId;
  const redirectUris = identity.redirectUris ?? [];

  if (hasTrustedHost('claude', [clientId, ...redirectUris])) return 'claude';
  if (hasTrustedHost('chatgpt', [clientId, ...redirectUris])) return 'chatgpt';
  if (hasTrustedHost('gemini', [clientId, ...redirectUris])) return 'gemini';

  return `client:${getFallbackIdentity(identity)}`;
}

export function getMcpProviderName(identity: McpProviderIdentity): string {
  const key = getMcpProviderKey(identity);
  if (key === 'claude') return 'Claude';
  if (key === 'chatgpt') return 'ChatGPT';
  if (key === 'gemini') return 'Gemini';

  const clientName = identity.clientName?.trim().replace(/\s+/g, ' ');
  if (!clientName || clientName.length > 80) return 'Other assistant';
  if (/^client:/i.test(clientName) || /:\/\//.test(clientName)) return 'Other assistant';
  return clientName;
}
