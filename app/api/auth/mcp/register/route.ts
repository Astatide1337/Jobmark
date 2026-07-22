import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/mcp/auth/provider';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMITS } from '@/lib/mcp/auth/rate-limit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, { ...RATE_LIMITS.authorize, maxRequests: 10 });
  
  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit, { ...RATE_LIMITS.authorize, maxRequests: 10 }),
    });
  }
  
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  
  const redirectUris = body.redirect_uris as string[] | undefined;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
  }
  
  // Validate all redirect URIs are HTTPS (except localhost for development)
  for (const uri of redirectUris) {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
    }
  }
  
  const grantTypes = (body.grant_types as string[]) ?? ['authorization_code', 'refresh_token'];
  const validGrantTypes = ['authorization_code', 'refresh_token'];
  if (!grantTypes.every(g => validGrantTypes.includes(g))) {
    return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 });
  }
  
  const responseTypes = (body.response_types as string[]) ?? ['code'];
  if (!responseTypes.every(r => r === 'code')) {
    return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 });
  }
  
  const tokenEndpointAuthMethod = (body.token_endpoint_auth_method as string) ?? 'none';
  const validAuthMethods = ['client_secret_post', 'client_secret_basic', 'none'];
  if (!validAuthMethods.includes(tokenEndpointAuthMethod)) {
    return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 });
  }
  
  const client = await createClient({
    redirect_uris: redirectUris,
    grant_types: grantTypes as ('authorization_code' | 'refresh_token')[],
    response_types: responseTypes as ('code')[],
    scope: (body.scope as string) ?? undefined,
    token_endpoint_auth_method: tokenEndpointAuthMethod as 'client_secret_post' | 'client_secret_basic' | 'none',
    client_name: (body.client_name as string) ?? undefined,
  });
  
  const response: Record<string, unknown> = {
    client_id: client.client_id,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
    grant_types: client.grant_types,
    response_types: client.response_types,
    scope: client.scope,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
  };
  
  if (client.client_secret) {
    response.client_secret = client.client_secret;
    response.client_id_issued_at = Math.floor(Date.now() / 1000);
    response.client_secret_expires_at = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  }
  
  return NextResponse.json(response, {
    status: 201,
    headers: {
      ...createRateLimitHeaders(rateLimit, { ...RATE_LIMITS.authorize, maxRequests: 10 }),
      'Cache-Control': 'no-store',
    },
  });
}
