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
import { isValidOAuthRedirectUri } from '@/lib/mcp/auth/redirect-uri';
import { getMcpPublicBaseUrl } from '@/lib/mcp/auth/public-origin';
import { getMcpResourceUri, isMcpResource } from '@/lib/mcp/auth/resource';
import { getComplianceStatus } from '@/lib/compliance';

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

function isValidCodeChallenge(codeChallenge: string): boolean {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(codeChallenge);
}

function getFormString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

type AuthorizationQuery = {
  clientId: string;
  resource: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  prompt: string | null;
};

function parseAuthorizationQuery(
  searchParams: URLSearchParams,
  expectedResource: string
): AuthorizationQuery | null {
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const scope = normalizeScope(searchParams.get('scope') ?? '');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const resourceValues = searchParams.getAll('resource');
  if (
    !clientId ||
    !redirectUri ||
    responseType !== 'code' ||
    !state ||
    resourceValues.length !== 1 ||
    !isMcpResource(resourceValues[0], expectedResource) ||
    !codeChallenge ||
    codeChallengeMethod !== 'S256' ||
    !isValidOAuthRedirectUri(redirectUri) ||
    !isValidCodeChallenge(codeChallenge) ||
    !getScopes(scope)
  ) {
    return null;
  }
  return {
    clientId,
    resource: resourceValues[0],
    redirectUri,
    scope,
    state,
    codeChallenge,
    prompt: searchParams.get('prompt'),
  };
}

function buildSignInRedirect(request: NextRequest): NextResponse {
  // MCP clients must be sent to the public host. The request URL can be the
  // pod address (0.0.0.0:3000) when traffic arrives through a tunnel.
  const authBaseUrl = getMcpPublicBaseUrl(request);
  const callbackUrl = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, authBaseUrl);
  const signInUrl = new URL('/api/auth/signin', authBaseUrl);
  signInUrl.searchParams.set('callbackUrl', callbackUrl.toString());
  return NextResponse.redirect(signInUrl);
}

async function buildConsentRedirect(
  request: NextRequest,
  params: AuthorizationQuery,
  userId: string,
  clientId: string,
  scope: string
): Promise<NextResponse> {
  const consentUrl = new URL('/mcp/consent', getMcpPublicBaseUrl(request));
  consentUrl.searchParams.set('client_id', clientId);
  consentUrl.searchParams.set('resource', params.resource);
  consentUrl.searchParams.set('redirect_uri', params.redirectUri);
  consentUrl.searchParams.set('scope', scope);
  consentUrl.searchParams.set('state', params.state);
  consentUrl.searchParams.set('code_challenge', params.codeChallenge);
  consentUrl.searchParams.set('code_challenge_method', 'S256');
  consentUrl.searchParams.set(
    'transaction',
    await createAuthorizationTransaction({
      clientId,
      resource: params.resource,
      redirectUri: params.redirectUri,
      responseType: 'code',
      scope,
      state: params.state,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: 'S256',
      userId,
    })
  );
  return NextResponse.redirect(consentUrl);
}

type AuthorizationForm = {
  clientId: string | null;
  resource: string | null;
  redirectUri: string | null;
  responseType: string | null;
  scope: string | null;
  state: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  transaction: string | null;
  action: string | null;
};

function parseAuthorizationForm(formData: FormData): AuthorizationForm {
  const submittedScope = formData.get('scope');
  return {
    clientId: getFormString(formData, 'client_id'),
    resource: getFormString(formData, 'resource'),
    redirectUri: getFormString(formData, 'redirect_uri'),
    responseType: getFormString(formData, 'response_type'),
    scope: typeof submittedScope === 'string' ? submittedScope : null,
    state: getFormString(formData, 'state'),
    codeChallenge: getFormString(formData, 'code_challenge'),
    codeChallengeMethod: getFormString(formData, 'code_challenge_method'),
    transaction: getFormString(formData, 'transaction'),
    action: getFormString(formData, 'action'),
  };
}

function isValidAuthorizationForm(form: AuthorizationForm): boolean {
  return Boolean(
    form.clientId &&
    form.resource &&
    form.redirectUri &&
    form.responseType === 'code' &&
    (form.action !== 'allow' || form.scope) &&
    form.state &&
    form.codeChallenge &&
    form.codeChallengeMethod === 'S256' &&
    form.transaction &&
    (form.action === 'allow' || form.action === 'deny') &&
    isValidOAuthRedirectUri(form.redirectUri) &&
    isValidCodeChallenge(form.codeChallenge)
  );
}

function matchesAuthorizationTransaction(
  claims: Awaited<ReturnType<typeof verifyAuthorizationTransaction>>,
  form: AuthorizationForm
): boolean {
  if (
    !claims ||
    !form.clientId ||
    !form.resource ||
    !form.redirectUri ||
    !form.state ||
    !form.codeChallenge
  ) {
    return false;
  }
  return (
    claims.clientId === form.clientId &&
    claims.resource === form.resource &&
    claims.redirectUri === form.redirectUri &&
    claims.responseType === form.responseType &&
    claims.state === form.state &&
    claims.codeChallenge === form.codeChallenge &&
    claims.codeChallengeMethod === form.codeChallengeMethod
  );
}

