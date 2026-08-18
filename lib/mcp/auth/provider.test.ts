import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { getWellKnownAuthServer, getWellKnownProtectedResource } from './provider';

const mocks = vi.hoisted(() => ({
  accessTokenFindUnique: vi.fn(),
  clientFindUnique: vi.fn(),
  clientCreate: vi.fn(),
  authCodeFindUnique: vi.fn(),
  authCodeDelete: vi.fn(),
  authCodeDeleteMany: vi.fn(),
  consentDeleteMany: vi.fn(),
  connectionFindMany: vi.fn(),
  connectionUpdate: vi.fn(),
  connectionUpdateMany: vi.fn(),
  connectionCreate: vi.fn(),
  accessTokenUpdateMany: vi.fn(),
  refreshTokenUpdateMany: vi.fn(),
  transaction: vi.fn(),
  resolve4: vi.fn(),
  resolve6: vi.fn(),
  httpsRequest: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    oAuthAccessToken: {
      findUnique: mocks.accessTokenFindUnique,
      updateMany: mocks.accessTokenUpdateMany,
    },
    oAuthRefreshToken: { updateMany: mocks.refreshTokenUpdateMany },
    oAuthClient: { findUnique: mocks.clientFindUnique, create: mocks.clientCreate },
    oAuthAuthorizationCode: {
      findUnique: mocks.authCodeFindUnique,
      delete: mocks.authCodeDelete,
      deleteMany: mocks.authCodeDeleteMany,
    },
    oAuthConsent: { deleteMany: mocks.consentDeleteMany },
    mcpConnection: {
      findMany: mocks.connectionFindMany,
      update: mocks.connectionUpdate,
      updateMany: mocks.connectionUpdateMany,
      create: mocks.connectionCreate,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('node:dns/promises', () => ({
  resolve4: mocks.resolve4,
  resolve6: mocks.resolve6,
}));

vi.mock('node:https', () => ({
  request: mocks.httpsRequest,
}));

import {
  consumeAuthorizationCode,
  ensureMcpConnection,
  hashPKCE,
  hashToken,
  resolveClientId,
  validateAccessToken,
  validateClient,
} from './provider';

describe('MCP OAuth discovery', () => {
  const baseUrl = 'https://jobmark.example.com';

  it('advertises dynamic client registration', async () => {
    const metadata = await getWellKnownAuthServer(baseUrl);

    expect(metadata.registration_endpoint).toBe(
      'https://jobmark.example.com/api/auth/mcp/register'
    );
    expect(metadata.authorization_endpoint).toBe(
      'https://jobmark.example.com/api/auth/mcp/authorize'
    );
    expect(metadata.code_challenge_methods_supported).toContain('S256');
  });

  it('points clients to the Jobmark MCP resource', async () => {
    const metadata = await getWellKnownProtectedResource(baseUrl);

    expect(metadata.resource).toBe('https://jobmark.example.com/mcp');
    expect(metadata.authorization_servers).toEqual([baseUrl]);
  });
});

describe('MCP OAuth token persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockResolvedValue([]);
  });

  it('validates an opaque access token from its persisted hash across instances', async () => {
    const token = 'opaque-access-token';
    const createdAt = new Date(Date.now() - 60_000);
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    mocks.accessTokenFindUnique.mockResolvedValue({
      userId: 'user-1',
      clientId: 'client-1',
      scope: 'jobmark:read offline_access',
      createdAt,
      expiresAt,
      revokedAt: null,
    });

    await expect(validateAccessToken(token)).resolves.toEqual({
      userId: 'user-1',
      clientId: 'client-1',
      scope: 'jobmark:read offline_access',
      iat: Math.floor(createdAt.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    });
    expect(mocks.accessTokenFindUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(token) },
    });
  });

  it('creates a connection when an OAuth client has no active connection', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      id: 'oauth-client-cuid',
      clientId: 'public-client-id',
      clientName: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    });
    mocks.connectionFindMany.mockResolvedValue([]);

    await ensureMcpConnection('public-client-id', 'user-1', 'jobmark:read offline_access');

    expect(mocks.connectionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        oauthClientId: 'oauth-client-cuid',
        clientName: 'Claude',
        scopes: ['jobmark:read', 'offline_access'],
      }),
    });
  });

  it('reactivates and updates an existing connection during token exchange', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      id: 'oauth-client-cuid',
      clientId: 'public-client-id',
      clientName: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    });
    mocks.connectionFindMany.mockResolvedValue([
      {
        id: 'connection-1',
        oauthClientId: 'oauth-client-cuid',
        clientName: 'Claude',
        oauthClient: {
          clientId: 'public-client-id',
          clientName: 'Claude',
          redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
        },
      },
    ]);

    await ensureMcpConnection('public-client-id', 'user-1', 'jobmark:read jobmark:write');

    expect(mocks.connectionUpdate).toHaveBeenCalledWith({
      where: { id: 'connection-1' },
      data: expect.objectContaining({
        oauthClientId: 'oauth-client-cuid',
        clientName: 'Claude',
        scopes: ['jobmark:read', 'jobmark:write'],
        revokedAt: null,
      }),
    });
  });

  it('revokes prior tokens when a client reauthorizes with a fresh scope grant', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      id: 'oauth-client-cuid',
      clientId: 'public-client-id',
      clientName: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    });
    mocks.connectionFindMany.mockResolvedValue([
      {
        id: 'connection-1',
        oauthClientId: 'oauth-client-cuid',
        clientName: 'Claude',
        oauthClient: {
          clientId: 'public-client-id',
          clientName: 'Claude',
          redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
        },
      },
    ]);

    await ensureMcpConnection('public-client-id', 'user-1', 'jobmark:read', {
      revokeExistingTokens: true,
    });

    expect(mocks.accessTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', clientId: { in: ['public-client-id'] }, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', clientId: { in: ['public-client-id'] }, consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });
    expect(mocks.authCodeDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', clientId: { in: ['public-client-id'] } },
    });
  });

  it('collapses duplicate provider registrations and revokes replaced tokens', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      id: 'gemini-client-new',
      clientId: 'gemini-public-new',
      clientName: 'Google',
      redirectUris: ['https://gemini.google.com/mcp/oauth/callback'],
    });
    mocks.connectionFindMany.mockResolvedValue([
      {
        id: 'gemini-connection-2',
        oauthClientId: 'gemini-client-old-2',
        clientName: 'Google',
        oauthClient: {
          clientId: 'gemini-public-old-2',
          clientName: 'Google',
          redirectUris: ['https://gemini.google.com/mcp/oauth/callback'],
        },
      },
      {
        id: 'gemini-connection-1',
        oauthClientId: 'gemini-client-old-1',
        clientName: 'Gemini',
        oauthClient: {
          clientId: 'gemini-public-old-1',
          clientName: 'Gemini',
          redirectUris: ['https://gemini.google.com/mcp/oauth/callback'],
        },
      },
    ]);

    await ensureMcpConnection('gemini-public-new', 'user-1', 'jobmark:read offline_access');

    expect(mocks.connectionUpdate).toHaveBeenCalledWith({
      where: { id: 'gemini-connection-2' },
      data: expect.objectContaining({ oauthClientId: 'gemini-client-new', clientName: 'Google' }),
    });
    expect(mocks.connectionUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['gemini-connection-1'] }, userId: 'user-1' },
      data: expect.objectContaining({ revokedAt: expect.any(Date), vaultUnlockedUntil: null }),
    });
    expect(mocks.accessTokenUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        clientId: { in: ['gemini-public-old-2', 'gemini-public-old-1'] },
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        clientId: { in: ['gemini-public-old-2', 'gemini-public-old-1'] },
        consumedAt: null,
      },
      data: { consumedAt: expect.any(Date) },
    });
    expect(mocks.authCodeDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        clientId: { in: ['gemini-public-old-2', 'gemini-public-old-1'] },
      },
    });
    expect(mocks.consentDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        clientId: { in: ['gemini-public-old-2', 'gemini-public-old-1'] },
      },
    });
  });
});

