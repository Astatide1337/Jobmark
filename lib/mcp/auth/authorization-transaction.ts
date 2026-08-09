import { randomUUID } from 'crypto';
import { jwtVerify, SignJWT } from 'jose';

const AUTHORIZATION_TRANSACTION_TTL_SECONDS = 10 * 60;
const AUTHORIZATION_TRANSACTION_ISSUER = 'jobmark-mcp-consent';
const AUTHORIZATION_TRANSACTION_AUDIENCE = 'mcp-consent';

export interface AuthorizationTransaction {
  clientId: string;
  redirectUri: string;
  responseType: 'code';
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  userId: string;
}

function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'AUTH_SECRET or NEXTAUTH_SECRET is required for MCP authorization transactions'
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createAuthorizationTransaction(
  transaction: AuthorizationTransaction
): Promise<string> {
  return new SignJWT({
    client_id: transaction.clientId,
    redirect_uri: transaction.redirectUri,
    response_type: transaction.responseType,
    scope: transaction.scope,
    state: transaction.state,
    code_challenge: transaction.codeChallenge,
    code_challenge_method: transaction.codeChallengeMethod,
    user_id: transaction.userId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(AUTHORIZATION_TRANSACTION_ISSUER)
    .setAudience(AUTHORIZATION_TRANSACTION_AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${AUTHORIZATION_TRANSACTION_TTL_SECONDS}s`)
    .sign(getSigningKey());
}

export async function verifyAuthorizationTransaction(
  token: string,
  userId: string
): Promise<AuthorizationTransaction | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ['HS256'],
      issuer: AUTHORIZATION_TRANSACTION_ISSUER,
      audience: AUTHORIZATION_TRANSACTION_AUDIENCE,
    });

    if (
      typeof payload.client_id !== 'string' ||
      typeof payload.redirect_uri !== 'string' ||
      payload.response_type !== 'code' ||
      typeof payload.scope !== 'string' ||
      typeof payload.state !== 'string' ||
      typeof payload.code_challenge !== 'string' ||
      payload.code_challenge_method !== 'S256' ||
      payload.user_id !== userId
    ) {
      return null;
    }

    return {
      clientId: payload.client_id,
      redirectUri: payload.redirect_uri,
      responseType: 'code',
      scope: payload.scope,
      state: payload.state,
      codeChallenge: payload.code_challenge,
      codeChallengeMethod: 'S256',
      userId: payload.user_id,
    };
  } catch {
    return null;
  }
}