function getSelectedScopes(
  transactionScope: string,
  selectedScope: string | null,
  clientScope: string
): string[] | null {
  const requestedScopes = getScopes(transactionScope);
  const selectedScopes = getScopes(selectedScope ?? '');
  if (
    !requestedScopes ||
    !selectedScopes ||
    selectedScopes.length === 0 ||
    !selectedScopes.every(scope => requestedScopes.includes(scope))
  ) {
    return null;
  }
  const clientScopes = getScopes(clientScope);
  if (!clientScopes || !selectedScopes.every(scope => clientScopes.includes(scope))) return null;
  return selectedScopes;
}

function invalidRequestResponse(message = 'invalid_request'): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function authorizationErrorRedirect(
  request: NextRequest,
  error: 'invalid_request' | 'invalid_target' | 'unauthorized_client' | 'invalid_scope',
  state: string | null
): NextResponse {
  const url = new URL('/mcp/authorize', getMcpPublicBaseUrl(request));
  url.searchParams.set('error', error);
  if (state) url.searchParams.set('state', state);
  return NextResponse.redirect(url);
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
  const expectedResource = getMcpResourceUri(getMcpPublicBaseUrl(request));
  const requestedResources = request.nextUrl.searchParams.getAll('resource');
  if (requestedResources.length !== 1 || !isMcpResource(requestedResources[0], expectedResource)) {
    return authorizationErrorRedirect(
      request,
      'invalid_target',
      request.nextUrl.searchParams.get('state')
    );
  }

  const params = parseAuthorizationQuery(request.nextUrl.searchParams, expectedResource);
  if (!params) {
    const state = request.nextUrl.searchParams.get('state');
    return authorizationErrorRedirect(request, 'invalid_request', state);
  }

  const client = await resolveClientId(params.clientId);
  if (!client) {
    return authorizationErrorRedirect(request, 'unauthorized_client', params.state);
  }

  if (!isRegisteredRedirectUri(client, params.redirectUri)) {
    return authorizationErrorRedirect(request, 'invalid_request', params.state);
  }

  if (!session?.user?.id) {
    return buildSignInRedirect(request);
  }

  if (!(await getComplianceStatus(session.user.id)).isComplete) {
    const onboardingUrl = new URL('/onboarding', getMcpPublicBaseUrl(request));
    onboardingUrl.searchParams.set(
      'callbackUrl',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(onboardingUrl);
  }

  const userId = session.user.id;
  const scopes = getScopes(params.scope);
  if (!scopes) {
    return authorizationErrorRedirect(request, 'invalid_scope', params.state);
  }

  const clientScopes = getScopes(client.scope);
  if (!clientScopes || !scopes.every(requestedScope => clientScopes.includes(requestedScope))) {
    return authorizationErrorRedirect(request, 'invalid_scope', params.state);
  }

  // Check for existing consent
  const existingConsent = await getConsent(userId, params.clientId);
  const consentWasRequested = params.prompt?.split(' ').includes('consent') ?? false;
  const needsConsent =
    consentWasRequested || !existingConsent || !scopes.every(s => existingConsent.includes(s));

  if (needsConsent) {
    return buildConsentRedirect(request, params, userId, params.clientId, params.scope);
  }

  // Create authorization code
  const authCode = await createAuthorizationCode(
    params.clientId,
    userId,
    params.redirectUri,
    params.codeChallenge,
    scopes.join(' '),
    params.state
  );

  const redirectUrl = new URL(params.redirectUri);
  redirectUrl.searchParams.set('code', authCode.code);
  redirectUrl.searchParams.set('state', params.state);

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

  if (!(await getComplianceStatus(session.user.id)).isComplete) {
    return NextResponse.redirect(new URL('/onboarding', getMcpPublicBaseUrl(request)), 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidRequestResponse();
  }
  const form = parseAuthorizationForm(formData);
  if (!isValidAuthorizationForm(form) || !form.transaction || !session.user.id) {
    return invalidRequestResponse();
  }

  const transactionClaims = await verifyAuthorizationTransaction(form.transaction, session.user.id);
  const expectedResource = getMcpResourceUri(getMcpPublicBaseUrl(request));
  if (
    !isMcpResource(form.resource, expectedResource) ||
    !matchesAuthorizationTransaction(transactionClaims, form)
  ) {
    return invalidRequestResponse();
  }

  const client = await resolveClientId(form.clientId!);
  if (!client || !isRegisteredRedirectUri(client, form.redirectUri!)) {
    return invalidRequestResponse('invalid_client');
  }

  if (form.action === 'deny') {
    const redirectUrl = new URL(form.redirectUri!);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('state', form.state!);
    return NextResponse.redirect(redirectUrl, 303);
  }

  const scopes = getSelectedScopes(transactionClaims!.scope, form.scope, client.scope);
  if (!scopes) return invalidRequestResponse('invalid_scope');

  await createConsent(session.user.id, form.clientId!, scopes.join(' '));

  const authCode = await createAuthorizationCode(
    form.clientId!,
    session.user.id,
    form.redirectUri!,
    form.codeChallenge!,
    scopes.join(' '),
    form.state!
  );

  const redirectUrl = new URL(form.redirectUri!);
  redirectUrl.searchParams.set('code', authCode.code);
  redirectUrl.searchParams.set('state', form.state!);

  return NextResponse.redirect(redirectUrl, {
    status: 303,
    headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.authorize),
  });
}
