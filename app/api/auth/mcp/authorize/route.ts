import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuthorizationCode, getConsent, createConsent, validateClient } from '@/lib/mcp/auth/provider';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMITS } from '@/lib/mcp/auth/rate-limit';
import { hashToken } from '@/lib/mcp/auth/crypto';
import { OAuthScopes } from '@/lib/mcp/auth/types';

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
  const scope = searchParams.get('scope') ?? '';
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  
  if (!clientId || !redirectUri || responseType !== 'code' || !state || !codeChallenge || codeChallengeMethod !== 'S256') {
    return NextResponse.redirect(new URL(`/mcp/authorize?error=invalid_request&state=${state}`, request.url));
  }
  
  const client = await validateClient(clientId);
  if (!client) {
    return NextResponse.redirect(new URL(`/mcp/authorize?error=unauthorized_client&state=${state}`, request.url));
  }
  
  if (!client.redirect_uris.includes(redirectUri)) {
    return NextResponse.redirect(new URL(`/mcp/authorize?error=invalid_request&state=${state}`, request.url));
  }
  
  if (!session?.user?.id) {
    const signInUrl = new URL('/api/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }
  
  const userId = session.user.id;
  const scopes = scope.split(' ').filter(s => OAuthScopes.includes(s as any));
  
  if (scopes.length === 0) {
    return NextResponse.redirect(new URL(`/mcp/authorize?error=invalid_scope&state=${state}`, request.url));
  }
  
  // Check for existing consent
  const existingConsent = await getConsent(userId, clientId);
  const needsConsent = !existingConsent || !scopes.every(s => existingConsent.includes(s));
  
  if (needsConsent) {
    // Show consent screen
    return NextResponse.redirect(
      new URL(
        `/mcp/consent?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}`,
        request.url
      )
    );
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
  
  const formData = await request.formData();
  const clientId = formData.get('client_id') as string;
  const redirectUri = formData.get('redirect_uri') as string;
  const scope = formData.get('scope') as string;
  const state = formData.get('state') as string;
  const codeChallenge = formData.get('code_challenge') as string;
  const codeChallengeMethod = formData.get('code_challenge_method') as string;
  const action = formData.get('action') as string; // 'allow' or 'deny'
  
  if (action === 'deny') {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('state', state);
    return NextResponse.redirect(redirectUrl);
  }
  
  const client = await validateClient(clientId);
  if (!client || !client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
  }
  
  const scopes = scope.split(' ').filter(s => OAuthScopes.includes(s as any));
  if (scopes.length === 0) {
    return NextResponse.json({ error: 'invalid_scope' }, { status: 400 });
  }
  
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
    headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.authorize),
  });
}