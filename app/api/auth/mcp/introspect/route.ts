import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateClient, validateAccessToken } from '@/lib/mcp/auth/provider';
import {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/mcp/auth/rate-limit';
import { readOAuthRequestBody } from '@/lib/mcp/auth/request-body';
import { getMcpPublicBaseUrl } from '@/lib/mcp/auth/public-origin';
import { getMcpResourceUri } from '@/lib/mcp/auth/resource';

function introspectionHeaders(rateLimit: Awaited<ReturnType<typeof checkRateLimit>>): HeadersInit {
  return {
    ...createRateLimitHeaders(rateLimit, RATE_LIMITS.introspect),
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, RATE_LIMITS.introspect);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { active: false },
      {
        status: 429,
        headers: introspectionHeaders(rateLimit),
      }
    );
  }

  const body = await readOAuthRequestBody(request);
  if (!body) {
    return NextResponse.json(
      { active: false },
      { status: 200, headers: introspectionHeaders(rateLimit) }
    );
  }

  const token = body.token;
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
    return NextResponse.json(
      { active: false },
      {
        status: 200,
        headers: introspectionHeaders(rateLimit),
      }
    );
  }

  let authenticatedClientId: string | null = null;

  if (clientSecret) {
    const client = await validateClient(clientId, clientSecret);
    if (client) authenticatedClientId = client.client_id;
  } else if (clientId) {
    const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
    if (client && !client.clientSecretHash) {
      authenticatedClientId = client.clientId;
    }
  }

  if (!authenticatedClientId) {
    return NextResponse.json(
      { active: false },
      {
        status: 200,
        headers: introspectionHeaders(rateLimit),
      }
    );
  }

  const validation = await validateAccessToken(token);
  if (!validation || validation.clientId !== authenticatedClientId) {
    return NextResponse.json(
      { active: false },
      {
        status: 200,
        headers: introspectionHeaders(rateLimit),
      }
    );
  }

  return NextResponse.json(
    {
      active: true,
      scope: validation.scope,
      client_id: validation.clientId,
      username: validation.userId,
      token_type: 'Bearer',
      exp: validation.exp,
      iat: validation.iat,
      sub: validation.userId,
      aud: getMcpResourceUri(getMcpPublicBaseUrl(request)),
    },
    {
      status: 200,
      headers: introspectionHeaders(rateLimit),
    }
  );
}
