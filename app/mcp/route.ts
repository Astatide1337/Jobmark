import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAccessToken } from '@/lib/mcp/auth/provider';
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/mcp/auth/rate-limit';
import { allTools, toolDefinitions } from '@/lib/mcp/tools';

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

interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

function createErrorResponse(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function createSuccessResponse(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

async function validateMcpConnection(request: NextRequest): Promise<{ connectionId: string; userId: string; scopes: string[]; vaultUnlockedUntil: Date | null } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const validation = await validateAccessToken(token);
  if (!validation) return null;

  const connection = await prisma.mcpConnection.findFirst({
    where: {
      userId: validation.userId,
      oauthClientId: validation.clientId,
      revokedAt: null,
    },
    orderBy: { lastUsedAt: 'desc' },
  });

  if (!connection) return null;

  return {
    connectionId: connection.id,
    userId: validation.userId,
    scopes: validation.scope.split(' '),
    vaultUnlockedUntil: connection.vaultUnlockedUntil,
  };
}

function hasScope(scopes: string[], required: string): boolean {
  return scopes.some(s => s === required || s === 'mcp:admin');
}

async function checkIdempotency(connectionId: string, key: string): Promise<{ exists: boolean; result?: unknown }> {
  const uniqueConstraint = { connectionId_toolName_requestKey: { connectionId, toolName: '', requestKey: key } };
  const record = await prisma.mcpIdempotency.findUnique({
    where: { connectionId_toolName_requestKey: uniqueConstraint.connectionId_toolName_requestKey },
  });

  if (record) {
    return { exists: true, result: record.resultJson };
  }

  return { exists: false };
}

async function storeIdempotency(connectionId: string, toolName: string, key: string, result: unknown): Promise<void> {
  await prisma.mcpIdempotency.create({
    data: {
      connectionId,
      toolName,
      requestKey: key,
      resultJson: result as never,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

async function executeTool(connectionId: string, userId: string, scopes: string[], method: string, params: Record<string, unknown>, vaultUnlockedUntil: Date | null, idempotencyKey?: string): Promise<McpToolResult> {
  const tool = allTools.find(t => t.definition.name === method);
  if (!tool) {
    throw { code: -32601, message: 'Method not found', data: { code: 'METHOD_NOT_FOUND' } };
  }

  const requiredScopes = (tool.definition.annotations as Record<string, unknown>)?.requiredScopes as string[] | undefined;
  if (requiredScopes) {
    for (const scope of requiredScopes) {
      if (!hasScope(scopes, scope)) {
        throw { code: -32603, message: `Insufficient scope: requires ${scope}`, data: { code: 'INSUFFICIENT_SCOPE', required: scope } };
      }
    }
  }

  if (tool.definition.annotations?.idempotent && idempotencyKey) {
    const { exists, result } = await checkIdempotency(connectionId, idempotencyKey);
    if (exists && result) {
      return result as McpToolResult;
    }
  }

  if (tool.definition.name.startsWith('vault_')) {
    const isUnlocked = vaultUnlockedUntil && vaultUnlockedUntil > new Date();
    const isVaultStatusCall = tool.definition.name === 'vault_status';
    const isVaultBeginCall = tool.definition.name.startsWith('vault_begin_');

    if (!isVaultStatusCall && !isVaultBeginCall && !isUnlocked) {
      throw { code: -32603, message: 'Vault is locked. Use vault_begin_unlock to start the unlock flow.', data: { code: 'VAULT_LOCKED' } };
    }
  }

  const isVaultUnlocked = vaultUnlockedUntil != null && vaultUnlockedUntil > new Date();
  const actor = { userId, source: 'mcp' as const, connectionId, clientId: '', scopes, vaultUnlocked: isVaultUnlocked, requestId: crypto.randomUUID() };
  const result = await tool.execute(actor, params);

  if (tool.definition.annotations?.idempotent && idempotencyKey) {
    await storeIdempotency(connectionId, method, idempotencyKey, result);
  }

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
      createErrorResponse(null, -32600, 'Invalid or missing access token', { code: 'INVALID_TOKEN' }),
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="mcp://jobmark"' } }
    );
  }

  const { connectionId, userId, scopes } = authResult;

  const rateLimit = await checkRateLimit(connectionId, RATE_LIMITS.mcp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      createErrorResponse(null, -32603, 'Rate limit exceeded', { code: 'RATE_LIMITED', retryAfter: rateLimit.retryAfter }),
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
      createErrorResponse(jsonRpcRequest.id ?? null, -32600, 'Invalid Request', { code: 'INVALID_REQUEST' }),
      { status: 400, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) }
    );
  }

  const { id, method, params } = jsonRpcRequest;
  const isNotification = id === null || id === undefined;

  try {
    let result: unknown;

    switch (method) {
      case 'initialize': {
        const protocolVersion = (params as Record<string, unknown>)?.protocolVersion ?? '2024-11-05';
        result = {
          protocolVersion,
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: 'jobmark-mcp',
            version: '1.0.0',
          },
        };
        break;
      }

      case 'ping': {
        result = {};
        break;
      }

      case 'tools/list': {
        const cursor = (params as Record<string, unknown>)?.cursor as string | undefined;
        const limit = Math.min(((params as Record<string, unknown>)?.limit as number) ?? 50, 100);

        let tools = toolDefinitions;
        if (cursor) {
          const index = tools.findIndex(t => t.name === cursor);
          tools = tools.slice(index + 1);
        }

        const page = tools.slice(0, limit);
        result = {
          tools: page,
          nextCursor: page.length === limit ? page[page.length - 1].name : undefined,
        };
        break;
      }

      case 'tools/call': {
        const toolName = (params as Record<string, unknown>)?.name as string;
        const toolParams = ((params as Record<string, unknown>)?.arguments as Record<string, unknown>) ?? {};
        const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;

        const toolResult = await executeTool(connectionId, userId, scopes, toolName, toolParams, authResult.vaultUnlockedUntil, idempotencyKey);
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
      return new NextResponse(null, { status: 204, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) });
    }

    return NextResponse.json(createSuccessResponse(id, result), {
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
    });

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = error as { code?: number; message?: string; data?: { code?: string } };

    console.log(JSON.stringify({
      connection_id: connectionId,
      tool: method,
      duration_ms: duration,
      status: 'error',
      error_code: err?.data?.code ?? 'INTERNAL_ERROR',
    }));

    if (isNotification) {
      return new NextResponse(null, { status: 204, headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp) });
    }

    if (err?.code && err?.message) {
      return NextResponse.json(createErrorResponse(id, err.code, err.message, err.data), {
        headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
      });
    }

    return NextResponse.json(createErrorResponse(id, -32603, 'Internal error', { code: 'INTERNAL_ERROR' }), {
      headers: createRateLimitHeaders(rateLimit, RATE_LIMITS.mcp),
    });
  }
}

export async function GET(request: NextRequest) {
  const authResult = await validateMcpConnection(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
