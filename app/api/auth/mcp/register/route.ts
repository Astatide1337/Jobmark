import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/mcp/auth/provider';
import { areValidOAuthRedirectUris } from '@/lib/mcp/auth/redirect-uri';
import {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/mcp/auth/rate-limit';

const DATABASE_RETRY_DELAYS_MS = [750, 1500];
const VALID_GRANT_TYPES = ['authorization_code', 'refresh_token'] as const;
const VALID_AUTH_METHODS = ['client_secret_post', 'client_secret_basic', 'none'] as const;

type RegistrationMetadata = Parameters<typeof createClient>[0];

function isTransientDatabaseConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    ('code' in error && error.code === 'P1001') ||
    error.message.includes("Can't reach database server")
  );
}

async function createClientWithRetry(
  metadata: Parameters<typeof createClient>[0],
  requestId: string
): Promise<Awaited<ReturnType<typeof createClient>>> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await createClient(metadata);
    } catch (error) {
      const delay = DATABASE_RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isTransientDatabaseConnectionError(error)) throw error;

      console.warn(
        JSON.stringify({
          event: 'mcp_client_registration_retrying',
          requestId,
          attempt: attempt + 2,
          delayMs: delay,
        })
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function parseRegistrationMetadata(body: Record<string, unknown>): RegistrationMetadata | null {
  const redirectUris = body.redirect_uris as string[] | undefined;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) return null;
  if (!redirectUris.every(uri => typeof uri === 'string') || !areValidOAuthRedirectUris(redirectUris)) {
    return null;
  }

  const requestedGrantTypes = body.grant_types;
  let grantTypes: readonly string[] = [...VALID_GRANT_TYPES];
  if (requestedGrantTypes !== undefined) {
    if (!Array.isArray(requestedGrantTypes)) return null;
    grantTypes = requestedGrantTypes;
  }
  if (
    grantTypes.some(grantType => typeof grantType !== 'string') ||
    !grantTypes.includes('authorization_code')
  ) {
    return null;
  }

  const supportedGrantTypes = grantTypes.filter(
    (grantType): grantType is (typeof VALID_GRANT_TYPES)[number] =>
      VALID_GRANT_TYPES.includes(grantType as (typeof VALID_GRANT_TYPES)[number])
  );
  const responseTypes = body.response_types;
  if (
    (responseTypes !== undefined && !Array.isArray(responseTypes)) ||
    (Array.isArray(responseTypes) &&
      (responseTypes.length === 0 || responseTypes.some(responseType => responseType !== 'code')))
  ) {
    return null;
  }

  const tokenEndpointAuthMethod = (body.token_endpoint_auth_method as string) ?? 'none';
  if (!VALID_AUTH_METHODS.includes(tokenEndpointAuthMethod as (typeof VALID_AUTH_METHODS)[number])) {
    return null;
  }

  return {
    redirect_uris: redirectUris,
    grant_types: supportedGrantTypes,
    response_types: (responseTypes ?? ['code']) as 'code'[],
    scope: (body.scope as string) ?? undefined,
    token_endpoint_auth_method: tokenEndpointAuthMethod as
      | 'client_secret_post'
      | 'client_secret_basic'
      | 'none',
    client_name: (body.client_name as string) ?? undefined,
  };
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
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
    console.warn(
      JSON.stringify({
        event: 'mcp_client_registration_rejected',
        requestId,
        error: 'invalid_json',
      })
    );
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  console.info(
    JSON.stringify({
      event: 'mcp_client_registration_started',
      requestId,
      clientName: typeof body.client_name === 'string' ? body.client_name : 'Unknown Client',
      redirectUriCount: Array.isArray(body.redirect_uris) ? body.redirect_uris.length : 0,
      tokenEndpointAuthMethod: body.token_endpoint_auth_method ?? 'none',
    })
  );

  const metadata = parseRegistrationMetadata(body);
  if (!metadata) return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 });

  let client;
  try {
    client = await createClientWithRetry(
      metadata,
      requestId
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'mcp_client_registration_failed',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'Could not register OAuth client',
        request_id: requestId,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  console.info(
    JSON.stringify({
      event: 'mcp_client_registration_completed',
      requestId,
      clientId: client.client_id,
    })
  );

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
