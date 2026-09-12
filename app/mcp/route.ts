import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAccessToken } from '@/lib/mcp/auth/provider';
import { checkMcpRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/mcp/auth/rate-limit';
import { allTools, toolDefinitions } from '@/lib/mcp/tools';
import { McpValidationError } from '@/lib/mcp/errors';
import { createStructuredResult, type McpTool, type McpToolResult } from '@/lib/mcp/results';
import {
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
  type IdempotencyKey,
} from '@/lib/mcp/idempotency';
import { getMcpPublicBaseUrl, isAllowedMcpOrigin } from '@/lib/mcp/auth/public-origin';
import { hashMcpArguments } from '@/lib/mcp/request-hash';
import { readBoundedJsonBody } from '@/lib/request-body';
import { z } from 'zod';

const jsonRpcRequestSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string().max(200), z.number().finite(), z.null()]).optional(),
    method: z.string().min(1).max(100),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

type JsonRpcRequest = z.infer<typeof jsonRpcRequestSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getRequiredScopes(definition: unknown): string[] | undefined {
  if (!isRecord(definition) || !isRecord(definition.annotations)) return undefined;
  const scopes = definition.annotations.requiredScopes;
  return Array.isArray(scopes) && scopes.every(scope => typeof scope === 'string')
    ? scopes
    : undefined;
}

