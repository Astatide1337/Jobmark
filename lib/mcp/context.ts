/**
 * MCP Context - creates actors from validated connections
 */
'use server';

import { prisma } from '@/lib/db';
import { McpActor } from './actor';
import { McpUnauthenticatedError, McpForbiddenError } from './errors';

export interface McpConnection {
  id: string;
  userId: string;
  oauthClientId: string;
  clientName: string;
  scopes: string[];
  vaultUnlockedUntil: Date | null;
  revokedAt: Date | null;
}

export async function getConnectionById(connectionId: string): Promise<McpConnection | null> {
  const conn = await prisma.mcpConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      userId: true,
      oauthClientId: true,
      clientName: true,
      scopes: true,
      vaultUnlockedUntil: true,
      revokedAt: true,
    },
  });

  if (!conn) return null;
  if (conn.revokedAt) return null;

  return conn;
}

export async function getConnectionByAccessToken(tokenHash: string): Promise<McpConnection | null> {
  // Look up the access token
  const token = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      clientId: true,
      userId: true,
      scope: true,
      expiresAt: true,
    },
  });

  if (!token || token.expiresAt < new Date()) return null;

  // Access tokens store the public OAuth client ID; connections store the
  // internal OAuthClient primary key. Resolve the public ID before matching.
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: token.clientId },
    select: { id: true },
  });
  if (!client) return null;

  // Get the connection for this user + client
  const conn = await prisma.mcpConnection.findFirst({
    where: {
      userId: token.userId,
      oauthClientId: client.id,
      revokedAt: null,
    },
    select: {
      id: true,
      userId: true,
      oauthClientId: true,
      clientName: true,
      scopes: true,
      vaultUnlockedUntil: true,
      revokedAt: true,
    },
  });

  return conn;
}

export function createMcpActor(connection: McpConnection, requestId: string): McpActor {
  const vaultUnlocked = connection.vaultUnlockedUntil
    ? connection.vaultUnlockedUntil > new Date()
    : false;

  return {
    userId: connection.userId,
    source: 'mcp' as const,
    connectionId: connection.id,
    clientId: connection.oauthClientId,
    scopes: connection.scopes,
    vaultUnlocked,
    requestId,
  };
}

export function requireScope(actor: McpActor, requiredScope: string): void {
  if (!actor.scopes.includes(requiredScope)) {
    throw new McpForbiddenError(`This connection needs the ${requiredScope} permission.`);
  }
}

export function requireDestructiveScope(actor: McpActor): void {
  requireScope(actor, 'jobmark:destructive');
}

export function requireWriteScope(actor: McpActor): void {
  requireScope(actor, 'jobmark:write');
}

export function requireReadScope(actor: McpActor): void {
  if (
    !actor.scopes.some(
      s => s === 'jobmark:read' || s === 'jobmark:write' || s === 'jobmark:destructive'
    )
  ) {
    throw new McpForbiddenError('This connection needs the jobmark:read permission.');
  }
}
