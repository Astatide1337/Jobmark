/**
 * Live, read-only MCP protocol verification.
 *
 * Usage:
 *   npx tsx scripts/verify-mcp-preview.ts https://<preview-host>
 *
 * The script creates one uniquely named OAuth client, one user-bound MCP
 * connection, and one short-lived access token. It removes only those exact
 * records (and any idempotency rows for that connection) before exiting.
 * Never print the access token or DATABASE_URL.
 */

import { config as loadEnv } from 'dotenv';

if (process.env.MCP_ENV_FILE) {
  loadEnv({ path: process.env.MCP_ENV_FILE, override: true });
} else {
  loadEnv({ path: '.env', override: false });
}
import { prisma } from '../lib/db';
import {
  createAccessToken,
  createClient,
  ensureMcpConnection,
  hashToken,
} from '../lib/mcp/auth/provider';

  const READ_SCOPE = 'jobmark:read';
const SAFE_TOOL = 'dashboard_stats';
const MODERN_PROTOCOL_VERSION = '2026-07-28';

const READ_TOOL_NAMES = [
  'activities_list',
  'activities_get',
  'contacts_list',
  'contacts_get',
  'focus_get',
  'goals_list',
  'goals_get',
  'interactions_list',
  'network_stats',
  'outreach_list',
  'projects_list',
  'projects_get',
  'projects_get_with_activities',
  'reports_list',
  'reports_get',
  'search_global',
  'dashboard_stats',
  'insights_get',
  'settings_get',
  'vault_status',
  'vault_list_projects',
  'account_export',
] as const;

type JsonRpcResponse = {
  result?: {
    resultType?: string;
    _meta?: Record<string, unknown>;
    cacheScope?: string;
    supportedVersions?: string[];
    tools?: unknown[];
    content?: unknown[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  };
  error?: { code?: number; message?: string; data?: { code?: string } };
};

type ToolCallPlan = {
  name: (typeof READ_TOOL_NAMES)[number];
  arguments: Record<string, unknown>;
  requires?: keyof ToolFixtures;
};

type ToolFixtures = {
  activityId: string;
  contactId: string;
  goalId: string;
  interactionId: string;
  projectId: string;
  reportId: string;
};

function requireBaseUrl(): string {
  const value = process.argv[2] ?? process.env.MCP_PREVIEW_URL ?? process.env.MCP_PUBLIC_BASE_URL;
  if (!value) {
    throw new Error('Pass the deployed preview URL as argv[2] or MCP_PREVIEW_URL');
  }

  return value.replace(/\/$/, '');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function postJsonRpc(
  endpoint: string,
  accessToken: string,
  id: string | number,
  method: string,
  params: Record<string, unknown> = {}
): Promise<JsonRpcResponse> {
  const metadata = params._meta as Record<string, unknown> | undefined;
  const protocolVersion =
    (metadata?.['io.modelcontextprotocol/protocolVersion'] as string | undefined) ??
    '2025-11-25';
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': protocolVersion,
  };

  if (protocolVersion === MODERN_PROTOCOL_VERSION) {
    headers['Mcp-Method'] = method;
    if (method === 'tools/call' && typeof params.name === 'string') {
      headers['Mcp-Name'] = params.name;
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });

  assert(response.ok, `${method} returned HTTP ${response.status}`);

  let body: JsonRpcResponse;
  try {
    body = (await response.json()) as JsonRpcResponse;
  } catch {
    throw new Error(`${method} returned a non-JSON response`);
  }

  if (body.error) {
    const errorCode = body.error.data?.code ?? body.error.code ?? 'unknown';
    throw new Error(`${method} returned JSON-RPC error ${errorCode}`);
  }
  assert(body.result, `${method} returned no result`);
  return body;
}

async function getToolFixtures(userId: string): Promise<Partial<ToolFixtures>> {
  const [activity, contact, goal, interaction, project, report] = await Promise.all([
    prisma.activity.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    prisma.contact.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    prisma.goal.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    prisma.interactionLog.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    prisma.project.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    prisma.report.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
  ]);

  return {
    activityId: activity?.id,
    contactId: contact?.id,
    goalId: goal?.id,
    interactionId: interaction?.id,
    projectId: project?.id,
    reportId: report?.id,
  };
}

function buildReadToolPlans(fixtures: Partial<ToolFixtures>): ToolCallPlan[] {
  return [
    { name: 'activities_list', arguments: { limit: 1 } },
    { name: 'activities_get', arguments: { activityId: fixtures.activityId }, requires: 'activityId' },
    { name: 'contacts_list', arguments: { limit: 1 } },
    { name: 'contacts_get', arguments: { contactId: fixtures.contactId }, requires: 'contactId' },
    { name: 'focus_get', arguments: {} },
    { name: 'goals_list', arguments: { limit: 1 } },
    { name: 'goals_get', arguments: { goalId: fixtures.goalId }, requires: 'goalId' },
    { name: 'interactions_list', arguments: { limit: 1 } },
    { name: 'network_stats', arguments: {} },
    { name: 'outreach_list', arguments: { limit: 1 } },
    { name: 'projects_list', arguments: { limit: 1 } },
    { name: 'projects_get', arguments: { projectId: fixtures.projectId }, requires: 'projectId' },
    {
      name: 'projects_get_with_activities',
      arguments: { projectId: fixtures.projectId, limit: 1 },
      requires: 'projectId',
    },
    { name: 'reports_list', arguments: { limit: 1 } },
    { name: 'reports_get', arguments: { reportId: fixtures.reportId }, requires: 'reportId' },
    { name: 'search_global', arguments: { query: 'jobmark', limit: 1 } },
    { name: 'dashboard_stats', arguments: {} },
    { name: 'insights_get', arguments: { year: new Date().getUTCFullYear() } },
    { name: 'settings_get', arguments: {} },
    { name: 'vault_status', arguments: {} },
    { name: 'vault_list_projects', arguments: {} },
    { name: 'account_export', arguments: { format: 'json', includeVault: false } },
  ];
}

function assertToolResult(name: string, response: JsonRpcResponse): void {
  const result = response.result;
  assert(result, `${name} returned no result`);
  assert(result.isError !== true, `${name} returned a tool error`);
  assert(Array.isArray(result.content) && result.content.length > 0, `${name} returned no content`);
  assert(
    result.structuredContent && Object.keys(result.structuredContent).length > 0,
    `${name} returned empty structured content`
  );
}

async function findTestUser() {
  const userId = process.env.MCP_TEST_USER_ID;
  const email = process.env.MCP_TEST_USER_EMAIL;
  let user;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  } else if (email) {
    user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  } else {
    user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  }

  assert(user, 'No test user found; set MCP_TEST_USER_ID or MCP_TEST_USER_EMAIL');
  return user;
}

