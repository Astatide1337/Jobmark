import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getMcpProviderKey } from '@/lib/mcp/provider-identity';
import { fetchDynamicClientMetadata, type DynamicClientMetadata } from './client-metadata';
import { getMcpResourceUri } from './resource';
import {
  generateAuthCode,
  generateId,
  generateToken,
  hashToken,
  timingSafeEqual,
  verifyPKCE,
} from './crypto';
export { hashPKCE, hashToken } from './crypto';
export { getJWKSKeys } from './jwks';
import {
  OAuthScopes,
  type Client,
  type AuthorizationCode,
  type AccessToken,
  type RefreshToken,
  type WellKnownAuthServer,
  type WellKnownProtectedResource,
} from './types';

const ACCESS_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_CODE_TTL = 10 * 60 * 1000; // 10 minutes
const CLIENT_SECRET_HASH_PREFIX = 'bcrypt$';
const CLIENT_SECRET_BCRYPT_ROUNDS = 12;

/** Store confidential-client secrets with a deliberately expensive password hash. */
export async function hashClientSecret(secret: string): Promise<string> {
  return `${CLIENT_SECRET_HASH_PREFIX}${await bcrypt.hash(secret, CLIENT_SECRET_BCRYPT_ROUNDS)}`;
}

async function verifyClientSecret(secret: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith(CLIENT_SECRET_HASH_PREFIX)) {
    return bcrypt.compare(secret, storedHash.slice(CLIENT_SECRET_HASH_PREFIX.length));
  }

  // Clients created before bcrypt was introduced have a SHA-256 digest. Their
  // secrets were generated randomly by Jobmark, so keep a constant-time,
  // one-way compatibility check and let new registrations use bcrypt.
  const expected = Buffer.from(storedHash);
  // codeql[js/insufficient-password-hash]
  const supplied = Buffer.from(hashToken(secret));
  return expected.length === supplied.length && timingSafeEqual(supplied, expected);
}

export async function createClient(
  data: Partial<Client> & { redirect_uris: string[] }
): Promise<Client> {
  const clientId = generateId();
  const clientSecret = data.token_endpoint_auth_method === 'none' ? undefined : generateToken();

  const client = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? await hashClientSecret(clientSecret) : null,
      clientName: data.client_name ?? 'Unnamed assistant',
      redirectUris: data.redirect_uris,
      grantTypes: data.grant_types ?? ['authorization_code', 'refresh_token'],
      responseTypes: data.response_types ?? ['code'],
      scope: data.scope ?? OAuthScopes.join(' '),
      requirePkce: true,
      tokenEndpointAuthMethod: data.token_endpoint_auth_method ?? 'client_secret_post',
    },
  });

  return {
    client_id: client.clientId,
    client_secret: clientSecret,
    redirect_uris: client.redirectUris,
    grant_types: client.grantTypes as Client['grant_types'],
    response_types: client.responseTypes as Client['response_types'],
    scope: client.scope,
    token_endpoint_auth_method:
      client.tokenEndpointAuthMethod as Client['token_endpoint_auth_method'],
    client_name: client.clientName,
  } as Client;
}

async function resolveRegisteredClient(clientId: string): Promise<Client | null> {
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client) return null;

  return toOAuthClient(client);
}

function toOAuthClient(client: {
  clientId: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scope: string;
  tokenEndpointAuthMethod: string;
  clientName: string;
}): Client {
  return {
    client_id: client.clientId,
    client_secret: undefined,
    redirect_uris: client.redirectUris,
    grant_types: client.grantTypes as Client['grant_types'],
    response_types: client.responseTypes as Client['response_types'],
    scope: client.scope,
    token_endpoint_auth_method:
      client.tokenEndpointAuthMethod as Client['token_endpoint_auth_method'],
    client_name: client.clientName,
  } as Client;
}

async function resolveMetadataClient(metadata: DynamicClientMetadata): Promise<Client | null> {
  const metadataClientId = metadata.client_id;
  let client = await prisma.oAuthClient.findUnique({ where: { clientId: metadataClientId } });
  if (!client) {
    client = await prisma.oAuthClient.create({
      data: {
        clientId: metadataClientId,
        clientSecretHash: null,
        clientName: metadata.client_name.trim(),
        redirectUris: metadata.redirect_uris,
        grantTypes: metadata.grant_types ?? ['authorization_code', 'refresh_token'],
        responseTypes: metadata.response_types ?? ['code'],
        scope: metadata.scope ?? OAuthScopes.join(' '),
        requirePkce: true,
        tokenEndpointAuthMethod: metadata.token_endpoint_auth_method ?? 'none',
      },
    });
  }

  return toOAuthClient(client);
}

