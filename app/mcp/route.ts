import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAccessToken } from '@/lib/mcp/auth/provider';
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/mcp/auth/rate-limit';
import { allTools, toolDefinitions } from '@/lib/mcp/tools';
import { McpValidationError } from '@/lib/mcp/errors';
import { createStructuredResult, McpToolResult } from '@/lib/mcp/results';
import {
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
} from '@/lib/mcp/idempotency';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
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

function getRequestedProtocolVersion(
  request: NextRequest,
  params?: Record<string, unknown>
): string | null {
  const metadata = (params?._meta as Record<string, unknown> | undefined) ?? {};
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
    return new TextDecoder().decode(
      Uint8Array.from(binary, character => character.charCodeAt(0))
    );
  } catch {
    return null;
  }
}

function validateModernTransportHeaders(
  request: NextRequest,
  jsonRpcRequest: JsonRpcRequest
): { code: number; message: string; data?: unknown } | null {
  const params = jsonRpcRequest.params ?? {};
  const metadata =
    params._meta && typeof params._meta === 'object'
      ? (params._meta as Record<string, unknown>)
      : undefined;
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
  const metadata = (current._meta as Record<string, unknown> | undefined) ?? {};
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
  const origin = new URL(request.url).origin;
  return `Bearer realm="mcp://jobmark", resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`;
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
  const annotations = (definition.annotations as Record<string, unknown> | undefined) ?? {};
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

async function executeTool(
  connectionId: string,
  userId: string,
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

  const requiredScopes = (tool.definition.annotations as Record<string, unknown>)
    ?.requiredScopes as string[] | undefined;
  if (requiredScopes) {
    for (const scope of requiredScopes) {
      if (!hasScope(scopes, scope)) {
        throw {
          code: -32603,
          message: `Insufficient scope: requires ${scope}`,
          data: { code: 'INSUFFICIENT_SCOPE', required: scope },
        };
      }
    }
  }

  if (tool.definition.name.startsWith('vault_')) {
    const isUnlocked = vaultUnlockedUntil && vaultUnlockedUntil > new Date();
    const isVaultStatusCall = tool.definition.name === 'vault_status';
    const isVaultBeginCall = tool.definition.name.startsWith('vault_begin_');

    if (!isVaultStatusCall && !isVaultBeginCall && !isUnlocked) {
      throw {
        code: -32603,
        message: 'Vault is locked. Use vault_begin_unlock to start the unlock flow.',
        data: { code: 'VAULT_LOCKED' },
      };
    }
  }

  const idempotency =
    tool.definition.annotations?.idempotentHint && idempotencyKey
      ? { connectionId, toolName: method, requestKey: idempotencyKey }
      : null;
  if (idempotency) {
    const claim = await claimIdempotency(idempotency);
    if (claim.kind === 'cached') return claim.result as McpToolResult;
    if (claim.kind === 'pending') {
      throw {
        code: -32001,
        message: 'A request with this idempotency key is still in progress',
        data: { code: 'IDEMPOTENCY_IN_PROGRESS' },
      };
    }
  }

  const isVaultUnlocked = vaultUnlockedUntil != null && vaultUnlockedUntil > new Date();
  const actor = {
    userId,
    source: 'mcp' as const,
    connectionId,
    clientId: '',
    scopes,
    vaultUnlocked: isVaultUnlocked,
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

  if (idempotency) await completeIdempotency(idempotency, result);

  await prisma.mcpConnection.update({
    where: { id: connectionId },
    data: { lastUsedAt: new Date() },
  });

  return result;
}

export async function POST(request: NextRequest) {
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

  const rateLimit = await checkRateLimit(connectionId, RATE_LIMITS.mcp);
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
    const body: unknown = await request.json();
    jsonRpcRequest = body as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      createErrorResponse(null, -32700, 'Parse error', { code: 'PARSE_ERROR' }),
      { status: 400, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) }
    );
  }

  if (jsonRpcRequest.jsonrpc !== '2.0') {
    return NextResponse.json(
      createErrorResponse(jsonRpcRequest.id ?? null, -32600, 'Invalid Request', {
        code: 'INVALID_REQUEST',
      }),
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
    let result: unknown;

    switch (method) {
      case 'server/discover': {
        result = {
          resultType: 'complete',
          supportedVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
          capabilities: SERVER_CAPABILITIES,
          ttlMs: 300_000,
          cacheScope: 'public',
          instructions:
            'Use Jobmark tools to view and manage the connected user’s job-search record. Ask before making changes.',
        };
        break;
      }

      case 'initialize': {
        const protocolVersion =
          (params as Record<string, unknown>)?.protocolVersion ?? '2024-11-05';
        result = {
          protocolVersion,
          capabilities: SERVER_CAPABILITIES,
          serverInfo: SERVER_INFO,
        };
        break;
      }

      case 'notifications/initialized': {
        result = {};
        break;
      }

      case 'ping': {
        result = {};
        break;
      }

      case 'tools/list': {
        const cursor = (params as Record<string, unknown>)?.cursor as string | undefined;
        const limit = Math.min(((params as Record<string, unknown>)?.limit as number) ?? 50, 100);

        let tools = toolDefinitions
          .filter(definition => {
            const requiredScopes = (definition.annotations as Record<string, unknown> | undefined)
              ?.requiredScopes as string[] | undefined;
            return !requiredScopes || requiredScopes.every(scope => hasScope(scopes, scope));
          })
          .map(toPublicToolDefinition);
        if (cursor) {
          const index = tools.findIndex(t => t.name === cursor);
          tools = tools.slice(index + 1);
        }

        const page = tools.slice(0, limit);
        result = {
          tools: page,
          nextCursor: page.length === limit ? page[page.length - 1].name : undefined,
          ttlMs: 300_000,
          cacheScope: 'private',
        };
        break;
      }

      case 'tools/call': {
        const toolName = (params as Record<string, unknown>)?.name as string;
        const toolParams =
          ((params as Record<string, unknown>)?.arguments as Record<string, unknown>) ?? {};
        const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;

        const toolResult = await executeTool(
          connectionId,
          userId,
          scopes,
          toolName,
          toolParams,
          authResult.vaultUnlockedUntil,
          idempotencyKey
        );
        result = toolResult;
        break;
      }

      case 'resources/list': {
        result = { resources: [], nextCursor: undefined };
        break;
      }

      case 'prompts/list': {
        result = { prompts: [], nextCursor: undefined };
        break;
      }

      default: {
        throw { code: -32601, message: 'Method not found', data: { code: 'METHOD_NOT_FOUND' } };
      }
    }

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
    const err = error as { code?: number; message?: string; data?: { code?: string } };

    console.log(
      JSON.stringify({
        connection_id: connectionId,
        tool: method,
        duration_ms: duration,
        status: 'error',
        error_code: err?.data?.code ?? 'INTERNAL_ERROR',
      })
    );

    if (isNotification) {
      return new NextResponse(null, {
        status: 202,
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
      });
    }

    if (err?.code && err?.message) {
      return NextResponse.json(createErrorResponse(id, err.code, err.message, err.data), {
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
      });
    }

    return NextResponse.json(
      createErrorResponse(id, -32603, 'Internal error', { code: 'INTERNAL_ERROR' }),
      {
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await validateMcpConnection(request);
  if (!authResult) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': getAuthenticateHeader(request) } }
    );
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