function isMcpToolResult(value: unknown): value is McpToolResult {
  if (!isRecord(value) || !Array.isArray(value.content)) return false;
  if (
    !value.content.every(
      item => isRecord(item) && item.type === 'text' && typeof item.text === 'string'
    )
  ) {
    return false;
  }
  if (value.isError !== undefined && typeof value.isError !== 'boolean') return false;
  return value.structuredContent === undefined || isRecord(value.structuredContent);
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const MODERN_PROTOCOL_VERSION = '2026-07-28';
const SUPPORTED_PROTOCOL_VERSIONS = [MODERN_PROTOCOL_VERSION, '2025-11-25'] as const;

const SERVER_CAPABILITIES = {
  tools: {},
  resources: {},
  prompts: {},
};

const SERVER_INFO = {
  name: 'jobmark-mcp',
  version: '1.0.0',
};

// MCP clients may surface server instructions alongside their own response.
// Keep the handoff human-first: implementation names and opaque record IDs
// are for the connection, never for the person using the assistant.
const SERVER_INSTRUCTIONS =
  'Jobmark keeps private work notes. Speak plainly and refer to people, projects, and notes by their names or clear details. Never show internal IDs, database identifiers, tool names, scopes, or protocol steps in the user-facing response. For reviews and messages, return an editable draft for the user to review and never send or change anything without clear confirmation.';

function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function createSuccessResponse(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

const DOMAIN_ERROR_CODES: Record<string, number> = {
  VALIDATION_ERROR: -32602,
  NOT_FOUND: -32004,
  FORBIDDEN: -32003,
  VAULT_LOCKED: -32003,
  USER_ACTION_REQUIRED: -32000,
  CONFIRMATION_REQUIRED: -32000,
  CONFLICT: -32009,
  RATE_LIMITED: -32029,
  INSUFFICIENT_SCOPE: -32003,
  UNAUTHENTICATED: -32001,
  INTERNAL_ERROR: -32603,
};

function normalizeJsonRpcError(error: unknown): {
  code: number;
  message: string;
  data?: unknown;
} {
  const candidate = isRecord(error) ? error : {};
  if (typeof candidate.code === 'number' && typeof candidate.message === 'string') {
    return { code: candidate.code, message: candidate.message, data: candidate.data };
  }

  const candidateDomainCode = typeof candidate.code === 'string' ? candidate.code : null;
  const domainCode = candidateDomainCode ?? 'INTERNAL_ERROR';
  const isKnownDomainError =
    candidateDomainCode !== null &&
    Object.prototype.hasOwnProperty.call(DOMAIN_ERROR_CODES, domainCode);
  const message =
    isKnownDomainError && typeof candidate.message === 'string'
      ? candidate.message
      : 'Internal server error';
  const data = isRecord(candidate.data)
    ? { ...candidate.data, code: domainCode }
    : { code: domainCode };
  return { code: DOMAIN_ERROR_CODES[domainCode] ?? -32603, message, data };
}

function getRequestedProtocolVersion(
  request: NextRequest,
  params?: Record<string, unknown>
): string | null {
  const metadata = isRecord(params?._meta) ? params._meta : {};
  const metadataVersion = metadata['io.modelcontextprotocol/protocolVersion'];
  if (typeof metadataVersion === 'string') return metadataVersion;
  return request.headers.get('mcp-protocol-version');
}

function isKnownProtocolVersion(version: string): boolean {
  return (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(version);
}

function decodeMcpHeaderValue(value: string): string | null {
  const prefix = '=?base64?';
  const suffix = '?=';
  if (!value.startsWith(prefix) || !value.endsWith(suffix)) return value;

  try {
    const encoded = value.slice(prefix.length, -suffix.length);
    const binary = atob(encoded);
    return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
  } catch {
    return null;
  }
}

function validateModernTransportHeaders(
  request: NextRequest,
  jsonRpcRequest: JsonRpcRequest
): { code: number; message: string; data?: unknown } | null {
  const params = jsonRpcRequest.params ?? {};
  const metadata = isRecord(params._meta) ? params._meta : undefined;
  const bodyVersion = metadata?.['io.modelcontextprotocol/protocolVersion'];
  const headerVersion = request.headers.get('mcp-protocol-version');

  if (typeof bodyVersion === 'string' && !isKnownProtocolVersion(bodyVersion)) {
    return {
      code: -32022,
      message: `Unsupported protocol version: ${bodyVersion}`,
      data: { supported: [...SUPPORTED_PROTOCOL_VERSIONS], requested: bodyVersion },
    };
  }
  if (headerVersion && !isKnownProtocolVersion(headerVersion)) {
    return {
      code: -32022,
      message: `Unsupported protocol version: ${headerVersion}`,
      data: { supported: [...SUPPORTED_PROTOCOL_VERSIONS], requested: headerVersion },
    };
  }
  if (headerVersion && typeof bodyVersion === 'string' && headerVersion !== bodyVersion) {
    return {
      code: -32020,
      message: 'Header mismatch: MCP-Protocol-Version does not match request metadata',
    };
  }

  const isModern =
    bodyVersion === MODERN_PROTOCOL_VERSION || headerVersion === MODERN_PROTOCOL_VERSION;
  if (!isModern) return null;

  if (bodyVersion !== MODERN_PROTOCOL_VERSION || headerVersion !== MODERN_PROTOCOL_VERSION) {
    return {
      code: -32020,
      message: 'Header mismatch: modern requests require matching protocol metadata and header',
    };
  }

  const methodHeader = request.headers.get('mcp-method');
  if (!methodHeader || methodHeader !== jsonRpcRequest.method) {
    return {
      code: -32020,
      message: 'Header mismatch: Mcp-Method does not match request method',
    };
  }

  const namedMethod =
    jsonRpcRequest.method === 'tools/call' || jsonRpcRequest.method === 'prompts/get';
  const namedResource = jsonRpcRequest.method === 'resources/read';
  if (namedMethod || namedResource) {
    const sourceValue = namedResource ? params.uri : params.name;
    const nameHeader = request.headers.get('mcp-name');
    if (
      typeof sourceValue !== 'string' ||
      !nameHeader ||
      decodeMcpHeaderValue(nameHeader) !== sourceValue
    ) {
      return {
        code: -32020,
        message: 'Header mismatch: Mcp-Name does not match request parameters',
      };
    }
  }

  return null;
}

function addModernResultMetadata(result: unknown): unknown {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  const current = result as Record<string, unknown>;
  const metadata = isRecord(current._meta) ? current._meta : {};
  return {
    resultType: current.resultType ?? 'complete',
    ...current,
    _meta: {
      ...metadata,
      'io.modelcontextprotocol/serverInfo': SERVER_INFO,
    },
  };
}

function getAuthenticateHeader(request: NextRequest): string {
  const baseUrl = getMcpPublicBaseUrl(request);
  return `Bearer realm="mcp://jobmark", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp", scope="jobmark:read"`;
}

type McpAuthRejectionReason =
  | 'missing_authorization'
  | 'invalid_authorization_scheme'
  | 'invalid_access_token'
  | 'oauth_client_not_found'
  | 'mcp_connection_not_found';

function logMcpAuthRejection(request: NextRequest, reason: McpAuthRejectionReason): void {
  // Keep this diagnostic deliberately credential-free: never include the
  // bearer value, query string, user id, or client id in rejection logs.
  console.warn(
    JSON.stringify({
      event: 'mcp_auth_rejected',
      reason,
      method: request.method,
      path: new URL(request.url).pathname,
      request_id: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    })
  );
}

async function validateMcpConnection(request: NextRequest): Promise<{
  connectionId: string;
  userId: string;
  clientId: string;
  scopes: string[];
  vaultUnlockedUntil: Date | null;
} | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    logMcpAuthRejection(request, 'missing_authorization');
    return null;
  }
  if (!authHeader.startsWith('Bearer ')) {
    logMcpAuthRejection(request, 'invalid_authorization_scheme');
    return null;
  }

  const token = authHeader.slice(7);
  const validation = await validateAccessToken(token);
  if (!validation) {
    logMcpAuthRejection(request, 'invalid_access_token');
    return null;
  }

  // Resolve public clientId to internal CUID
  const client = await prisma.oAuthClient.findUnique({ where: { clientId: validation.clientId } });
  if (!client) {
    logMcpAuthRejection(request, 'oauth_client_not_found');
    return null;
  }

  const connection = await prisma.mcpConnection.findFirst({
    where: {
      userId: validation.userId,
      oauthClientId: client.id,
      revokedAt: null,
    },
    orderBy: { lastUsedAt: 'desc' },
  });

  if (!connection) {
    logMcpAuthRejection(request, 'mcp_connection_not_found');
    return null;
  }

  return {
    connectionId: connection.id,
    userId: validation.userId,
    clientId: validation.clientId,
    scopes: validation.scope.split(' '),
    vaultUnlockedUntil: connection.vaultUnlockedUntil,
  };
}

function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes('jobmark:destructive')) return true;
  if (required === 'jobmark:read')
    return (
      scopes.includes('jobmark:read') ||
      scopes.includes('jobmark:write') ||
      scopes.includes('jobmark:destructive')
    );
  if (required === 'jobmark:write')
    return scopes.includes('jobmark:write') || scopes.includes('jobmark:destructive');
  return scopes.includes(required);
}