/**
 * Resolve a client_id that may be a CIDDD URL (draft-ietf-oauth-client-id-metadata-document-00).
 * If client_id is a URL, fetch metadata from it and create a transient client record.
 */
export async function resolveClientId(clientId: string): Promise<Client | null> {
  const metadata = await fetchDynamicClientMetadata(clientId);
  if (metadata === undefined) {
    // The authorization endpoint identifies the client but does not receive
    // token-endpoint credentials. Secret validation happens when exchanging
    // the authorization code, so preserve lookup here without authenticating
    // the client as a token endpoint caller.
    return resolveRegisteredClient(clientId);
  }
  if (metadata === null) return null;

  return resolveMetadataClient(metadata);
}

export async function validateClient(
  clientId: string,
  clientSecret?: string
): Promise<Client | null> {
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client) return null;

  if (client.clientSecretHash) {
    // Confidential clients must authenticate at every token endpoint call;
    // accepting an omitted secret would downgrade them to public clients.
    if (!clientSecret) return null;

    if (!(await verifyClientSecret(clientSecret, client.clientSecretHash))) return null;
  }

  return {
    client_id: client.clientId,
    client_secret: undefined,
    redirect_uris: client.redirectUris,
    grant_types: client.grantTypes as Client['grant_types'],
    response_types: client.responseTypes as Client['response_types'],
    scope: client.scope,
    token_endpoint_auth_method:
      client.tokenEndpointAuthMethod as Client['token_endpoint_auth_method'],
    client_name: client.clientName,
  } as Client;
}

export async function createAuthorizationCode(
  clientId: string,
  userId: string,
  redirectUri: string,
  codeChallenge: string,
  scope: string,
  state?: string
): Promise<AuthorizationCode> {
  const code = generateAuthCode();
  const expiresAt = Date.now() + AUTH_CODE_TTL;

  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: hashToken(code),
      clientId,
      userId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod: 'S256',
      scope,
      expiresAt: new Date(expiresAt),
    },
  });

  return {
    code,
    client_id: clientId,
    user_id: userId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope,
    expires_at: expiresAt,
  };
}

export async function consumeAuthorizationCode(
  code: string,
  codeVerifier?: string
): Promise<AuthorizationCode | null> {
  const codeHash = hashToken(code);
  const authCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { code: codeHash } });

  if (!authCode) return null;
  if (authCode.expiresAt < new Date()) {
    await prisma.oAuthAuthorizationCode.delete({ where: { code: codeHash } });
    return null;
  }

  // Authorization codes created with PKCE are unusable without the verifier.
  // Check before consuming so a missing/incorrect verifier cannot burn a
  // legitimate code and, more importantly, cannot bypass proof of possession.
  if (
    authCode.codeChallenge !== null &&
    authCode.codeChallenge !== undefined &&
    (!codeVerifier || !verifyPKCE(authCode.codeChallenge, codeVerifier))
  ) {
    return null;
  }

  const consumed = await prisma.oAuthAuthorizationCode.deleteMany({
    where: { code: codeHash },
  });
  if (consumed.count !== 1) return null;

  return {
    code: authCode.code,
    client_id: authCode.clientId,
    user_id: authCode.userId,
    redirect_uri: authCode.redirectUri,
    code_challenge: authCode.codeChallenge ?? '',
    code_challenge_method: (authCode.codeChallengeMethod as 'S256') ?? 'S256',
    scope: authCode.scope,
    expires_at: authCode.expiresAt.getTime(),
  } as AuthorizationCode;
}

export async function createAccessToken(
  clientId: string,
  userId: string,
  scope: string
): Promise<AccessToken> {
  const token = generateToken();
  const expiresAt = Date.now() + ACCESS_TOKEN_TTL;

  await prisma.oAuthAccessToken.create({
    data: {
      // Access tokens are intentionally opaque. The DB hash is the source of
      // truth, so tokens remain valid across independent application instances.
      tokenHash: hashToken(token),
      clientId,
      userId,
      scope,
      expiresAt: new Date(expiresAt),
    },
  });

  return {
    token,
    client_id: clientId,
    user_id: userId,
    scope,
    expires_at: expiresAt,
    token_type: 'Bearer',
  };
}

