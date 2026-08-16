import * as jose from 'jose';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import * as dns from 'node:dns/promises';
import { isIP } from 'node:net';
import * as https from 'node:https';
import type { ClientRequest, IncomingHttpHeaders } from 'node:http';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getMcpProviderKey } from '@/lib/mcp/provider-identity';
import { areValidOAuthRedirectUris } from './redirect-uri';
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

const ACCESS_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_CODE_TTL = 10 * 60 * 1000; // 10 minutes
const JWKS_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const JWKS_RETENTION = 48 * 60 * 60 * 1000; // 48 hours
const CIDDD_FETCH_TIMEOUT = 5000;
const CIDDD_MAX_RESPONSE_BYTES = 64 * 1024;

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
    jwksKeys.push({
      kty: 'RSA' as const,
      use: 'sig' as const,
      kid,
      n: jwk.n!,
      e: jwk.e!,
      alg: 'RS256' as const,
    });
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
  const supplied = Buffer.from(challenge);
  const computed = Buffer.from(expected);
  return supplied.length === computed.length && timingSafeEqual(supplied, computed);
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

export async function createClient(
  data: Partial<Client> & { redirect_uris: string[] }
): Promise<Client> {
  const clientId = generateId();
  const clientSecret = data.token_endpoint_auth_method === 'none' ? undefined : generateToken();

  const client = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? hashToken(clientSecret) : null,
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

type ClientMetadata = {
  client_id?: string;
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
};

function ipv4ToNumber(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part))) return null;

  const octets = parts.map(Number);
  if (octets.some(octet => octet > 255)) return null;
  return ((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3];
}