function toPublicToolDefinition(definition: (typeof toolDefinitions)[number]) {
  const annotations = isRecord(definition.annotations) ? definition.annotations : {};
  return {
    ...definition,
    annotations: {
      title: annotations.title,
      readOnlyHint: annotations.readOnlyHint,
      destructiveHint: annotations.destructiveHint,
      idempotentHint: annotations.idempotentHint,
      openWorldHint: annotations.openWorldHint,
    },
  };
}

function assertRequiredToolScopes(tool: McpTool, scopes: string[]): void {
  for (const scope of getRequiredScopes(tool.definition) ?? []) {
    if (!hasScope(scopes, scope)) {
      throw {
        code: -32603,
        message: `Insufficient scope: requires ${scope}`,
        data: { code: 'INSUFFICIENT_SCOPE', required: scope },
      };
    }
  }
}

function assertVaultToolAccess(toolName: string, vaultUnlockedUntil: Date | null): void {
  if (!toolName.startsWith('vault_')) return;

  const isUnlocked = vaultUnlockedUntil != null && vaultUnlockedUntil > new Date();
  const isVaultStatusCall = toolName === 'vault_status';
  const isVaultBeginCall = toolName.startsWith('vault_begin_');
  const isVaultLockCall = toolName === 'vault_lock';
  if (isVaultStatusCall || isVaultBeginCall || isVaultLockCall || isUnlocked) return;

  throw {
    code: -32603,
    message: 'Private projects are closed. Open them from the connection link before continuing.',
    data: { code: 'VAULT_LOCKED' },
  };
}