describe('MCP OAuth client authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientFindUnique.mockResolvedValue({
      clientId: 'confidential-client',
      clientSecretHash: hashToken('correct-secret'),
      redirectUris: ['https://client.example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      scope: 'jobmark:read',
      tokenEndpointAuthMethod: 'client_secret_post',
      clientName: 'Confidential client',
    });
  });

  it('rejects absent and incorrect secrets for confidential clients', async () => {
    await expect(validateClient('confidential-client')).resolves.toBeNull();
    await expect(validateClient('confidential-client', 'wrong-secret')).resolves.toBeNull();
  });

  it('accepts the configured secret for confidential clients', async () => {
    await expect(validateClient('confidential-client', 'correct-secret')).resolves.toMatchObject({
      client_id: 'confidential-client',
      token_endpoint_auth_method: 'client_secret_post',
    });
  });
});

describe('MCP OAuth authorization-code PKCE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCodeFindUnique.mockResolvedValue({
      code: hashToken('authorization-code'),
      clientId: 'public-client',
      userId: 'user-1',
      redirectUri: 'https://client.example.com/callback',
      codeChallenge: hashPKCE('correct-verifier'),
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read',
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  it('requires and verifies the PKCE verifier before consuming a code', async () => {
    await expect(consumeAuthorizationCode('authorization-code')).resolves.toBeNull();
    await expect(
      consumeAuthorizationCode('authorization-code', 'wrong-verifier')
    ).resolves.toBeNull();
    expect(mocks.authCodeDeleteMany).not.toHaveBeenCalled();

    mocks.authCodeDeleteMany.mockResolvedValue({ count: 1 });

    await expect(
      consumeAuthorizationCode('authorization-code', 'correct-verifier')
    ).resolves.toMatchObject({
      client_id: 'public-client',
      code_challenge: hashPKCE('correct-verifier'),
    });
    expect(mocks.authCodeDeleteMany).toHaveBeenCalledWith({
      where: { code: hashToken('authorization-code') },
    });
  });
});

