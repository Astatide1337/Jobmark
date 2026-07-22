#!/usr/bin/env tsx
/**
 * Deep E2E Verification for MCP OAuth Flows
 *
 * Uses direct HTTP calls against the running dev server.
 * Creates test data via the DB and verifies the full lifecycle.
 */

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const BASE = process.env.BASE_URL || 'http://localhost:3456';
const prisma = new PrismaClient();

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

const results: TestResult[] = [];

function assert(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(pass ? '  ✓' : '  ✗', name, detail ? `— ${detail}` : '');
}

function sha256hex(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

function sha256base64url(s: string) {
  return createHash('sha256').update(s).digest('base64url');
}

function generateToken() {
  return randomBytes(32).toString('base64url');
}

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

let testClientId = '';
let testClientSecret = '';
let testUserId = '';

async function setupTestData() {
  console.log('\n0. Setting up test data');

  // Clean up previous test data
  const existingUsers = await prisma.user.findMany({ where: { email: { in: ['e2e-a@jobmark.test', 'e2e-b@jobmark.test'] } } });
  for (const u of existingUsers) {
    const conns = await prisma.mcpConnection.findMany({ where: { userId: u.id } });
    const connIds = conns.map(c => c.id);
    if (connIds.length) await prisma.mcpIdempotency.deleteMany({ where: { connectionId: { in: connIds } } });
    await prisma.mcpConnection.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthAccessToken.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthRefreshToken.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthAuthorizationCode.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthConsent.deleteMany({ where: { userId: u.id } });
  }
  await prisma.user.deleteMany({ where: { email: { in: ['e2e-a@jobmark.test', 'e2e-b@jobmark.test'] } } });
  await prisma.oAuthClient.deleteMany({ where: { clientName: { startsWith: 'e2e-' } } });

  // Create test users
  const userA = await prisma.user.create({ data: { email: 'e2e-a@jobmark.test', name: 'E2E A', emailVerified: new Date() } });
  const userB = await prisma.user.create({ data: { email: 'e2e-b@jobmark.test', name: 'E2E B', emailVerified: new Date() } });
  testUserId = userA.id;

  // Create OAuth client with known credentials
  testClientId = `e2e-client-${randomBytes(4).toString('hex')}`;
  testClientSecret = generateToken();
  const client = await prisma.oAuthClient.create({
    data: {
      clientId: testClientId,
      clientSecretHash: sha256hex(testClientSecret),
      clientName: 'e2e-test',
      redirectUris: ['http://localhost:3456/callback'],
      grantTypes: ['authorization_code', 'refresh_token'],
      scope: 'jobmark:read jobmark:write jobmark:destructive offline_access',
      requirePkce: true,
      tokenEndpointAuthMethod: 'client_secret_post',
    },
  });

  // Create MCP connection for user A (vault unlocked)
  await prisma.mcpConnection.create({
    data: {
      userId: userA.id,
      oauthClientId: client.id,
      clientName: 'e2e-test',
      scopes: ['jobmark:read', 'jobmark:write', 'jobmark:destructive', 'offline_access'],
      vaultUnlockedUntil: new Date(Date.now() + 4 * 3600_000),
    },
  });

  // Create MCP connection for user B (read-only)
  await prisma.mcpConnection.create({
    data: {
      userId: userB.id,
      oauthClientId: client.id,
      clientName: 'e2e-test',
      scopes: ['jobmark:read'],
    },
  });

  assert('test data created', true);
  return { userA, userB, client };
}

function createAuthCode(userId: string, codeVerifier: string, scope: string): string {
  const code = generateToken();
  // Store synchronously - we'll insert via raw query
  return code;
}

async function exchangeCode(code: string, codeVerifier: string, userId: string) {
  return post('/api/auth/mcp/token', {
    grant_type: 'authorization_code',
    client_id: testClientId,
    client_secret: testClientSecret,
    code,
    redirect_uri: 'http://localhost:3456/callback',
    code_verifier: codeVerifier,
  });
}

async function testTokenExchange() {
  console.log('\n1. Token Exchange with PKCE');

  const verifier = generateToken();
  const challenge = sha256base64url(verifier);
  const code = generateToken();

  // Insert auth code directly
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: sha256hex(code),
      clientId: testClientId,
      userId: testUserId,
      redirectUri: 'http://localhost:3456/callback',
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read jobmark:write jobmark:destructive offline_access',
      expiresAt: new Date(Date.now() + 600_000),
    },
  });

  // Exchange
  const r = await exchangeCode(code, verifier, testUserId);
  assert('token exchange returns 200', r.status === 200, `status=${r.status}, data=${JSON.stringify(r.data)}`);

  if (r.status !== 200) return null;

  const d = r.data as Record<string, unknown>;
  assert('returns access_token', typeof d.access_token === 'string');
  assert('returns refresh_token', typeof d.refresh_token === 'string');
  assert('token_type is Bearer', d.token_type === 'Bearer');
  assert('scope matches', d.scope === 'jobmark:read jobmark:write jobmark:destructive offline_access');
  assert('expires_in > 0', typeof d.expires_in === 'number' && d.expires_in > 0);

  // Wrong PKCE verifier should fail
  const badCode = generateToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: sha256hex(badCode),
      clientId: testClientId,
      userId: testUserId,
      redirectUri: 'http://localhost:3456/callback',
      codeChallenge: sha256base64url(generateToken()),
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read',
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  const badR = await exchangeCode(badCode, generateToken(), testUserId);
  assert('wrong PKCE rejected', badR.status === 400);

  // Code reuse should fail
  const reuseR = await exchangeCode(code, verifier, testUserId);
  assert('code reuse rejected', reuseR.status === 400);

  return d.refresh_token as string;
}

