import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import {
  OAuthScopes,
  OAuthScope,
  ClientSchema,
  AuthorizationCodeSchema,
  AccessTokenSchema,
  RefreshTokenSchema,
  TokenResponseSchema,
  IntrospectionResponseSchema,
  RevocationRequestSchema,
  JWKSSchema,
  WellKnownAuthServerSchema,
  WellKnownProtectedResourceSchema,
  type Client,
  type AuthorizationCode,
  type AccessToken,
  type RefreshToken,
  type TokenResponse,
  type IntrospectionResponse,
  type RevocationRequest,
  type JWKS,
  type WellKnownAuthServer,
  type WellKnownProtectedResource,
} from './types';

const prisma = new PrismaClient();

const ACCESS_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_CODE_TTL = 10 * 60 * 1000; // 10 minutes
const JWKS_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const JWKS_RETENTION = 48 * 60 * 60 * 1000; // 48 hours

let currentKeyPair: jose.GenerateKeyPairResult | null = null;
let previousKeyPair: jose.GenerateKeyPairResult | null = null;
let currentKid: string;
let previousKid: string | null = null;

async function generateKeyPair(): Promise<jose.GenerateKeyPairResult> {
  return jose.generateKeyPair('RS256', { extractable: true });
}

async function rotateKeys() {
  previousKeyPair = currentKeyPair;
  previousKid = currentKid;
  currentKeyPair = await generateKeyPair();
  currentKid = randomBytes(16).toString('hex');
  
  // Clean up keys older than 48 hours
  setTimeout(() => {
    if (previousKeyPair) {
      previousKeyPair = null;
      previousKid = null;
    }
  }, JWKS_RETENTION);
}

async function getSigningKey(): Promise<{ key: CryptoKey; kid: string }> {
  if (!currentKeyPair) {
    currentKeyPair = await generateKeyPair();
    currentKid = randomBytes(16).toString('hex');
  }
  return { key: currentKeyPair.privateKey, kid: currentKid };
}

async function getVerificationKeys(): Promise<Map<string, CryptoKey>> {
  const keys = new Map<string, CryptoKey>();
  if (!currentKeyPair) {
    currentKeyPair = await generateKeyPair();
    currentKid = randomBytes(16).toString('hex');
  }
  keys.set(currentKid, currentKeyPair.publicKey);
  if (previousKeyPair && previousKid) {
    keys.set(previousKid, previousKeyPair.publicKey);
  }
  return keys;
}

async function getJWKS(): Promise<JWKS> {
  const keys = await getVerificationKeys();
  const jwksKeys = [];
  
  for (const [kid, publicKey] of keys) {
    const jwk = await jose.exportJWK(publicKey);
    jwksKeys.push({ kty: 'RSA' as const, use: 'sig' as const, kid, n: jwk.n!, e: jwk.e!, alg: 'RS256' as const });
  }
  
  return { keys: jwksKeys };
}

export async function initializeOAuth() {
  await rotateKeys();
  setInterval(rotateKeys, JWKS_ROTATION_INTERVAL);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashPKCE(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function verifyPKCE(challenge: string, verifier: string): boolean {
  const expected = hashPKCE(verifier);
  return timingSafeEqual(Buffer.from(challenge), Buffer.from(expected));
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateAuthCode(): string {
  return randomBytes(32).toString('base64url');
}

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export async function createClient(data: Partial<Client> & { redirect_uris: string[] }): Promise<Client> {
  const clientId = generateId();
  const clientSecret = data.token_endpoint_auth_method === 'none' ? undefined : generateToken();
  
  const client = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? hashToken(clientSecret) : null,
      clientName: data.client_name ?? 'Unknown Client',
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
    token_endpoint_auth_method: client.tokenEndpointAuthMethod as Client['token_endpoint_auth_method'],
    client_name: client.clientName,
  } as Client;
}

export async function validateClient(clientId: string, clientSecret?: string): Promise<Client | null> {
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client) return null;
  
  if (client.clientSecretHash && clientSecret) {
    const valid = timingSafeEqual(
      Buffer.from(hashToken(clientSecret)),
      Buffer.from(client.clientSecretHash)
    );
    if (!valid) return null;
  }
  
  return {
    client_id: client.clientId,
    client_secret: undefined,
    redirect_uris: client.redirectUris,
    grant_types: client.grantTypes as Client['grant_types'],
    response_types: client.responseTypes as Client['response_types'],
    scope: client.scope,
    token_endpoint_auth_method: client.tokenEndpointAuthMethod as Client['token_endpoint_auth_method'],
    client_name: client.clientName,
  } as Client;
}

export async function validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client) return false;
  
  return client.redirectUris.some(uri => {
    if (uri.includes('*')) {
      const pattern = uri.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(redirectUri);
    }
    return uri === redirectUri;
  });
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

