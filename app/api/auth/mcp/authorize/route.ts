import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createAuthorizationCode,
  getConsent,
  createConsent,
  resolveClientId,
} from '@/lib/mcp/auth/provider';
import {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/mcp/auth/rate-limit';
import { OAuthScopes, type OAuthScope } from '@/lib/mcp/auth/types';
import {
  createAuthorizationTransaction,
  verifyAuthorizationTransaction,
} from '@/lib/mcp/auth/authorization-transaction';

function isOAuthScope(scope: string): scope is OAuthScope {
  return OAuthScopes.includes(scope as OAuthScope);
}

function normalizeScope(scope: string): string {
  return scope.trim().split(/\s+/).filter(Boolean).join(' ');
}

function getScopes(scope: string): string[] | null {
  const normalized = normalizeScope(scope);
  if (!normalized) return null;

  const scopes = normalized.split(' ');
  if (!scopes.every(isOAuthScope)) return null;
  return scopes;
}

function isRegisteredRedirectUri(
  client: { redirect_uris: string[] },
  redirectUri: string
): boolean {
  return client.redirect_uris.includes(redirectUri);
}

function isValidRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    return Boolean(url.protocol && url.host) && !url.hash;
  } catch {
    return false;
  }
}

function isValidCodeChallenge(codeChallenge: string): boolean {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(codeChallenge);
}