async function testMcpOperations(accessToken: string) {
  console.log('\n2. MCP Operations');

  // Initialize
  const init = await post('/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } }, { Authorization: `Bearer ${accessToken}` });
  assert('initialize returns 200', init.status === 200);
  const initResult = (init.data as Record<string, unknown>).result as Record<string, unknown>;
  assert('serverInfo.name', !!(initResult?.serverInfo && (initResult.serverInfo as Record<string, unknown>).name === 'jobmark-mcp'));

  // tools/list
  const list = await post('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' }, { Authorization: `Bearer ${accessToken}` });
  assert('tools/list returns 200', list.status === 200);
  const tools = ((list.data as Record<string, unknown>).result as Record<string, unknown>).tools as Array<Record<string, unknown>>;
  assert('50 tools registered', tools?.length === 50, `count=${tools?.length}`);
  assert('all tools have name/description/inputSchema', tools?.every(t => t.name && t.description && t.inputSchema));
  assert('all tools have requiredScopes', tools?.every(t => (t.annotations as Record<string, unknown>)?.requiredScopes));
  assert('all tool names are snake_case', tools?.every(t => /^[a-z][a-z0-9_]*$/.test(t.name as string)));

  // Tool call: create activity
  const create = await post('/mcp', {
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'activities_create', arguments: { title: 'E2E Test Activity', description: 'Created by E2E test' } },
  }, { Authorization: `Bearer ${accessToken}` });
  assert('activities_create returns 200', create.status === 200);

  // Tool call: list activities
  const listAct = await post('/mcp', {
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'activities_list', arguments: {} },
  }, { Authorization: `Bearer ${accessToken}` });
  assert('activities_list returns 200', listAct.status === 200);

  // Ping
  const ping = await post('/mcp', { jsonrpc: '2.0', id: 5, method: 'ping' }, { Authorization: `Bearer ${accessToken}` });
  assert('ping returns 200', ping.status === 200);
}