describe('CIDDD client metadata SSRF and response limits', () => {
  const claudeMetadataUrl = 'https://claude.ai/oauth/mcp-oauth-client-metadata';
  const metadata = {
    client_id: claudeMetadataUrl,
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    client_name: 'Claude',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'jobmark:read jobmark:write',
    token_endpoint_auth_method: 'none',
  };
  const responseQueue: Array<{
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }> = [];
  type LookupMock = (
    hostname: string,
    options: object,
    callback: (
      error: Error | null,
      address: string | Array<{ address: string; family?: number }>
    ) => void
  ) => void;
  type ResponseCallback = (
    response: EventEmitter & {
      statusCode: number;
      headers: Record<string, string>;
      destroy: (error?: Error) => void;
    }
  ) => void;

  function queueResponse(response: Partial<(typeof responseQueue)[number]> = {}) {
    responseQueue.push({
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(metadata),
      ...response,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    responseQueue.length = 0;
    mocks.resolve4.mockResolvedValue(['104.18.32.47']);
    mocks.resolve6.mockResolvedValue([]);
    mocks.clientFindUnique.mockResolvedValue({
      clientId: claudeMetadataUrl,
      clientName: 'Claude',
      redirectUris: metadata.redirect_uris,
      grantTypes: metadata.grant_types,
      responseTypes: metadata.response_types,
      scope: metadata.scope,
      tokenEndpointAuthMethod: metadata.token_endpoint_auth_method,
    });
    queueResponse();
    mocks.httpsRequest.mockImplementation(
      (_url: URL, _options: object, callback: ResponseCallback) => {
        const request = new EventEmitter() as EventEmitter & {
          destroy: ReturnType<typeof vi.fn>;
          end: () => void;
        };
        request.destroy = vi.fn();
        request.end = () => {
          const next = responseQueue.shift() ?? {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(metadata),
          };
          const response = new EventEmitter() as EventEmitter & {
            statusCode: number;
            headers: Record<string, string>;
            destroy: (error?: Error) => void;
          };
          response.statusCode = next.statusCode;
          response.headers = next.headers;
          response.destroy = (error?: Error) => {
            if (error) response.emit('error', error);
          };
          callback(response);
          queueMicrotask(() => {
            if (next.body) response.emit('data', Buffer.from(next.body));
            response.emit('end');
          });
        };
        return request;
      }
    );
  });

  afterEach(() => {
    responseQueue.length = 0;
  });

  it('keeps Claude CIDDD metadata resolution working over public HTTPS', async () => {
    await expect(resolveClientId(claudeMetadataUrl)).resolves.toMatchObject({
      client_id: claudeMetadataUrl,
      client_name: 'Claude',
      redirect_uris: metadata.redirect_uris,
    });
    expect(mocks.httpsRequest).toHaveBeenCalledWith(
      new URL(claudeMetadataUrl),
      expect.objectContaining({ agent: false, method: 'GET', lookup: expect.any(Function) }),
      expect.any(Function)
    );
  });

  it('requires CIDDD documents to self-identify the exact client ID', async () => {
    responseQueue.length = 0;
    const { client_id: _clientId, ...withoutClientId } = metadata;
    queueResponse({ body: JSON.stringify(withoutClientId) });

    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();
  });

  it('rejects CIDDD metadata that weakens the callback or changes its client ID', async () => {
    responseQueue.length = 0;
    queueResponse({
      body: JSON.stringify({
        ...metadata,
        redirect_uris: ['http://attacker.example/callback'],
      }),
    });
    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();

    responseQueue.length = 0;
    queueResponse({
      body: JSON.stringify({
        ...metadata,
        client_id: 'https://attacker.example/client-metadata',
      }),
    });
    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();
  });

  it('pins the validated DNS address so a later DNS rebinding cannot change the target', async () => {
    let lookedUpAddress: string | undefined;
    mocks.httpsRequest.mockImplementationOnce(
      (_url: URL, options: { lookup: LookupMock }, callback: ResponseCallback) => {
        options.lookup(claudeMetadataUrl, { all: true }, (_error: Error | null, address) => {
          lookedUpAddress = Array.isArray(address) ? address[0]?.address : address;
        });
        const request = new EventEmitter() as EventEmitter & {
          destroy: ReturnType<typeof vi.fn>;
          end: () => void;
        };
        request.destroy = vi.fn();
        request.end = () => {
          const response = new EventEmitter() as EventEmitter & {
            statusCode: number;
            headers: Record<string, string>;
            destroy: (error?: Error) => void;
          };
          response.statusCode = 200;
          response.headers = { 'content-type': 'application/json' };
          response.destroy = vi.fn((_error?: Error) => undefined);
          callback(response);
          queueMicrotask(() => {
            response.emit('data', Buffer.from(JSON.stringify(metadata)));
            response.emit('end');
          });
        };
        return request;
      }
    );

    await expect(resolveClientId(claudeMetadataUrl)).resolves.toMatchObject({
      client_id: claudeMetadataUrl,
    });
    expect(lookedUpAddress).toBe('104.18.32.47');
    expect(mocks.resolve4).toHaveBeenCalledTimes(1);
  });

  it('rejects insecure schemes, credentials, non-standard ports, localhost, and literal private IPs', async () => {
    const blockedUrls = [
      'http://claude.ai/oauth/mcp-oauth-client-metadata',
      'https://user:password@claude.ai/oauth/mcp-oauth-client-metadata',
      'https://claude.ai:8443/oauth/mcp-oauth-client-metadata',
      'https://localhost/oauth/mcp-oauth-client-metadata',
      'https://127.0.0.1/oauth/mcp-oauth-client-metadata',
      'https://[::1]/oauth/mcp-oauth-client-metadata',
      'https://[fc00::1]/oauth/mcp-oauth-client-metadata',
    ];

    for (const url of blockedUrls) {
      await expect(resolveClientId(url)).resolves.toBeNull();
    }
    expect(mocks.httpsRequest).not.toHaveBeenCalled();
  });

  it('rejects a hostname when any DNS answer is private or reserved', async () => {
    mocks.resolve4.mockResolvedValue(['104.18.32.47']);
    mocks.resolve6.mockResolvedValue(['fd00::1']);

    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();
    expect(mocks.httpsRequest).not.toHaveBeenCalled();
  });

  it('rejects private, loopback, link-local, and reserved DNS answers', async () => {
    for (const address of [
      '10.0.0.1',
      '169.254.169.254',
      '192.0.2.1',
      '::1',
      'fe80::1',
      '2001:db8::1',
    ]) {
      mocks.resolve4.mockResolvedValue(address.includes(':') ? [] : [address]);
      mocks.resolve6.mockResolvedValue(address.includes(':') ? [address] : []);
      await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();
      vi.clearAllMocks();
      mocks.resolve4.mockResolvedValue(address.includes(':') ? [] : [address]);
      mocks.resolve6.mockResolvedValue(address.includes(':') ? [address] : []);
    }
    expect(mocks.httpsRequest).not.toHaveBeenCalled();
  });

  it('does not follow redirects and requires JSON under the size cap', async () => {
    responseQueue.length = 0;
    queueResponse({
      statusCode: 302,
      headers: { location: 'https://169.254.169.254/metadata' },
      body: '',
    });
    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();

    queueResponse({ headers: { 'content-type': 'text/plain' }, body: 'not json' });
    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();

    queueResponse({
      headers: { 'content-type': 'application/json', 'content-length': '65537' },
      body: '{}',
    });
    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();
    expect(mocks.httpsRequest).toHaveBeenCalledTimes(3);
  });

  it('treats metadata network failures as an unknown client instead of throwing', async () => {
    mocks.httpsRequest.mockImplementationOnce(
      (_url: URL, _options: object, _callback: ResponseCallback) => {
        const request = new EventEmitter() as EventEmitter & {
          destroy: ReturnType<typeof vi.fn>;
          end: () => void;
        };
        request.destroy = vi.fn();
        request.end = () => queueMicrotask(() => request.emit('error', new Error('network down')));
        return request;
      }
    );

    await expect(resolveClientId(claudeMetadataUrl)).resolves.toBeNull();
  });
});