function getFormString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function invalidRequestResponse(message = 'invalid_request'): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, RATE_LIMITS.authorize);

  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.authorize),
    });
  }

  const session = await auth();
  const searchParams = request.nextUrl.searchParams;

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const scope = normalizeScope(searchParams.get('scope') ?? '');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const prompt = searchParams.get('prompt');

  if (
    !clientId ||
    !redirectUri ||
    responseType !== 'code' ||
    !state ||
    !codeChallenge ||
    codeChallengeMethod !== 'S256' ||
    !isValidRedirectUri(redirectUri) ||
    !isValidCodeChallenge(codeChallenge) ||
    !getScopes(scope)
  ) {
    return NextResponse.redirect(
      new URL(`/mcp/authorize?error=invalid_request&state=${state}`, request.url)
    );
  }

  const client = await resolveClientId(clientId);
  if (!client) {
    return NextResponse.redirect(
      new URL(`/mcp/authorize?error=unauthorized_client&state=${state}`, request.url)
    );
  }

  if (!isRegisteredRedirectUri(client, redirectUri)) {
    return NextResponse.redirect(
      new URL(`/mcp/authorize?error=invalid_request&state=${state}`, request.url)
    );
  }

  if (!session?.user?.id) {
    // The public MCP hostname must stay reachable by server-side clients, while
    // interactive sign-in remains on the protected preview hostname registered
    // with Google. Continue the entire browser flow there so the session cookie
    // and OAuth callback share the same origin.
    const authBaseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? request.nextUrl.origin;
    const callbackUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      authBaseUrl
    );
    const signInUrl = new URL('/api/auth/signin', authBaseUrl);
    signInUrl.searchParams.set('callbackUrl', callbackUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  const userId = session.user.id;
  const scopes = getScopes(scope);
  if (!scopes) {
    return NextResponse.redirect(
      new URL(`/mcp/authorize?error=invalid_scope&state=${state}`, request.url)
    );
  }

  const clientScopes = getScopes(client.scope);
  if (!clientScopes || !scopes.every(requestedScope => clientScopes.includes(requestedScope))) {
    return NextResponse.redirect(
      new URL(`/mcp/authorize?error=invalid_scope&state=${state}`, request.url)
    );
  }

  // Check for existing consent
  const existingConsent = await getConsent(userId, clientId);
  const consentWasRequested = prompt?.split(' ').includes('consent') ?? false;
  const needsConsent =
    consentWasRequested || !existingConsent || !scopes.every(s => existingConsent.includes(s));

  if (needsConsent) {
    // Show consent screen
    const consentUrl = new URL('/mcp/consent', request.url);
    consentUrl.searchParams.set('client_id', clientId);
    consentUrl.searchParams.set('redirect_uri', redirectUri);
    consentUrl.searchParams.set('scope', scope);
    consentUrl.searchParams.set('state', state);
    consentUrl.searchParams.set('code_challenge', codeChallenge);
    consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
    consentUrl.searchParams.set(
      'transaction',
      await createAuthorizationTransaction({
        clientId,
        redirectUri,
        responseType: 'code',
        scope,
        state,
        codeChallenge,
        codeChallengeMethod: 'S256',
        userId,
      })
    );
    return NextResponse.redirect(consentUrl);
  }

  // Create authorization code
  const authCode = await createAuthorizationCode(
    clientId,
    userId,
    redirectUri,
    codeChallenge,
    scopes.join(' '),
    state
  );

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authCode.code);
  redirectUrl.searchParams.set('state', state);

  return NextResponse.redirect(redirectUrl, {
    headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.authorize),
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, RATE_LIMITS.authorize);

  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.authorize),
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidRequestResponse();
  }
  const clientId = getFormString(formData, 'client_id');
  const redirectUri = getFormString(formData, 'redirect_uri');
  const responseType = getFormString(formData, 'response_type');
  const submittedScope = formData.get('scope');
  const scope = typeof submittedScope === 'string' ? submittedScope : null;
  const state = getFormString(formData, 'state');
  const codeChallenge = getFormString(formData, 'code_challenge');
  const codeChallengeMethod = getFormString(formData, 'code_challenge_method');
  const transaction = getFormString(formData, 'transaction');
  const action = getFormString(formData, 'action'); // 'allow' or 'deny'

  if (
    !clientId ||
    !redirectUri ||
    responseType !== 'code' ||
    (action === 'allow' && !scope) ||
    !state ||
    !codeChallenge ||
    codeChallengeMethod !== 'S256' ||
    !transaction ||
    (action !== 'allow' && action !== 'deny') ||
    !isValidRedirectUri(redirectUri) ||
    !isValidCodeChallenge(codeChallenge)
  ) {
    return invalidRequestResponse();
  }

  const transactionClaims = await verifyAuthorizationTransaction(transaction, session.user.id);
  if (
    !transactionClaims ||
    transactionClaims.clientId !== clientId ||
    transactionClaims.redirectUri !== redirectUri ||
    transactionClaims.responseType !== responseType ||
    transactionClaims.state !== state ||
    transactionClaims.codeChallenge !== codeChallenge ||
    transactionClaims.codeChallengeMethod !== codeChallengeMethod
  ) {
    return invalidRequestResponse();
  }

  const client = await resolveClientId(clientId);
  if (!client || !isRegisteredRedirectUri(client, redirectUri)) {
    return invalidRequestResponse('invalid_client');
  }

  if (action === 'deny') {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('state', state);
    return NextResponse.redirect(redirectUrl, 303);
  }

  const requestedScopes = getScopes(transactionClaims.scope);
  const selectedScopes = getScopes(scope ?? '');
  if (
    !requestedScopes ||
    !selectedScopes ||
    !selectedScopes.every(selectedScope => requestedScopes.includes(selectedScope))
  ) {
    return invalidRequestResponse('invalid_scope');
  }

  const clientScopes = getScopes(client.scope);
  if (
    !clientScopes ||
    !selectedScopes.every(selectedScope => clientScopes.includes(selectedScope))
  ) {
    return invalidRequestResponse('invalid_scope');
  }

  if (selectedScopes.length === 0) {
    return invalidRequestResponse('invalid_scope');
  }

  const scopes = selectedScopes;

  await createConsent(session.user.id, clientId, scopes.join(' '));

  const authCode = await createAuthorizationCode(
    clientId,
    session.user.id,
    redirectUri,
    codeChallenge,
    scopes.join(' '),
    state
  );

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authCode.code);
  redirectUrl.searchParams.set('state', state);

  return NextResponse.redirect(redirectUrl, {
    status: 303,
    headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.authorize),
  });
}