function ipv4NumberToString(value: number): string {
  return [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join('.');
}

function isBlockedIPv4(address: string): boolean {
  const value = ipv4ToNumber(address);
  if (value === null) return true;

  const blockedRanges: Array<[number, number]> = [
    [0x00000000, 0x00ffffff], // "this" network / unspecified
    [0x0a000000, 0x0affffff], // RFC 1918
    [0x64400000, 0x647fffff], // RFC 6598
    [0x7f000000, 0x7fffffff], // loopback
    [0xa9fe0000, 0xa9feffff], // link-local
    [0xac100000, 0xac1fffff], // RFC 1918
    [0xc0000000, 0xc00000ff], // IETF protocol assignments
    [0xc0000200, 0xc00002ff], // TEST-NET-1
    [0xc0586300, 0xc05863ff], // deprecated 6to4 relay anycast
    [0xc0a80000, 0xc0a8ffff], // RFC 1918
    [0xc6120000, 0xc613ffff], // benchmarking
    [0xc6336400, 0xc63364ff], // TEST-NET-2
    [0xcb007100, 0xcb0071ff], // TEST-NET-3
    [0xe0000000, 0xffffffff], // multicast and reserved
  ];

  return blockedRanges.some(([start, end]) => value >= start && value <= end);
}

function parseIPv6(address: string): string | null {
  let normalized = address.toLowerCase();
  if (normalized.includes('%')) return null; // scoped addresses are not valid fetch targets

  // Normalize an IPv4-embedded tail into two hexadecimal groups.
  if (normalized.includes('.')) {
    const separator = normalized.lastIndexOf(':');
    if (separator < 0) return null;
    const ipv4 = ipv4ToNumber(normalized.slice(separator + 1));
    if (ipv4 === null) return null;
    normalized = `${normalized.slice(0, separator + 1)}${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const compressionIndex = normalized.indexOf('::');
  let groups: string[];
  if (compressionIndex >= 0) {
    if (normalized.indexOf('::', compressionIndex + 2) >= 0) return null;
    const left = normalized.slice(0, compressionIndex);
    const right = normalized.slice(compressionIndex + 2);
    const leftGroups = left ? left.split(':') : [];
    const rightGroups = right ? right.split(':') : [];
    if (leftGroups.length + rightGroups.length >= 8) return null;
    groups = [
      ...leftGroups,
      ...Array(8 - leftGroups.length - rightGroups.length).fill('0'),
      ...rightGroups,
    ];
  } else {
    groups = normalized.split(':');
    if (groups.length !== 8) return null;
  }

  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map(group => group.padStart(4, '0')).join('');
}

function hasIPv6Prefix(value: string, bits: number, prefix: string): boolean {
  const hexDigits = Math.ceil(bits / 4);
  const normalizedPrefix = prefix.padStart(hexDigits, '0');
  const completeDigits = Math.floor(bits / 4);
  if (value.slice(0, completeDigits) !== normalizedPrefix.slice(0, completeDigits)) return false;
  if (bits % 4 === 0) return true;

  const mask = 0xf << (4 - (bits % 4));
  return (
    (parseInt(value[completeDigits], 16) & mask) ===
    (parseInt(normalizedPrefix[completeDigits], 16) & mask)
  );
}

function isBlockedIPv6(address: string): boolean {
  const value = parseIPv6(address);
  if (value === null) return true;

  // IPv4-mapped IPv6 addresses inherit the IPv4 address's restrictions.
  if (value.slice(0, 24) === '00000000000000000000ffff') {
    return isBlockedIPv4(ipv4NumberToString(parseInt(value.slice(24), 16)));
  }

  return (
    value === '0'.repeat(32) || // unspecified
    value === `0${'0'.repeat(31 - 1)}1` || // loopback
    hasIPv6Prefix(value, 7, 'fc') || // fc00::/7, unique local
    hasIPv6Prefix(value, 10, 'fe80') || // fe80::/10, link-local
    hasIPv6Prefix(value, 8, 'ff') || // multicast
    value.slice(0, 24) === '0'.repeat(24) || // IPv4-compatible / reserved ::/96
    hasIPv6Prefix(value, 32, '20010db8') || // documentation
    hasIPv6Prefix(value, 48, '200100000002') || // benchmarking
    hasIPv6Prefix(value, 28, '2001001') || // ORCHID
    hasIPv6Prefix(value, 28, '2001002') || // ORCHIDv2
    hasIPv6Prefix(value, 64, '0100000000000000') || // discard-only
    hasIPv6Prefix(value, 96, '0064ff9b0000000000000000') || // NAT64 well-known prefix
    hasIPv6Prefix(value, 20, '3fff0') // documentation (RFC 9637)
  );
}

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isBlockedIPv4(address);
  if (family === 6) return isBlockedIPv6(address);
  return true;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

type PinnedAddress = {
  address: string;
  family: 4 | 6;
};

async function resolveSafeAddress(hostname: string): Promise<PinnedAddress | null> {
  const normalizedHostname = hostname.replace(/^\[/, '').replace(/\]$/, '');
  const family = isIP(normalizedHostname);
  if (family)
    return isBlockedAddress(normalizedHostname)
      ? null
      : { address: normalizedHostname, family: family as 4 | 6 };

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname.endsWith('.local')
  )
    return null;

  const results = await withTimeout(
    Promise.allSettled([dns.resolve4(normalizedHostname), dns.resolve6(normalizedHostname)]),
    CIDDD_FETCH_TIMEOUT
  );
  const addresses = results.flatMap(result => {
    if (result.status === 'fulfilled') return result.value;
    return [];
  });
  if (addresses.length === 0 || addresses.some(address => isBlockedAddress(address))) return null;

  const address = addresses[0];
  return { address, family: isIP(address) as 4 | 6 };
}

type PinnedResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
};

async function fetchPinnedMetadata(
  url: URL,
  pinnedAddress: PinnedAddress
): Promise<PinnedResponse> {
  let request: ClientRequest | undefined;
  const responsePromise = new Promise<PinnedResponse>((resolve, reject) => {
    request = https.request(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        // Disable connection pooling so every request uses the pinned lookup.
        agent: false,
        // Keep the original hostname for TLS certificate validation and SNI,
        // while forcing the socket connection to the address checked above.
        servername: isIP(url.hostname.replace(/^\[/, '').replace(/\]$/, ''))
          ? undefined
          : url.hostname,
        lookup: (_hostname, options, callback) => {
          // Node 20+ may request all DNS answers for its Happy Eyeballs
          // connection strategy. Return the already-validated pinned address
          // in the shape requested by either lookup callback overload.
          if (options.all) {
            callback(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }]);
            return;
          }

          callback(null, pinnedAddress.address, pinnedAddress.family);
        },
      },
      response => {
        const chunks: Buffer[] = [];
        let total = 0;
        response.on('data', (chunk: Buffer | string) => {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += bytes.byteLength;
          if (total > CIDDD_MAX_RESPONSE_BYTES) {
            response.destroy(new Error('response too large'));
            return;
          }
          chunks.push(bytes);
        });
        response.once('end', () => {
          if (total <= CIDDD_MAX_RESPONSE_BYTES) {
            resolve({
              statusCode: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks),
            });
          }
        });
        response.once('error', reject);
      }
    );
    request.once('error', reject);
    request.end();
  });

  try {
    return await withTimeout(responsePromise, CIDDD_FETCH_TIMEOUT);
  } catch (error) {
    request?.destroy();
    throw error;
  }
}

function getResponseHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function readResponseBody(body: Buffer): string | null {
  if (body.byteLength > CIDDD_MAX_RESPONSE_BYTES) return null;
  return new TextDecoder().decode(body);
}

function parseClientMetadataUrl(clientId: string): URL | null | undefined {
  const looksLikeUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(clientId);
  if (!looksLikeUrl) return undefined;

  try {
    const url = new URL(clientId);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password || url.port !== '' || !url.hostname) return null;
    return url;
  } catch {
    return null;
  }
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

async function resolveMetadataClient(
  metadataUrl: URL,
  clientId: string,
  pinnedAddress: PinnedAddress
): Promise<Client | null> {
  const response = await fetchPinnedMetadata(metadataUrl, pinnedAddress);
  if (response.statusCode < 200 || response.statusCode >= 300) return null;

  const contentType = getResponseHeader(response.headers, 'content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json' && !contentType?.endsWith('+json')) return null;

  const contentLength = getResponseHeader(response.headers, 'content-length');
  if (
    contentLength &&
    Number.isFinite(Number(contentLength)) &&
    Number(contentLength) > CIDDD_MAX_RESPONSE_BYTES
  ) {
    return null;
  }

  const body = readResponseBody(response.body);
  if (body === null) return null;
  const metadata = JSON.parse(body) as ClientMetadata;
  if (
    !Array.isArray(metadata.redirect_uris) ||
    !metadata.redirect_uris.every(uri => typeof uri === 'string') ||
    !areValidOAuthRedirectUris(metadata.redirect_uris) ||
    (metadata.client_id !== undefined &&
      (typeof metadata.client_id !== 'string' || metadata.client_id !== clientId))
  ) {
    return null;
  }

  const metadataClientId = metadata.client_id ?? clientId;
  let client = await prisma.oAuthClient.findUnique({ where: { clientId: metadataClientId } });
  if (!client) {
    client = await prisma.oAuthClient.create({
      data: {
        clientId: metadataClientId,
        clientSecretHash: null,
        clientName: metadata.client_name ?? 'Unnamed assistant',
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
  // If not a URL, treat as a regular pre-registered client_id.
  const metadataUrl = parseClientMetadataUrl(clientId);
  if (metadataUrl === undefined) {
    // The authorization endpoint identifies the client but does not receive
    // token-endpoint credentials. Secret validation happens when exchanging
    // the authorization code, so preserve lookup here without authenticating
    // the client as a token endpoint caller.
    return resolveRegisteredClient(clientId);
  }
  if (metadataUrl === null) return null;

  let pinnedAddress: PinnedAddress;
  try {
    const resolvedAddress = await resolveSafeAddress(metadataUrl.hostname);
    if (!resolvedAddress) return null;
    pinnedAddress = resolvedAddress;
  } catch {
    return null;
  }

  // CIDDD: Fetch metadata from the URL.
  try {
    return await resolveMetadataClient(metadataUrl, clientId, pinnedAddress);
  } catch {
    return null;
  }
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

    const expected = Buffer.from(client.clientSecretHash);
    const supplied = Buffer.from(hashToken(clientSecret));
    if (expected.length !== supplied.length || !timingSafeEqual(supplied, expected)) {
      return null;
    }
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
      // truth, so tokens remain valid when requests land on another Vercel
      // function instance (where in-memory signing keys do not exist).
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

export async function introspectToken(
  token: string,
  clientId: string
): Promise<IntrospectionResponse> {
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
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: [...OAuthScopes],
    bearer_methods_supported: ['header'],
  };
}

export async function getJWKSKeys(): Promise<JWKS> {
  return getJWKS();
}