async function testRefreshRotation(refreshToken: string) {
  console.log('\n3. Refresh Token Rotation');

  const r1 = await post('/api/auth/mcp/token', {
    grant_type: 'refresh_token',
    client_id: testClientId,
    client_secret: testClientSecret,
    refresh_token: refreshToken,
  });
  assert('first refresh returns 200', r1.status === 200, `status=${r1.status}, data=${JSON.stringify(r1.data)}`);

  if (r1.status !== 200) return { newRefresh: null, newAccess: null };

  const d1 = r1.data as Record<string, unknown>;
  assert('new access_token issued', typeof d1.access_token === 'string');
  assert('new refresh_token issued', typeof d1.refresh_token === 'string');
  assert('tokens differ from original', d1.refresh_token !== refreshToken);

  return { newRefresh: d1.refresh_token as string, newAccess: d1.access_token as string };
}

async function testRefreshReplay(newRefreshToken: string) {
  console.log('\n4. Refresh Token Replay Rejection + Family Revocation');

  // Use once → get R2 (R1 is now consumed/tombstone)
  const r1 = await post('/api/auth/mcp/token', {
    grant_type: 'refresh_token',
    client_id: testClientId,
    client_secret: testClientSecret,
    refresh_token: newRefreshToken,
  });
  assert('first use succeeds', r1.status === 200);

  const r1Data = r1.data as Record<string, unknown>;
  const r2RefreshToken = r1Data.refresh_token as string;
  assert('new token issued on rotation', typeof r2RefreshToken === 'string' && r2RefreshToken !== newRefreshToken);

  // Old refresh (R1) should be rejected (consumed)
  const rOld = await post('/api/auth/mcp/token', {
    grant_type: 'refresh_token',
    client_id: testClientId,
    client_secret: testClientSecret,
    refresh_token: newRefreshToken,
  });
  assert('old refresh rejected', rOld.status === 400);

  // R2 (the successor from the rotation above) should still work at this point
  // because the rejection above was for R1, not R2
  // Now test replay: use R1 again → should revoke R2 (family revocation)
  const r2Replay = await post('/api/auth/mcp/token', {
    grant_type: 'refresh_token',
    client_id: testClientId,
    client_secret: testClientSecret,
    refresh_token: newRefreshToken,
  });
  assert('replay rejected', r2Replay.status === 400);

  // R2 (successor) should also be revoked due to family revocation
  const r3 = await post('/api/auth/mcp/token', {
    grant_type: 'refresh_token',
    client_id: testClientId,
    client_secret: testClientSecret,
    refresh_token: r2RefreshToken,
  });
  assert('successor token also revoked after replay', r3.status === 400);
}

async function testTenantIsolation() {
  console.log('\n5. Tenant Isolation (User B - read-only)');

  // Create auth code for user B
  const userB = await prisma.user.findUnique({ where: { email: 'e2e-b@jobmark.test' } });
  if (!userB) { assert('user B exists', false); return; }

  const verifier = generateToken();
  const code = generateToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: sha256hex(code),
      clientId: testClientId,
      userId: userB.id,
      redirectUri: 'http://localhost:3456/callback',
      codeChallenge: sha256base64url(verifier),
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read',
      expiresAt: new Date(Date.now() + 600_000),
    },
  });

  const r = await exchangeCode(code, verifier, userB.id);
  assert('user B token exchange succeeds', r.status === 200);
  if (r.status !== 200) return;

  const tokenB = (r.data as Record<string, unknown>).access_token as string;

  // User B can list projects (empty)
  const listR = await post('/mcp', {
    jsonrpc: '2.0', id: 10, method: 'tools/call',
    params: { name: 'projects_list', arguments: {} },
  }, { Authorization: `Bearer ${tokenB}` });
  assert('user B projects_list returns 200', listR.status === 200);

  // User B should get 403 when trying to create (no write scope)
  const createR = await post('/mcp', {
    jsonrpc: '2.0', id: 11, method: 'tools/call',
    params: { name: 'projects_create', arguments: { name: 'Should Fail' } },
  }, { Authorization: `Bearer ${tokenB}` });
  const createResult = createR.data as Record<string, unknown>;
  const createError = createResult?.error as Record<string, unknown> | undefined;
  assert('user B write blocked (insufficient scope)', !!(createError?.data && (createError.data as Record<string, unknown>).code === 'INSUFFICIENT_SCOPE'));
}