function getToolIdempotencyKey(
  tool: McpTool,
  connectionId: string,
  method: string,
  params: Record<string, unknown>,
  requestKey?: string
): IdempotencyKey | null {
  if (!requestKey || tool.definition.annotations?.readOnlyHint === true) return null;
  if (tool.definition.name.startsWith('vault_begin_')) return null;

  return {
    connectionId,
    toolName: method,
    requestKey,
    requestHash: hashMcpArguments(params),
  };
}

async function getIdempotencyReplay(
  key: IdempotencyKey,
  method: string,
  vaultUnlockedUntil: Date | null
): Promise<McpToolResult | null> {
  const claim = await claimIdempotency(key);
  if (claim.kind === 'owner') return null;

  if (claim.kind === 'cached') {
    const grantStillActive = vaultUnlockedUntil != null && vaultUnlockedUntil > new Date();
    const safeToReplayAfterLock = method === 'vault_lock';
    if (!grantStillActive && !safeToReplayAfterLock) {
      throw {
        code: -32003,
        message: 'The private-project grant is no longer active for this retry.',
        data: { code: 'VAULT_LOCKED' },
      };
    }
    if (!isMcpToolResult(claim.result)) {
      throw { code: -32603, message: 'Invalid cached result', data: { code: 'INTERNAL_ERROR' } };
    }
    return claim.result;
  }

  if (claim.kind === 'conflict') {
    throw {
      code: -32009,
      message: 'This idempotency key was already used for different arguments.',
      data: { code: 'IDEMPOTENCY_KEY_REUSED' },
    };
  }

  throw {
    code: -32001,
    message: 'A request with this idempotency key is still in progress',
    data: { code: 'IDEMPOTENCY_IN_PROGRESS' },
  };
}

async function executeTool(
  connectionId: string,
  userId: string,
  clientId: string,
  scopes: string[],
  method: string,
  params: Record<string, unknown>,
  vaultUnlockedUntil: Date | null,
  idempotencyKey?: string
): Promise<McpToolResult> {
  const tool = allTools.find(t => t.definition.name === method);
  if (!tool) {
    throw { code: -32601, message: 'Method not found', data: { code: 'METHOD_NOT_FOUND' } };
  }

  assertRequiredToolScopes(tool, scopes);
  assertVaultToolAccess(tool.definition.name, vaultUnlockedUntil);

  const idempotency = getToolIdempotencyKey(tool, connectionId, method, params, idempotencyKey);
  const replay = idempotency
    ? await getIdempotencyReplay(idempotency, method, vaultUnlockedUntil)
    : null;
  if (replay) return replay;

  const isVaultUnlocked = vaultUnlockedUntil != null && vaultUnlockedUntil > new Date();
  const actor = {
    userId,
    source: 'mcp' as const,
    connectionId,
    clientId,
    scopes,
    vaultUnlocked: isVaultUnlocked,
    vaultUnlockedUntil,
    requestId: crypto.randomUUID(),
  };

  let result: McpToolResult;
  try {
    result = await tool.execute(actor, params);
  } catch (error: unknown) {
    if (error instanceof McpValidationError) {
      result = createStructuredResult(
        { error: error.code, message: error.message, fieldErrors: error.fieldErrors },
        error.message,
        true
      );
    } else {
      if (idempotency) await releaseIdempotency(idempotency);
      throw error;
    }
  }

  if (idempotency) {
    // The domain mutation and idempotency completion are separate writes. If
    // completion fails, keep the pending claim rather than releasing it and
    // making an automatic retry capable of duplicating an already-applied
    // mutation. The claim expires and the client receives an explicit error;
    // this does not promise unsupported exactly-once delivery.
    await completeIdempotency(idempotency, result);
  }

  await prisma.mcpConnection.update({
    where: { id: connectionId },
    data: { lastUsedAt: new Date() },
  });

  return result;
}