async function verifyReadTools(
  endpoint: string,
  accessToken: string,
  userId: string
): Promise<{ passed: number; skipped: string[]; toolCount: number }> {
  const fixtures = await getToolFixtures(userId);
  const plans = buildReadToolPlans(fixtures);
  const skipped: string[] = [];
  const failures: string[] = [];
  let passed = 0;

  for (const plan of plans) {
    if (plan.requires && !fixtures[plan.requires]) {
      skipped.push(`${plan.name} (no ${plan.requires} fixture)`);
      console.info(`SKIP ${plan.name}: no safe fixture for ${plan.requires}`);
      continue;
    }

    try {
      const response = await postJsonRpc(endpoint, accessToken, `tool-${passed + 4}`, 'tools/call', {
        name: plan.name,
        arguments: plan.arguments,
        _meta: {
          'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION,
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      });
      assertToolResult(plan.name, response);
      passed += 1;
      console.info(`PASS ${plan.name}`);
    } catch (error: unknown) {
      if (
        plan.name === 'vault_list_projects' &&
        error instanceof Error &&
        error.message.includes('VAULT_LOCKED')
      ) {
        skipped.push(`${plan.name} (vault is locked)`);
        console.info(`SKIP ${plan.name}: vault is locked; unlock flow is write-scoped`);
        continue;
      }
      failures.push(plan.name);
      console.error(`FAIL ${plan.name}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  assert(failures.length === 0, `read-only tool failures: ${failures.join(', ')}`);
  return { passed, skipped, toolCount: plans.length };
}

async function cleanupVerificationRun(
  connectionId: string | undefined,
  accessTokenHash: string | undefined,
  oauthClientInternalId: string | undefined,
  oauthClientId: string | undefined
): Promise<void> {
  if (connectionId) {
    await prisma.mcpIdempotency.deleteMany({ where: { connectionId } });
    await prisma.mcpConnection.deleteMany({ where: { id: connectionId } });
  }
  if (accessTokenHash) {
    await prisma.oAuthAccessToken.deleteMany({ where: { tokenHash: accessTokenHash } });
  }
  if (oauthClientInternalId) {
    await prisma.oAuthClient.deleteMany({
      where: { id: oauthClientInternalId, clientId: oauthClientId },
    });
  }
}

async function main(): Promise<void> {
  assert(process.env.DATABASE_URL, 'DATABASE_URL must be set');
  const baseUrl = requireBaseUrl();
  const endpoint = `${baseUrl}/mcp`;
  const marker = `jobmark-live-mcp-${Date.now()}-${crypto.randomUUID()}`;
  const user = await findTestUser();
  const scope = READ_SCOPE;

  let oauthClientId: string | undefined;
  let oauthClientInternalId: string | undefined;
  let connectionId: string | undefined;
  let accessTokenHash: string | undefined;

  try {
    const client = await createClient({
      client_name: marker,
      redirect_uris: ['https://example.invalid/jobmark-live-mcp-test'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope,
      token_endpoint_auth_method: 'none',
    });
    oauthClientId = client.client_id;

    const clientRecord = await prisma.oAuthClient.findUnique({
      where: { clientId: oauthClientId },
      select: { id: true },
    });
    assert(clientRecord, 'Temporary OAuth client was not persisted');
    oauthClientInternalId = clientRecord.id;

    // Link this uniquely named temporary client to the selected test user.
    await prisma.oAuthClient.update({
      where: { id: oauthClientInternalId },
      data: { userId: user.id },
    });

    await ensureMcpConnection(oauthClientId, user.id, scope);
    const connection = await prisma.mcpConnection.findFirst({
      where: { userId: user.id, oauthClientId: oauthClientInternalId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    assert(connection, 'Temporary MCP connection was not persisted');
    connectionId = connection.id;

    const token = await createAccessToken(oauthClientId, user.id, scope);
    accessTokenHash = hashToken(token.token);

    const initialized = await postJsonRpc(endpoint, token.token, 1, 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'jobmark-live-mcp-test', version: '1.0.0' },
    });
    assert(
      initialized.result && Object.keys(initialized.result).length > 0,
      'initialize result is empty'
    );

    const discovered = await postJsonRpc(endpoint, token.token, 'discover-1', 'server/discover', {
      _meta: {
        'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION,
        'io.modelcontextprotocol/clientInfo': { name: 'jobmark-live-mcp-test', version: '1.0.0' },
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    });
    assert(
      discovered.result?.supportedVersions?.includes('2026-07-28'),
      'server/discover did not advertise the modern protocol version'
    );
    assert(discovered.result?.resultType === 'complete', 'server/discover result is not complete');
    assert(
      discovered.result?._meta?.['io.modelcontextprotocol/serverInfo'],
      'server/discover did not return modern server identity metadata'
    );

    const listed = await postJsonRpc(endpoint, token.token, 2, 'tools/list', {
      limit: 100,
      _meta: {
        'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION,
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    });
    assert(listed.result?.resultType === 'complete', 'tools/list result is not complete');
    assert(
      listed.result?.cacheScope === 'private',
      'tools/list did not return private cache metadata'
    );
    const tools = listed.result?.tools;
    assert(Array.isArray(tools) && tools.length > 0, 'tools/list returned no tools');
    assert(
      tools.some(
        tool =>
          typeof tool === 'object' &&
          tool !== null &&
          (tool as { name?: unknown }).name === SAFE_TOOL
      ),
      `tools/list did not include ${SAFE_TOOL}`
    );

    const called = await postJsonRpc(endpoint, token.token, 3, 'tools/call', {
      name: SAFE_TOOL,
      arguments: {},
      _meta: {
        'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION,
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    });
    const result = called.result;
    assert(result && result.isError !== true, `${SAFE_TOOL} returned a tool error`);
    assert(
      Array.isArray(result?.content) && result.content.length > 0,
      `${SAFE_TOOL} returned no content`
    );
    assert(
      result?.structuredContent && Object.keys(result.structuredContent).length > 0,
      `${SAFE_TOOL} returned empty structured content`
    );

    const listedNames = new Set(
      tools
        .filter(tool => typeof tool === 'object' && tool !== null)
        .map(tool => (tool as { name?: unknown }).name)
        .filter((name): name is string => typeof name === 'string')
    );
    const missingReadTools = READ_TOOL_NAMES.filter(name => !listedNames.has(name));
    assert(missingReadTools.length === 0, `tools/list omitted read tools: ${missingReadTools.join(', ')}`);

    const { passed, skipped } = await verifyReadTools(endpoint, token.token, user.id);
    console.info(
      `PASS live MCP protocol: discover, initialize, tools/list (${tools.length} tools), ${passed} read tools; ${skipped.length} skipped`
    );
  } finally {
    await cleanupVerificationRun(
      connectionId,
      accessTokenHash,
      oauthClientInternalId,
      oauthClientId
    );
  }
}

main()
  .catch((error: unknown) => {
    // Keep output credential-free: request/DB details can contain secrets.
    if (process.env.MCP_VERIFY_DEBUG === '1') {
      const detail = error instanceof Error ? error.message : 'unknown error';
      console.error(
        `DEBUG: ${detail
          .replace(/Bearer\s+\S+/gi, 'Bearer <redacted>')
          .replace(/https?:\/\/\S+/gi, '<url>')}`
      );
    }
    console.error('FAIL live MCP protocol verification');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