async function testVaultLocking() {
  console.log('\n6. Vault Locking');

  // vault_status should always work
  const r = await post('/mcp', {
    jsonrpc: '2.0', id: 20, method: 'tools/call',
    params: { name: 'vault_status', arguments: {} },
  }, { Authorization: `Bearer ${globalThis.__testAccessToken}` });
  assert('vault_status works', r.status === 200);

  // vault_begin_unlock should always work
  const r2 = await post('/mcp', {
    jsonrpc: '2.0', id: 21, method: 'tools/call',
    params: { name: 'vault_begin_unlock', arguments: {} },
  }, { Authorization: `Bearer ${globalThis.__testAccessToken}` });
  assert('vault_begin_unlock works', r2.status === 200);

  // Create a locked connection and test vault access
  const lockedConn = await prisma.mcpConnection.create({
    data: {
      userId: testUserId,
      oauthClientId: (await prisma.oAuthClient.findUnique({ where: { clientId: testClientId } }))!.id,
      clientName: 'e2e-locked',
      scopes: ['jobmark:read', 'jobmark:write', 'jobmark:destructive'],
      vaultUnlockedUntil: null,
    },
  });

  // Create a token for the locked connection
  const verifier = generateToken();
  const code = generateToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: sha256hex(code),
      clientId: testClientId,
      userId: testUserId,
      redirectUri: 'http://localhost:3456/callback',
      codeChallenge: sha256base64url(verifier),
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read jobmark:write',
      expiresAt: new Date(Date.now() + 600_000),
    },
  });

  // We can't easily test vault lock enforcement without browser session
  // since the MCP route selects the connection by userId+clientId.
  // The existing connection is vault-unlocked, so vault tools work.
  // The test verifies the vault_status/begin_unlock paths.

  await prisma.mcpConnection.delete({ where: { id: lockedConn.id } });
}

async function testDestructiveConfirmation() {
  console.log('\n7. Destructive Action Confirmation');

  // account_clear_activities without confirmation
  const r1 = await post('/mcp', {
    jsonrpc: '2.0', id: 30, method: 'tools/call',
    params: { name: 'account_clear_activities', arguments: {} },
  }, { Authorization: `Bearer ${globalThis.__testAccessToken}` });
  assert('clear_activities without confirmation fails', r1.status === 200);
  const result1 = (r1.data as Record<string, unknown>).result as Record<string, unknown>;
  assert('returns isError=true', result1?.isError === true);

  // account_delete without confirmation
  const r2 = await post('/mcp', {
    jsonrpc: '2.0', id: 31, method: 'tools/call',
    params: { name: 'account_delete', arguments: {} },
  }, { Authorization: `Bearer ${globalThis.__testAccessToken}` });
  assert('account_delete without confirmation fails', r2.status === 200);
  const result2 = (r2.data as Record<string, unknown>).result as Record<string, unknown>;
  assert('account_delete returns isError=true', result2?.isError === true);
}

async function testTokenRevocation() {
  console.log('\n8. Token Revocation');

  // Create a fresh token for revocation test
  const verifier = generateToken();
  const code = generateToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: sha256hex(code),
      clientId: testClientId,
      userId: testUserId,
      redirectUri: 'http://localhost:3456/callback',
      codeChallenge: sha256base64url(verifier),
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read',
      expiresAt: new Date(Date.now() + 600_000),
    },
  });

  const tokenR = await exchangeCode(code, verifier, testUserId);
  if (tokenR.status !== 200) { assert('token creation for revoke test', false); return; }
  const tokenToRevoke = (tokenR.data as Record<string, unknown>).access_token as string;

  // Introspect before revocation
  const intBefore = await post('/api/auth/mcp/introspect', {
    token: tokenToRevoke,
    client_id: testClientId,
    client_secret: testClientSecret,
  });
  assert('introspect shows active before revoke', (intBefore.data as Record<string, unknown>).active === true);

  // Revoke
  const revokeR = await post('/api/auth/mcp/revoke', {
    token: tokenToRevoke,
    token_type_hint: 'access_token',
    client_id: testClientId,
    client_secret: testClientSecret,
  });
  assert('revoke returns 200', revokeR.status === 200);

  // Introspect after revocation
  const intAfter = await post('/api/auth/mcp/introspect', {
    token: tokenToRevoke,
    client_id: testClientId,
    client_secret: testClientSecret,
  });
  assert('introspect shows inactive after revoke', (intAfter.data as Record<string, unknown>).active === false);

  // Using revoked token on MCP should fail
  const mcpR = await post('/mcp', { jsonrpc: '2.0', id: 40, method: 'ping' }, { Authorization: `Bearer ${tokenToRevoke}` });
  assert('revoked token rejected by MCP', mcpR.status === 401);
}