export async function createRefreshToken(
  clientId: string,
  userId: string,
  scope: string,
  pkceCodeVerifier?: string,
  familyId?: string
): Promise<RefreshToken> {
  const token = generateToken();
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL;
  const tokenFamilyId = familyId ?? randomUUID();

  await prisma.oAuthRefreshToken.create({
    data: {
      tokenHash: hashToken(token),
      clientId,
      userId,
      scope,
      familyId: tokenFamilyId,
      expiresAt: new Date(expiresAt),
      pkceCodeVerifier: pkceCodeVerifier ?? null,
    },
  });

  return {
    token,
    client_id: clientId,
    user_id: userId,
    scope,
    expires_at: expiresAt,
    pkce_code_verifier: pkceCodeVerifier,
  };
}

export async function rotateRefreshToken(
  oldToken: string,
  clientId: string,
  userId: string,
  scope: string,
  pkceCodeVerifier?: string
): Promise<{ accessToken: AccessToken; refreshToken: RefreshToken } | null> {
  const tokenHash = hashToken(oldToken);
  const refreshToken = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash } });

  if (!refreshToken) return null;
  if (refreshToken.expiresAt < new Date()) {
    await prisma.oAuthRefreshToken.delete({ where: { tokenHash } });
    return null;
  }
  if (refreshToken.clientId !== clientId || refreshToken.userId !== userId) return null;
  if (refreshToken.consumedAt) {
    // Token was already consumed — replay detected. Revoke entire family.
    await prisma.oAuthRefreshToken.updateMany({
      where: { familyId: refreshToken.familyId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return null;
  }

  // Check PKCE verifier: stored value is the code_challenge, presented value is the verifier
  if (pkceCodeVerifier && refreshToken.pkceCodeVerifier) {
    const valid = verifyPKCE(refreshToken.pkceCodeVerifier, pkceCodeVerifier);
    if (!valid) return null;
  }

  // Mark old token as consumed atomically. Two concurrent refresh requests can
  // both pass the read above, but only one may win this conditional update and
  // mint a new token pair.
  const consumed = await prisma.oAuthRefreshToken.updateMany({
    where: { tokenHash, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  if (consumed.count !== 1) {
    // Another request won the race. Treat this as replay and revoke the rest
    // of the family, matching the already-consumed-token path above.
    await prisma.oAuthRefreshToken.updateMany({
      where: { familyId: refreshToken.familyId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return null;
  }

  const newAccessToken = await createAccessToken(clientId, userId, scope);
  const newRefreshToken = await createRefreshToken(
    clientId,
    userId,
    scope,
    refreshToken.pkceCodeVerifier ?? undefined,
    refreshToken.familyId
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function validateAccessToken(
  token: string
): Promise<{ userId: string; clientId: string; scope: string; exp: number; iat: number } | null> {
  try {
    const tokenRecord = await prisma.oAuthAccessToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) return null;

    return {
      userId: tokenRecord.userId,
      clientId: tokenRecord.clientId,
      scope: tokenRecord.scope,
      exp: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
      iat: Math.floor(tokenRecord.createdAt.getTime() / 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Ensure the DB-backed MCP connection exists before returning OAuth tokens.
 * `/mcp` authorizes requests against this record, not just the token row.
 */
export async function ensureMcpConnection(
  clientId: string,
  userId: string,
  scope: string,
  options: { revokeExistingTokens?: boolean } = {}
): Promise<void> {
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: { id: true, clientId: true, clientName: true, redirectUris: true },
  });

  if (!client) {
    throw new Error('Cannot create an MCP connection for an unknown OAuth client');
  }

  const scopes = scope.split(' ').filter(Boolean);
  const activeConnections = await prisma.mcpConnection.findMany({
    where: { userId, revokedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      oauthClient: { select: { clientId: true, clientName: true, redirectUris: true } },
    },
  });
  const providerKey = getMcpProviderKey({
    clientId: client.clientId,
    clientName: client.clientName,
    redirectUris: client.redirectUris,
  });
  const providerConnections = activeConnections.filter(
    connection =>
      getMcpProviderKey({
        clientId: connection.oauthClient.clientId,
        clientName: connection.oauthClient.clientName,
        redirectUris: connection.oauthClient.redirectUris,
      }) === providerKey
  );
  const connection =
    providerConnections.find(candidate => candidate.oauthClientId === client.id) ??
    providerConnections[0];

  if (connection) {
    const now = new Date();
    const duplicateConnectionIds = providerConnections
      .filter(candidate => candidate.id !== connection.id)
      .map(candidate => candidate.id);
    const replacedClientIds = [
      ...new Set(
        providerConnections
          .map(candidate => candidate.oauthClient.clientId)
          .filter(candidateClientId => candidateClientId !== client.clientId)
      ),
    ];
    const tokenClientIds = [
      ...new Set([
        ...replacedClientIds,
        ...(options.revokeExistingTokens ? [client.clientId] : []),
      ]),
    ];
    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.mcpConnection.update({
        where: { id: connection.id },
        data: {
          oauthClientId: client.id,
          clientName: client.clientName,
          scopes,
          revokedAt: null,
          lastUsedAt: now,
        },
      }),
    ];

    if (duplicateConnectionIds.length > 0) {
      operations.push(
        prisma.mcpConnection.updateMany({
          where: { id: { in: duplicateConnectionIds }, userId },
          data: { revokedAt: now, vaultUnlockedUntil: null },
        })
      );
    }
    if (tokenClientIds.length > 0) {
      operations.push(
        prisma.oAuthAccessToken.updateMany({
          where: { userId, clientId: { in: tokenClientIds }, revokedAt: null },
          data: { revokedAt: now },
        }),
        prisma.oAuthRefreshToken.updateMany({
          where: { userId, clientId: { in: tokenClientIds }, consumedAt: null },
          data: { consumedAt: now },
        }),
        prisma.oAuthAuthorizationCode.deleteMany({
          where: { userId, clientId: { in: tokenClientIds } },
        })
      );
    }
    if (replacedClientIds.length > 0) {
      operations.push(
        prisma.oAuthConsent.deleteMany({
          where: { userId, clientId: { in: replacedClientIds } },
        })
      );
    }

    await prisma.$transaction(operations);
    return;
  }

  const createConnection = prisma.mcpConnection.create({
    data: {
      userId,
      oauthClientId: client.id,
      clientName: client.clientName,
      scopes,
      lastUsedAt: new Date(),
    },
  });

  if (!options.revokeExistingTokens) {
    await createConnection;
    return;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.oAuthAccessToken.updateMany({
      where: { userId, clientId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.oAuthRefreshToken.updateMany({
      where: { userId, clientId, consumedAt: null },
      data: { consumedAt: now },
    }),
    prisma.oAuthAuthorizationCode.deleteMany({ where: { userId, clientId } }),
    createConnection,
  ]);
}

export async function revokeToken(
  token: string,
  tokenTypeHint?: string,
  clientId?: string
): Promise<boolean> {
  const tokenHash = hashToken(token);

  if (!tokenTypeHint || tokenTypeHint === 'access_token') {
    const accessToken = await prisma.oAuthAccessToken.findUnique({ where: { tokenHash } });
    if (accessToken && (!clientId || accessToken.clientId === clientId)) {
      await prisma.oAuthAccessToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
      return true;
    }
  }

  if (!tokenTypeHint || tokenTypeHint === 'refresh_token') {
    const refreshToken = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash } });
    if (refreshToken && (!clientId || refreshToken.clientId === clientId)) {
      await prisma.oAuthRefreshToken.delete({ where: { tokenHash } });
      return true;
    }
  }

  return false;
}

export async function createConsent(
  userId: string,
  clientId: string,
  scope: string
): Promise<void> {
  await prisma.oAuthConsent.upsert({
    where: {
      clientId_userId: { clientId, userId },
    },
    create: { userId, clientId, scope },
    update: { scope, updatedAt: new Date() },
  });
}

export async function getConsent(userId: string, clientId: string): Promise<string | null> {
  const consent = await prisma.oAuthConsent.findUnique({
    where: { clientId_userId: { clientId, userId } },
  });
  return consent?.scope ?? null;
}

export async function getWellKnownAuthServer(baseUrl: string): Promise<WellKnownAuthServer> {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/mcp/authorize`,
    token_endpoint: `${baseUrl}/api/auth/mcp/token`,
    registration_endpoint: `${baseUrl}/api/auth/mcp/register`,
    revocation_endpoint: `${baseUrl}/api/auth/mcp/revoke`,
    introspection_endpoint: `${baseUrl}/api/auth/mcp/introspect`,
    scopes_supported: [...OAuthScopes],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    ui_locales_supported: ['en'],
    client_id_metadata_document_supported: true,
  };
}

export async function getWellKnownProtectedResource(
  baseUrl: string
): Promise<WellKnownProtectedResource> {
  return {
    resource: getMcpResourceUri(baseUrl),
    authorization_servers: [baseUrl],
    scopes_supported: [...OAuthScopes],
    bearer_methods_supported: ['header'],
  };
}
