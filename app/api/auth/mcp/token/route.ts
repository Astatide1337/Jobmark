import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateClient, hashToken, createAccessToken, createRefreshToken, rotateRefreshToken } from '@/lib/mcp/auth/provider';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMITS } from '@/lib/mcp/auth/rate-limit';
import { verifyPKCE } from '@/lib/mcp/auth/crypto';

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
  
  const grantType = body.grant_type;
  
  // Extract client credentials
  let clientId = body.client_id;
  let clientSecret = body.client_secret;
  
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
    const [id, secret] = credentials.split(':');
    clientId = clientId ?? id;
    clientSecret = clientSecret ?? secret;
  }
  
  if (!clientId) {
    return NextResponse.json({ error: 'invalid_client' }, {
      status: 401,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }
  
  const client = await validateClient(clientId, clientSecret);
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, {
      status: 401,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }
  
  if (grantType === 'authorization_code') {
    const code = body.code;
    const redirectUri = body.redirect_uri;
    const codeVerifier = body.code_verifier;
    
    if (!code || !redirectUri) {
      return NextResponse.json({ error: 'invalid_request' }, {
        status: 400,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
      });
    }
    
    const codeHash = hashToken(code);
    const authCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { code: codeHash } });
    
    if (!authCode || authCode.clientId !== clientId || authCode.redirectUri !== redirectUri || authCode.expiresAt < new Date()) {
      return NextResponse.json({ error: 'invalid_grant' }, {
        status: 400,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
      });
    }
    
    // Verify PKCE
    if (authCode.codeChallenge) {
      if (!codeVerifier || !verifyPKCE(authCode.codeChallenge, codeVerifier)) {
        return NextResponse.json({ error: 'invalid_grant' }, {
          status: 400,
          headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
        });
      }
    }
    
    // Consume code
    await prisma.oAuthAuthorizationCode.delete({ where: { code: codeHash } });
    
    const accessToken = await createAccessToken(clientId, authCode.userId, authCode.scope);
    const refreshToken = await createRefreshToken(clientId, authCode.userId, authCode.scope, codeVerifier);
    
    return NextResponse.json({
      access_token: accessToken.token,
      token_type: 'Bearer',
      expires_in: Math.floor((accessToken.expires_at - Date.now()) / 1000),
      refresh_token: refreshToken.token,
      scope: accessToken.scope,
    }, {
      status: 200,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }
  
  if (grantType === 'refresh_token') {
    const refreshToken = body.refresh_token;
    const scope = body.scope;
    
    if (!refreshToken) {
      return NextResponse.json({ error: 'invalid_request' }, {
        status: 400,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
      });
    }
    
    const tokenHash = hashToken(refreshToken);
    const storedToken = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash } });
    
    if (!storedToken || storedToken.clientId !== clientId || storedToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'invalid_grant' }, {
        status: 400,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
      });
    }
    
    // Verify PKCE if present
    if (storedToken.pkceCodeVerifier && body.code_verifier) {
      const valid = verifyPKCE(storedToken.pkceCodeVerifier, body.code_verifier);
      if (!valid) {
        return NextResponse.json({ error: 'invalid_grant' }, {
          status: 400,
          headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
        });
      }
    }
    
    // Rotate refresh token
    const rotated = await rotateRefreshToken(refreshToken, clientId, storedToken.userId, scope ?? storedToken.scope, body.code_verifier);
    
    if (!rotated) {
      // Potential token reuse - revoke all tokens for this client/user
      await prisma.oAuthAccessToken.updateMany({
        where: { clientId, userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await prisma.oAuthRefreshToken.deleteMany({ where: { clientId, userId: storedToken.userId } });
      
      return NextResponse.json({ error: 'invalid_grant' }, {
        status: 400,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
      });
    }
    
    return NextResponse.json({
      access_token: rotated.accessToken.token,
      token_type: 'Bearer',
      expires_in: Math.floor((rotated.accessToken.expires_at - Date.now()) / 1000),
      refresh_token: rotated.refreshToken.token,
      scope: rotated.accessToken.scope,
    }, {
      status: 200,
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
    });
  }
  
  return NextResponse.json({ error: 'unsupported_grant_type' }, {
    status: 400,
    headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.token),
  });
}