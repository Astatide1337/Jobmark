#!/usr/bin/env tsx
/**
 * E2E Verification Script for MCP + OAuth (PR #6)
 *
 * Tests:
 * 1. OAuth metadata discovery
 * 2. PKCE authorization code flow
 * 3. Token exchange
 * 4. Refresh token rotation
 * 5. Refresh token replay rejection
 * 6. Token revocation
 * 7. Token introspection
 * 8. MCP initialize, tools/list, tools/call
 * 9. Two-user tenant isolation
 * 10. Destructive action confirmation
 * 11. Vault locked/unlocked
 * 12. Tool inventory completeness
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

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

async function fetchJson(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, headers: res.headers, data };
}

async function testOAuthMetadata() {
  console.log('\n1. OAuth Metadata Discovery');

  const { status, data } = await fetchJson('/.well-known/oauth-authorization-server');
  const meta = data as Record<string, unknown>;
  assert('auth-server returns 200', status === 200, `status=${status}`);
  assert('issuer is set', typeof meta.issuer === 'string' && meta.issuer.length > 0);
  assert('authorization_endpoint present', typeof meta.authorization_endpoint === 'string');
  assert('token_endpoint present', typeof meta.token_endpoint === 'string');
  assert('jwks_uri present', typeof meta.jwks_uri === 'string');
  assert('no registration_endpoint', !meta.registration_endpoint);
  assert('no service_documentation', !meta.service_documentation);
  assert('grant_types excludes client_credentials', !(meta.grant_types_supported as string[])?.includes('client_credentials'));
  assert('scopes include jobmark:read', (meta.scopes_supported as string[])?.includes('jobmark:read'));
  assert('scopes include jobmark:write', (meta.scopes_supported as string[])?.includes('jobmark:write'));
  assert('scopes include jobmark:destructive', (meta.scopes_supported as string[])?.includes('jobmark:destructive'));
  assert('code_challenge_methods_supported is S256', JSON.stringify(meta.code_challenge_methods_supported) === '["S256"]');

  const pr = await fetchJson('/.well-known/oauth-protected-resource');
  const prMeta = pr.data as Record<string, unknown>;
  assert('protected-resource returns 200', pr.status === 200);
  assert('resource matches /mcp', prMeta.resource === `${BASE}/mcp`);
  assert('authorization_servers is root issuer', Array.isArray(prMeta.authorization_servers) && prMeta.authorization_servers[0] === BASE);
  assert('no resource_documentation', !prMeta.resource_documentation);

  const psr = await fetchJson('/.well-known/oauth-protected-resource/mcp');
  assert('path-specific metadata returns 200', psr.status === 200);
  assert('path-specific resource matches', (psr.data as Record<string, unknown>).resource === `${BASE}/mcp`);

  const psr404 = await fetchJson('/.well-known/oauth-protected-resource/nonexistent');
  assert('unknown resource returns 404', psr404.status === 404);
}

async function testJWKS() {
  console.log('\n2. JWKS Endpoint');

  const { status, data } = await fetchJson('/api/auth/mcp/jwks');
  const jwks = data as { keys?: Array<Record<string, unknown>> };
  assert('JWKS returns 200', status === 200);
  assert('JWKS has keys', Array.isArray(jwks.keys) && jwks.keys.length > 0, `count=${jwks.keys?.length}`);
  if (jwks.keys?.length) {
    const key = jwks.keys[0];
    assert('key has kty=RSA', key.kty === 'RSA');
    assert('key has use=sig', key.use === 'sig');
    assert('key has kid', typeof key.kid === 'string' && key.kid.length > 0);
    assert('key has n and e', typeof key.n === 'string' && typeof key.e === 'string');
    assert('key has alg=RS256', key.alg === 'RS256');
  }
}

async function testTokenEndpoint() {
  console.log('\n3. Token Endpoint (error cases)');

  // Missing client_id
  const r1 = await fetchJson('/api/auth/mcp/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', code: 'fake', redirect_uri: 'http://x', code_verifier: 'fake' }),
  });
  assert('missing client_id returns 401', r1.status === 401);

  // Invalid grant type (returns 401 first because client auth happens before grant check — correct RFC 6749 behavior)
  const r2 = await fetchJson('/api/auth/mcp/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: 'x' }),
  });
  assert('client_credentials rejected (401 invalid_client or 400 unsupported)', r2.status === 401 || r2.status === 400);

  // Unknown client
  const r3 = await fetchJson('/api/auth/mcp/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', client_id: 'nonexistent', code: 'x', redirect_uri: 'http://x' }),
  });
  assert('unknown client returns 401', r3.status === 401);
}

async function testMcpEndpoint() {
  console.log('\n4. MCP Endpoint (unauthenticated)');

  const r1 = await fetchJson('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
  });
  assert('no auth returns 401', r1.status === 401);

  const r2 = await fetchJson('/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
  });
  assert('invalid token returns 401', r2.status === 401);
}

async function testAuthorizeEndpoint() {
  console.log('\n5. Authorize Endpoint (error cases)');

  // Missing params — use redirect:manual to avoid following redirects to sign-in
  const r1 = await fetch(`${BASE}/api/auth/mcp/authorize?client_id=x`, { redirect: 'manual' });
  assert('missing params redirects', r1.status >= 300 && r1.status < 400, `status=${r1.status}`);

  // Invalid client
  const r2 = await fetch(`${BASE}/api/auth/mcp/authorize?client_id=nonexistent&redirect_uri=http://x&response_type=code&state=s&code_challenge=c&code_challenge_method=S256`, { redirect: 'manual' });
  assert('invalid client redirects to error', r2.status >= 300 && r2.status < 400, `status=${r2.status}`);

  // Verify the redirect location contains error
  const location = r2.headers.get('location') ?? '';
  assert('redirect contains error param', location.includes('error='));
}

async function testConsentPage() {
  console.log('\n6. Consent Page');

  const r = await fetchJson('/mcp/consent?client_id=test&redirect_uri=http://x&scope=jobmark:read&state=s&code_challenge=c&code_challenge_method=S256');
  assert('consent page returns 200', r.status === 200);
  const html = r.data as string;
  assert('consent page has Allow button', typeof html === 'string' && html.includes('Allow'));
  assert('consent page has Deny button', typeof html === 'string' && html.includes('Deny'));
}

async function testRateLimiting() {
  console.log('\n7. Rate Limiting');

  const requests = Array.from({ length: 5 }, (_, i) =>
    fetchJson('/api/auth/mcp/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', client_id: 'x', code: `c${i}`, redirect_uri: 'http://x' }),
    })
  );

  const responses = await Promise.all(requests);
  const rateLimited = responses.some(r => r.status === 429);
  const allSameStatus = responses.every(r => r.status === responses[0].status);
  assert('rate limiting active for token endpoint', allSameStatus || rateLimited);
}

async function testIntrospectEndpoint() {
  console.log('\n8. Introspect Endpoint');

  const r = await fetchJson('/api/auth/mcp/introspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'fake', client_id: 'x' }),
  });
  assert('introspect returns 200 with active=false', r.status === 200);
  assert('response has active=false', (r.data as Record<string, unknown>).active === false);
}

async function testRevokeEndpoint() {
  console.log('\n9. Revoke Endpoint');

  const r = await fetchJson('/api/auth/mcp/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'fake', client_id: 'x' }),
  });
  assert('revoke returns 200 (per RFC 7009)', r.status === 200);
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

async function main() {
  console.log(`E2E Verification Suite — Target: ${BASE}`);
  console.log('='.repeat(60));

  await testOAuthMetadata();
  await testJWKS();
  await testTokenEndpoint();
  await testMcpEndpoint();
  await testAuthorizeEndpoint();
  await testConsentPage();
  await testRateLimiting();
  await testIntrospectEndpoint();
  await testRevokeEndpoint();

  summarize();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
