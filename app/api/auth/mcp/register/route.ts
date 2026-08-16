import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/mcp/auth/provider';
import { areValidOAuthRedirectUris } from '@/lib/mcp/auth/redirect-uri';
import { OAuthScopes } from '@/lib/mcp/auth/types';
import {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/mcp/auth/rate-limit';

const DATABASE_RETRY_DELAYS_MS = [750, 1500];
const VALID_GRANT_TYPES = ['authorization_code', 'refresh_token'] as const;
const VALID_AUTH_METHODS = ['client_secret_post', 'client_secret_basic', 'none'] as const;
const MAX_REDIRECT_URIS = 10;
const MAX_REDIRECT_URI_LENGTH = 2_048;
const MAX_CLIENT_NAME_LENGTH = 120;
const MAX_SCOPE_LENGTH = 256;

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
  const redirectUris = parseRedirectUris(body.redirect_uris);
  const grantTypes = parseGrantTypes(body.grant_types);
  const responseTypes = parseResponseTypes(body.response_types);
  const tokenEndpointAuthMethod = parseAuthMethod(body.token_endpoint_auth_method);
  const clientName = parseClientName(body.client_name);
  const scope = parseScope(body.scope);
  if (
    !redirectUris ||
    !grantTypes ||
    !responseTypes ||
    !tokenEndpointAuthMethod ||
    clientName === null ||
    scope === null
  ) {
    return null;
  }

  return {
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    response_types: responseTypes,
    scope: scope ?? undefined,
    token_endpoint_auth_method: tokenEndpointAuthMethod,
    client_name: clientName ?? undefined,
  };
}

function parseRedirectUris(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_REDIRECT_URIS ||
    !value.every(uri => typeof uri === 'string' && uri.length <= MAX_REDIRECT_URI_LENGTH)
  ) {
    return null;
  }
  return areValidOAuthRedirectUris(value) ? value : null;
}

function parseGrantTypes(value: unknown): (typeof VALID_GRANT_TYPES)[number][] | null {
  const grantTypes = value === undefined ? [...VALID_GRANT_TYPES] : value;
  if (
    !Array.isArray(grantTypes) ||
    grantTypes.length === 0 ||
    grantTypes.length > VALID_GRANT_TYPES.length ||
    !grantTypes.every(
      (grantType): grantType is (typeof VALID_GRANT_TYPES)[number] =>
        typeof grantType === 'string' &&
        VALID_GRANT_TYPES.includes(grantType as (typeof VALID_GRANT_TYPES)[number])
    ) ||
    !grantTypes.includes('authorization_code')
  ) {
    return null;
  }
  return grantTypes;
}

function parseResponseTypes(value: unknown): 'code'[] | null {
  if (value === undefined) return ['code'];
  if (!Array.isArray(value) || value.length !== 1 || value[0] !== 'code') return null;
  return ['code'];
}

function parseAuthMethod(value: unknown): (typeof VALID_AUTH_METHODS)[number] | null {
  const method = value ?? 'none';
  return typeof method === 'string' &&
    VALID_AUTH_METHODS.includes(method as (typeof VALID_AUTH_METHODS)[number])
    ? (method as (typeof VALID_AUTH_METHODS)[number])
    : null;
}

function parseClientName(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > MAX_CLIENT_NAME_LENGTH
  ) {
    return null;
  }
  return value.trim();
}

function parseScope(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > MAX_SCOPE_LENGTH) return null;
  const scopes = value.trim().split(/\s+/).filter(Boolean);
  if (
    scopes.length === 0 ||
    scopes.some(scope => !OAuthScopes.includes(scope as (typeof OAuthScopes)[number]))
  ) {
    return null;
  }
  return scopes.join(' ');
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
      clientNameLength: typeof body.client_name === 'string' ? body.client_name.length : 0,
      redirectUriCount: Array.isArray(body.redirect_uris) ? body.redirect_uris.length : 0,
      tokenEndpointAuthMethod: body.token_endpoint_auth_method ?? 'none',
    })
  );

  const metadata = parseRegistrationMetadata(body);
  if (!metadata) return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 });

  let client;
  try {
    client = await createClientWithRetry(metadata, requestId);
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
        error_description: 'Jobmark could not connect this assistant. Try again.',
        request_id: requestId,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  console.info(
    JSON.stringify({
      event: 'mcp_client_registration_completed',
      requestId,
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