export async function consumeAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
  const codeHash = hashToken(code);
  const authCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { code: codeHash } });
  
  if (!authCode) return null;
  if (authCode.expiresAt < new Date()) {
    await prisma.oAuthAuthorizationCode.delete({ where: { code: codeHash } });
    return null;
  }
  
  await prisma.oAuthAuthorizationCode.delete({ where: { code: codeHash } });
  
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
  const { key, kid } = await getSigningKey();
  
  const jti = randomUUID();
  const jwt = await new jose.SignJWT({ sub: userId, scope, client_id: clientId, jti })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setAudience('mcp://jobmark')
    .sign(key);
  
  await prisma.oAuthAccessToken.create({
    data: {
      tokenHash: hashToken(jwt),
      clientId,
      userId,
      scope,
      expiresAt: new Date(expiresAt),
    },
  });
  
  return {
    token: jwt,
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
  pkceCodeVerifier?: string
): Promise<RefreshToken> {
  const token = generateToken();
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL;
  
  await prisma.oAuthRefreshToken.create({
    data: {
      tokenHash: hashToken(token),
      clientId,
      userId,
      scope,
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
  
  // Check PKCE verifier: stored value is the code_challenge, presented value is the verifier
  if (pkceCodeVerifier && refreshToken.pkceCodeVerifier) {
    const valid = verifyPKCE(refreshToken.pkceCodeVerifier, pkceCodeVerifier);
    if (!valid) return null;
  }
  
  await prisma.oAuthRefreshToken.delete({ where: { tokenHash } });
  
  const newAccessToken = await createAccessToken(clientId, userId, scope);
  const newRefreshToken = await createRefreshToken(clientId, userId, scope, refreshToken.pkceCodeVerifier ?? undefined);
  
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function validateAccessToken(token: string): Promise<{ userId: string; clientId: string; scope: string; exp: number; iat: number } | null> {
  try {
    const keys = await getVerificationKeys();
    
    for (const [kid, publicKey] of keys) {
      try {
        const { payload } = await jose.jwtVerify(token, publicKey, {
          audience: 'mcp://jobmark',
          algorithms: ['RS256'],
        });
        
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const tokenRecord = await prisma.oAuthAccessToken.findUnique({
          where: { tokenHash },
        });
        
        if (!tokenRecord) return null;
        if (tokenRecord.revokedAt) return null;
        if (tokenRecord.expiresAt < new Date()) return null;
        
        return {
          userId: payload.sub as string,
          clientId: payload.client_id as string,
          scope: payload.scope as string,
          exp: payload.exp as number,
          iat: payload.iat as number,
        };
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function introspectToken(token: string, clientId: string): Promise<IntrospectionResponse> {
  const validation = await validateAccessToken(token);
  if (!validation) {
    return { active: false };
  }
  
  if (validation.clientId !== clientId) {
    return { active: false };
  }
  
  return {
    active: true,
    scope: validation.scope,
    client_id: validation.clientId,
    username: validation.userId,
    token_type: 'Bearer',
    exp: validation.exp,
    iat: validation.iat,
    sub: validation.userId,
    aud: 'mcp://jobmark',
  };
}

export async function revokeToken(token: string, tokenTypeHint?: string, clientId?: string): Promise<boolean> {
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
    revocation_endpoint: `${baseUrl}/api/auth/mcp/revoke`,
    introspection_endpoint: `${baseUrl}/api/auth/mcp/introspect`,
    jwks_uri: `${baseUrl}/api/auth/mcp/jwks`,
    scopes_supported: [...OAuthScopes],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    token_endpoint_auth_signing_alg_values_supported: ['RS256'],
    ui_locales_supported: ['en'],
  };
}

export async function getWellKnownProtectedResource(baseUrl: string): Promise<WellKnownProtectedResource> {
  return {
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    jwks_uri: `${baseUrl}/api/auth/mcp/jwks`,
    scopes_supported: [...OAuthScopes],
    bearer_methods_supported: ['header'],
  };
}

export async function getJWKSKeys(): Promise<JWKS> {
  return getJWKS();
}