type McpMethodContext = {
  method: string;
  params?: Record<string, unknown>;
  request: NextRequest;
  connectionId: string;
  userId: string;
  clientId: string;
  scopes: string[];
  vaultUnlockedUntil: Date | null;
};

function listMcpTools(params: Record<string, unknown> | undefined, scopes: string[]) {
  const cursor = params?.cursor;
  const requestedLimit = params?.limit;
  if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 200)) {
    throw { code: -32602, message: 'Invalid tools/list cursor' };
  }

  let limit = 50;
  if (requestedLimit !== undefined) {
    if (
      typeof requestedLimit !== 'number' ||
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 1 ||
      requestedLimit > 100
    ) {
      throw { code: -32602, message: 'Invalid tools/list limit' };
    }
    limit = requestedLimit;
  }

  let tools = toolDefinitions
    .filter(definition => {
      const requiredScopes = getRequiredScopes(definition);
      return !requiredScopes || requiredScopes.every(scope => hasScope(scopes, scope));
    })
    .map(toPublicToolDefinition);
  if (cursor) {
    const index = tools.findIndex(tool => tool.name === cursor);
    tools = tools.slice(index + 1);
  }
  const page = tools.slice(0, limit);
  return {
    tools: page,
    nextCursor: page.length === limit ? page[page.length - 1].name : undefined,
    ttlMs: 300_000,
    cacheScope: 'private',
  };
}

async function callMcpTool(context: McpMethodContext): Promise<McpToolResult> {
  const params = context.params ?? {};
  const toolName = params.name;
  const rawArguments = params.arguments;
  if (typeof toolName !== 'string' || toolName.length === 0 || toolName.length > 200) {
    throw { code: -32602, message: 'Invalid tool name' };
  }
  if (rawArguments !== undefined && !isRecord(rawArguments)) {
    throw { code: -32602, message: 'Tool arguments must be an object' };
  }

  const idempotencyKey = context.request.headers.get('idempotency-key');
  if (idempotencyKey !== null && (idempotencyKey.length === 0 || idempotencyKey.length > 200)) {
    throw { code: -32602, message: 'Invalid Idempotency-Key' };
  }

  return executeTool(
    context.connectionId,
    context.userId,
    context.clientId,
    context.scopes,
    toolName,
    isRecord(rawArguments) ? rawArguments : {},
    context.vaultUnlockedUntil,
    idempotencyKey ?? undefined
  );
}

