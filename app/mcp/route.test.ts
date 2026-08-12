import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  validateAccessToken: vi.fn(),
  clientFindUnique: vi.fn(),
  connectionFindFirst: vi.fn(),
  connectionUpdate: vi.fn(),
  rateLimit: vi.fn(),
  executeTool: vi.fn(),
  claimIdempotency: vi.fn(),
  completeIdempotency: vi.fn(),
  releaseIdempotency: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    oAuthClient: { findUnique: mocks.clientFindUnique },
    mcpConnection: { findFirst: mocks.connectionFindFirst, update: mocks.connectionUpdate },
  },
}));

vi.mock('@/lib/mcp/auth/provider', () => ({
  validateAccessToken: mocks.validateAccessToken,
}));

vi.mock('@/lib/mcp/auth/rate-limit', () => ({
  checkRateLimit: mocks.rateLimit,
  checkMcpRateLimit: mocks.rateLimit,
  createRateLimitHeaders: () => ({}),
  RATE_LIMITS: { mcp: { maxRequests: 60, windowMs: 60_000 } },
}));

vi.mock('@/lib/mcp/idempotency', () => ({
  claimIdempotency: mocks.claimIdempotency,
  completeIdempotency: mocks.completeIdempotency,
  releaseIdempotency: mocks.releaseIdempotency,
}));

vi.mock('@/lib/mcp/tools', () => {
  const definition = {
    name: 'jobmark_list_projects',
    description: 'List projects',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, idempotentHint: true, requiredScopes: ['jobmark:read'] },
  };
  return {
    allTools: [{ definition, execute: mocks.executeTool }],
    toolDefinitions: [definition],
  };
});

import { POST } from './route';

const metadata = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'ChatGPT', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};

function modernRequest(body: Record<string, unknown>, method: string): NextRequest {
  return new NextRequest('https://jobmark.example.com/mcp', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2026-07-28',
      'mcp-method': method,
    },
    body: JSON.stringify(body),
  });
}

describe('MCP modern discovery and tool listing', () => {
  it('returns discover metadata and then a non-empty tools/list page', async () => {
    mocks.validateAccessToken.mockResolvedValue({
      clientId: 'chatgpt',
      userId: 'user-1',
      scope: 'jobmark:read',
    });
    mocks.clientFindUnique.mockResolvedValue({ id: 'client-1' });
    mocks.connectionFindFirst.mockResolvedValue({
      id: 'connection-1',
      userId: 'user-1',
      scopes: ['jobmark:read'],
      vaultUnlockedUntil: null,
    });
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });

    const discover = await POST(
      modernRequest(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'server/discover',
          params: { _meta: metadata },
        },
        'server/discover'
      )
    );
    expect(discover.status).toBe(200);
    const discoverBody = await discover.json();
    expect(discoverBody.result).toMatchObject({
      resultType: 'complete',
      supportedVersions: ['2026-07-28', '2025-11-25'],
      capabilities: { tools: {} },
      ttlMs: 300_000,
      cacheScope: 'public',
      instructions: expect.stringContaining('Never show internal record IDs'),
      _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'jobmark-mcp' } },
    });

    const tools = await POST(
      modernRequest(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: { _meta: metadata },
        },
        'tools/list'
      )
    );
    expect(tools.status).toBe(200);
    const toolsBody = await tools.json();
    expect(toolsBody.result.resultType).toBe('complete');
    expect(toolsBody.result.cacheScope).toBe('private');
    expect(toolsBody.result.tools).toHaveLength(1);
    expect(toolsBody.result.tools[0]).not.toHaveProperty('annotations.requiredScopes');
  });

  it('rejects a modern header/body protocol mismatch before dispatch', async () => {
    mocks.validateAccessToken.mockResolvedValue({
      clientId: 'chatgpt',
      userId: 'user-1',
      scope: 'jobmark:read',
    });
    mocks.clientFindUnique.mockResolvedValue({ id: 'client-1' });
    mocks.connectionFindFirst.mockResolvedValue({
      id: 'connection-1',
      userId: 'user-1',
      scopes: ['jobmark:read'],
    });
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });

    const request = modernRequest(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: { _meta: { ...metadata, 'io.modelcontextprotocol/protocolVersion': '2025-11-25' } },
      },
      'tools/list'
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: -32020 } });
  });

  it('claims and completes idempotent tool calls using the public idempotentHint', async () => {
    mocks.validateAccessToken.mockResolvedValue({
      clientId: 'chatgpt',
      userId: 'user-1',
      scope: 'jobmark:read',
    });
    mocks.clientFindUnique.mockResolvedValue({ id: 'client-1' });
    mocks.connectionFindFirst.mockResolvedValue({
      id: 'connection-1',
      userId: 'user-1',
      scopes: ['jobmark:read'],
      vaultUnlockedUntil: null,
    });
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    mocks.claimIdempotency.mockResolvedValue({ kind: 'owner' });
    mocks.executeTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
    mocks.completeIdempotency.mockResolvedValue(undefined);
    mocks.connectionUpdate.mockResolvedValue({});

    const response = await POST(
      new NextRequest('https://jobmark.example.com/mcp', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': '2025-11-25',
          'idempotency-key': 'retry-1',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: { name: 'jobmark_list_projects', arguments: {} },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.claimIdempotency).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      toolName: 'jobmark_list_projects',
      requestKey: 'retry-1',
    });
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
    expect(mocks.completeIdempotency).toHaveBeenCalledWith(
      expect.objectContaining({ requestKey: 'retry-1' }),
      { content: [{ type: 'text', text: 'ok' }] }
    );
  });

  it('maps domain error codes to numeric JSON-RPC errors', async () => {
    mocks.validateAccessToken.mockResolvedValue({
      clientId: 'chatgpt',
      userId: 'user-1',
      scope: 'jobmark:read',
    });
    mocks.clientFindUnique.mockResolvedValue({ id: 'client-1' });
    mocks.connectionFindFirst.mockResolvedValue({
      id: 'connection-1',
      userId: 'user-1',
      scopes: ['jobmark:read'],
      vaultUnlockedUntil: null,
    });
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    mocks.executeTool.mockRejectedValue({
      code: 'NOT_FOUND',
      message: 'Project not found',
      data: { resource: 'Project' },
    });

    const response = await POST(
      new NextRequest('https://jobmark.example.com/mcp', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': '2025-11-25',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: { name: 'jobmark_list_projects', arguments: {} },
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32004, data: { code: 'NOT_FOUND', resource: 'Project' } },
    });
  });

  it('does not return raw internal errors to MCP clients', async () => {
    mocks.validateAccessToken.mockResolvedValue({
      clientId: 'chatgpt',
      userId: 'user-1',
      scope: 'jobmark:read',
    });
    mocks.clientFindUnique.mockResolvedValue({ id: 'client-1' });
    mocks.connectionFindFirst.mockResolvedValue({
      id: 'connection-1',
      userId: 'user-1',
      scopes: ['jobmark:read'],
      vaultUnlockedUntil: null,
    });
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    mocks.executeTool.mockRejectedValue(new Error('database password should never escape'));

    const response = await POST(
      new NextRequest('https://jobmark.example.com/mcp', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': '2025-11-25',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: { name: 'jobmark_list_projects', arguments: {} },
        }),
      })
    );

    const body = await response.json();
    expect(body.error.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('database password');
  });
});