async function cleanup() {
  console.log('\n9. Cleanup');
  const users = await prisma.user.findMany({ where: { email: { in: ['e2e-a@jobmark.test', 'e2e-b@jobmark.test'] } } });
  for (const u of users) {
    const conns = await prisma.mcpConnection.findMany({ where: { userId: u.id } });
    const connIds = conns.map(c => c.id);
    if (connIds.length) await prisma.mcpIdempotency.deleteMany({ where: { connectionId: { in: connIds } } });
    await prisma.mcpConnection.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthAccessToken.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthRefreshToken.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthAuthorizationCode.deleteMany({ where: { userId: u.id } });
    await prisma.oAuthConsent.deleteMany({ where: { userId: u.id } });
  }
  await prisma.user.deleteMany({ where: { email: { in: ['e2e-a@jobmark.test', 'e2e-b@jobmark.test'] } } });
  await prisma.oAuthClient.deleteMany({ where: { clientName: { startsWith: 'e2e-' } } });
  assert('test data cleaned up', true);
}

function summarize() {
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  ✗ ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    });
  }

  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

declare global {
  var __testAccessToken: string | undefined;
}

async function getFreshAccessToken(): Promise<string | null> {
  const verifier = generateToken();
  const code = generateToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: sha256hex(code),
      clientId: testClientId,
      userId: testUserId,
      redirectUri: 'http://localhost:3456/callback',
      codeChallenge: sha256base64url(verifier),
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read jobmark:write jobmark:destructive offline_access',
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  const r = await exchangeCode(code, verifier, testUserId);
  if (r.status === 200) {
    return (r.data as Record<string, unknown>).access_token as string;
  }
  return null;
}

async function main() {
  console.log(`Deep E2E Verification Suite — Target: ${BASE}`);
  console.log('='.repeat(60));

  await setupTestData();
  const refreshToken = await testTokenExchange();

  // We need the access token for subsequent tests
  // Re-create to get a fresh access token
  const verifier = generateToken();
  const code = generateToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      code: sha256hex(code),
      clientId: testClientId,
      userId: testUserId,
      redirectUri: 'http://localhost:3456/callback',
      codeChallenge: sha256base64url(verifier),
      codeChallengeMethod: 'S256',
      scope: 'jobmark:read jobmark:write jobmark:destructive offline_access',
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  const tokenR = await exchangeCode(code, verifier, testUserId);
  if (tokenR.status === 200) {
    globalThis.__testAccessToken = (tokenR.data as Record<string, unknown>).access_token as string;

    await testMcpOperations(globalThis.__testAccessToken);
    if (refreshToken) {
      const rot = await testRefreshRotation(refreshToken);
      if (rot.newRefresh) await testRefreshReplay(rot.newRefresh);
    }
    // Replay detection revoked all access tokens — get a fresh one for remaining tests
    const freshToken = await getFreshAccessToken();
    if (freshToken) globalThis.__testAccessToken = freshToken;

    await testTenantIsolation();
    await testVaultLocking();
    await testDestructiveConfirmation();
    await testTokenRevocation();
  } else {
    console.log('\n⚠ Skipping MCP tests — initial token exchange failed');
    assert('MCP tests skipped (no token)', false, `token exchange status=${tokenR.status}`);
  }

  await cleanup();
  summarize();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
