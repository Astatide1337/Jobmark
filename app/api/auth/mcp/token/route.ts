import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  validateClient,
  hashToken,
  createAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  ensureMcpConnection,
} from '@/lib/mcp/auth/provider';
import {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/mcp/auth/rate-limit';
import { verifyPKCE } from '@/lib/mcp/auth/crypto';
import { readOAuthRequestBody } from '@/lib/mcp/auth/request-body';
import { getMcpPublicBaseUrl } from '@/lib/mcp/auth/public-origin';
import { getMcpResourceUri, isMcpResource } from '@/lib/mcp/auth/resource';

type RateLimitResult = Awaited<ReturnType<typeof checkRateLimit>>;

function tokenResponse(rateLimit: RateLimitResult, error: string, status = 400): NextResponse {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        ...createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    }
  );
}

function tokenHeaders(rateLimit: RateLimitResult): HeadersInit {
  return {
    ...createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  };
}

async function handleAuthorizationCodeGrant(
  body: Record<string, string>,
  clientId: string,
  rateLimit: RateLimitResult
): Promise<NextResponse> {
  const { code, redirect_uri: redirectUri, code_verifier: codeVerifier } = body;
  if (!code || !redirectUri) return tokenResponse(rateLimit, 'invalid_request');

  const codeHash = hashToken(code);
  const authCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { code: codeHash } });
  if (
    !authCode ||
    authCode.clientId !== clientId ||
    authCode.redirectUri !== redirectUri ||
    authCode.expiresAt < new Date()
  ) {
    return tokenResponse(rateLimit, 'invalid_grant');
  }

  if (
    authCode.codeChallenge !== null &&
    authCode.codeChallenge !== undefined &&
    (!codeVerifier || !verifyPKCE(authCode.codeChallenge, codeVerifier))
  ) {
    return tokenResponse(rateLimit, 'invalid_grant');
  }

  const consumed = await prisma.oAuthAuthorizationCode.deleteMany({ where: { code: codeHash } });
  if (consumed.count !== 1) return tokenResponse(rateLimit, 'invalid_grant');

  await ensureMcpConnection(clientId, authCode.userId, authCode.scope, {
    revokeExistingTokens: true,
  });
  const accessToken = await createAccessToken(clientId, authCode.userId, authCode.scope);
  const refreshToken = await createRefreshToken(
    clientId,
    authCode.userId,
    authCode.scope,
    authCode.codeChallenge ?? undefined
  );

  return NextResponse.json(
    {
      access_token: accessToken.token,
      token_type: 'Bearer',
      expires_in: Math.floor((accessToken.expires_at - Date.now()) / 1000),
      refresh_token: refreshToken.token,
      scope: accessToken.scope,
    },
    { status: 200, headers: tokenHeaders(rateLimit) }
  );
}

async function handleRefreshGrant(
  body: Record<string, string>,
  clientId: string,
  rateLimit: RateLimitResult
): Promise<NextResponse> {
  const refreshToken = body.refresh_token;
  if (!refreshToken) return tokenResponse(rateLimit, 'invalid_request');

  const storedToken = await prisma.oAuthRefreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (!storedToken || storedToken.clientId !== clientId || storedToken.expiresAt < new Date()) {
    return tokenResponse(rateLimit, 'invalid_grant');
  }

  const originalScopes = storedToken.scope.trim().split(/\s+/).filter(Boolean);
  const requestedScopes =
    body.scope === undefined ? originalScopes : body.scope.trim().split(/\s+/).filter(Boolean);
  if (
    requestedScopes.length === 0 ||
    !requestedScopes.every(scopeName => originalScopes.includes(scopeName))
  ) {
    return tokenResponse(rateLimit, 'invalid_scope');
  }

  if (
    storedToken.pkceCodeVerifier &&
    body.code_verifier &&
    !verifyPKCE(storedToken.pkceCodeVerifier, body.code_verifier)
  ) {
    return tokenResponse(rateLimit, 'invalid_grant');
  }

  const rotated = await rotateRefreshToken(
    refreshToken,
    clientId,
    storedToken.userId,
    requestedScopes.join(' '),
    body.code_verifier
  );
  if (!rotated) {
    await prisma.oAuthAccessToken.updateMany({
      where: { clientId, userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return tokenResponse(rateLimit, 'invalid_grant');
  }

  await ensureMcpConnection(clientId, storedToken.userId, rotated.accessToken.scope);
  return NextResponse.json(
    {
      access_token: rotated.accessToken.token,
      token_type: 'Bearer',
      expires_in: Math.floor((rotated.accessToken.expires_at - Date.now()) / 1000),
      refresh_token: rotated.refreshToken.token,
      scope: rotated.accessToken.scope,
    },
    { status: 200, headers: tokenHeaders(rateLimit) }
  );
}

function getClientCredentials(
  request: NextRequest,
  body: Record<string, string>
): { clientId: string | undefined; clientSecret: string | undefined } {
  let clientId = body.client_id;
  let clientSecret = body.client_secret;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const [id, secret] = Buffer.from(auth.slice(6), 'base64').toString('utf-8').split(':');
    clientId ??= id;
    clientSecret ??= secret;
  }
  return { clientId, clientSecret };
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(getClientIp(request), RATE_LIMITS.token);
  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }

  const body = await readOAuthRequestBody(request);
  if (!body) return tokenResponse(rateLimit, 'invalid_request');

  const expectedResource = getMcpResourceUri(getMcpPublicBaseUrl(request));
  if (!isMcpResource(body.resource, expectedResource)) {
    return tokenResponse(rateLimit, 'invalid_target');
  }

  const { clientId, clientSecret } = getClientCredentials(request, body);
  if (!clientId) return tokenResponse(rateLimit, 'invalid_client', 401);

  const client = await validateClient(clientId, clientSecret);
  if (!client) return tokenResponse(rateLimit, 'invalid_client', 401);

  if (body.grant_type === 'authorization_code') {
    return handleAuthorizationCodeGrant(body, clientId, rateLimit);
  }
  if (body.grant_type === 'refresh_token') {
    return handleRefreshGrant(body, clientId, rateLimit);
  }
  return tokenResponse(rateLimit, 'unsupported_grant_type');
}
