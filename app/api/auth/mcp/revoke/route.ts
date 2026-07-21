import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateClient, hashToken, revokeToken } from '@/lib/mcp/auth/provider';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMITS } from '@/lib/mcp/auth/rate-limit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, RATE_LIMITS.token);
  
  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }
  
  const contentType = request.headers.get('content-type') ?? '';
  let body: Record<string, string>;
  
  if (contentType.includes('application/json')) {
    body = await request.json() as Record<string, string>;
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(
      Array.from(formData.entries()).map(([k, v]) => [k, v.toString()])
    );
  }
  
  const token = body.token;
  const tokenTypeHint = body.token_type_hint;
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
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }
  
  let authenticatedClientId: string | null = null;
  
  if (clientSecret) {
    const client = await validateClient(clientId, clientSecret);
    if (client) authenticatedClientId = client.client_id;
  } else if (clientId) {
    const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
    if (client && !client.clientSecretHash) {
      authenticatedClientId = client.id;
    }
  }
  
  const revoked = await revokeToken(token, tokenTypeHint, authenticatedClientId ?? undefined);
  
  return new NextResponse(null, {
    status: 200,
    headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
  });
}