async function executeMcpMethod({
  method,
  params,
  request,
  connectionId,
  userId,
  clientId,
  scopes,
  vaultUnlockedUntil,
}: McpMethodContext): Promise<unknown> {
  switch (method) {
    case 'server/discover':
      return {
        resultType: 'complete',
        supportedVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
        capabilities: SERVER_CAPABILITIES,
        ttlMs: 300_000,
        cacheScope: 'public',
        instructions: SERVER_INSTRUCTIONS,
      };
    case 'initialize':
      return {
        protocolVersion:
          typeof params?.protocolVersion === 'string' ? params.protocolVersion : '2024-11-05',
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      };
    case 'notifications/initialized':
    case 'ping':
      return {};
    case 'tools/list':
      return listMcpTools(params, scopes);
    case 'tools/call':
      return callMcpTool({
        method,
        params,
        request,
        connectionId,
        userId,
        clientId,
        scopes,
        vaultUnlockedUntil,
      });
    case 'resources/list':
      return {
        resources: [],
        nextCursor: undefined,
        ttlMs: 300_000,
        cacheScope: 'public',
      };
    case 'prompts/list':
      return {
        prompts: [],
        nextCursor: undefined,
        ttlMs: 300_000,
        cacheScope: 'public',
      };
    default:
      throw { code: -32601, message: 'Method not found', data: { code: 'METHOD_NOT_FOUND' } };
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedMcpOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const startTime = Date.now();

  const authResult = await validateMcpConnection(request);
  if (!authResult) {
    return NextResponse.json(
      createErrorResponse(null, -32600, 'Invalid or missing access token', {
        code: 'INVALID_TOKEN',
      }),
      { status: 401, headers: { 'WWW-Authenticate': getAuthenticateHeader(request) } }
    );
  }

  const { connectionId, userId, scopes } = authResult;

  const rateLimit = await checkMcpRateLimit(connectionId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      createErrorResponse(null, -32603, 'Rate limit exceeded', {
        code: 'RATE_LIMITED',
        retryAfter: rateLimit.retryAfter,
      }),
      { status: 429, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) }
    );
  }

  let jsonRpcRequest: JsonRpcRequest;
  try {
    const body = await readBoundedJsonBody(request);
    if (body.kind === 'too_large') {
      return NextResponse.json(
        createErrorResponse(null, -32600, 'Request is too large', { code: 'REQUEST_TOO_LARGE' }),
        { status: 413, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) }
      );
    }
    if (body.kind !== 'ok') throw new Error('PARSE_ERROR');
    const parsed = jsonRpcRequestSchema.safeParse(body.value);
    if (!parsed.success) throw new Error('INVALID_REQUEST');
    jsonRpcRequest = parsed.data;
  } catch {
    return NextResponse.json(
      createErrorResponse(null, -32600, 'Invalid Request', { code: 'INVALID_REQUEST' }),
      { status: 400, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) }
    );
  }

  const transportValidationError = validateModernTransportHeaders(request, jsonRpcRequest);
  if (transportValidationError) {
    return NextResponse.json(
      createErrorResponse(
        jsonRpcRequest.id ?? null,
        transportValidationError.code,
        transportValidationError.message,
        transportValidationError.data
      ),
      { status: 400, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) }
    );
  }

  const { id, method, params } = jsonRpcRequest;
  const isNotification = id === null || id === undefined;
  const requestedProtocolVersion = getRequestedProtocolVersion(request, params);

  if (method === 'server/discover') {
    console.info(
      JSON.stringify({
        event: 'mcp_protocol_discovery',
        requested_version: requestedProtocolVersion,
      })
    );
  }

  try {
    let result = await executeMcpMethod({
      method,
      params,
      request,
      connectionId,
      userId,
      clientId: authResult.clientId,
      scopes,
      vaultUnlockedUntil: authResult.vaultUnlockedUntil,
    });

    if (isNotification) {
      return new NextResponse(null, {
        status: 202,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
      });
    }

    if (requestedProtocolVersion === MODERN_PROTOCOL_VERSION) {
      result = addModernResultMetadata(result);
    }

    return NextResponse.json(createSuccessResponse(id, result), {
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = normalizeJsonRpcError(error);

    console.error(
      JSON.stringify({
        connection_id: connectionId,
        tool: method,
        duration_ms: duration,
        status: 'error',
        error_code:
          err.data && typeof err.data === 'object' && 'code' in err.data
            ? ((err.data as { code?: string }).code ?? 'INTERNAL_ERROR')
            : 'INTERNAL_ERROR',
      })
    );

    if (isNotification) {
      return new NextResponse(null, {
        status: 202,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
      });
    }

    return NextResponse.json(createErrorResponse(id, err.code, err.message, err.data), {
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
    });
  }
}

export async function GET(request: NextRequest) {
  if (!isAllowedMcpOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const authResult = await validateMcpConnection(request);
  if (!authResult) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': getAuthenticateHeader(request) } }
    );
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
