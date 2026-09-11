import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateClient, hashToken, revokeToken } from '@/lib/mcp/auth/provider';
import {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/mcp/auth/rate-limit';
import { readOAuthRequestBody } from '@/lib/mcp/auth/request-body';

function revocationHeaders(rateLimit: Awaited<ReturnType<typeof checkRateLimit>>): HeadersInit {
  return {
    ...createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, RATE_LIMITS.token);

  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }

  const body = await readOAuthRequestBody(request);
  if (!body) {
    return NextResponse.json(
      { error: 'invalid_request' },
      { status: 400, headers: revocationHeaders(rateLimit) }
    );
  }

  const token = body.token;
  const tokenTypeHint = body.token_type_hint;
  if (tokenTypeHint && !['access_token', 'refresh_token'].includes(tokenTypeHint)) {
    return NextResponse.json(
      { error: 'unsupported_token_type' },
      { status: 400, headers: revocationHeaders(rateLimit) }
    );
  }
  let clientId = body.client_id;
  let clientSecret = body.client_secret;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
    const [id, secret] = credentials.split(':');
    clientId = clientId ?? id;
    clientSecret = clientSecret ?? secret;
  }

  if (!token) {
    return new NextResponse(null, {
      status: 200,
      headers: revocationHeaders(rateLimit),
    });
  }

  let authenticatedClientId: string | null = null;

  if (clientSecret && clientId) {
    const client = await validateClient(clientId, clientSecret);
    if (client) authenticatedClientId = client.client_id;
  } else if (clientId) {
    const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
    if (client && !client.clientSecretHash) {
      authenticatedClientId = client.clientId;
    }
  }

  // Never pass an unauthenticated request through to revokeToken: an omitted
  // client ID means revokeToken would otherwise operate without a client
  // filter and could revoke another client's token.
  if (!authenticatedClientId) {
    return NextResponse.json(
      { error: 'invalid_client' },
      { status: 401, headers: revocationHeaders(rateLimit) }
    );
  }

  await revokeToken(token, tokenTypeHint, authenticatedClientId);

  return new NextResponse(null, {
    status: 200,
    headers: revocationHeaders(rateLimit),
  });
}
