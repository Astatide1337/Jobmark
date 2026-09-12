/**
 * MCP Actor - extracted from validated OAuth token
 */
export type McpActor = {
  userId: string;
  source: 'mcp';
  connectionId: string;
  clientId: string;
  scopes: string[];
  vaultUnlocked: boolean;
  /** Snapshot of the verified database grant used for this request. */
  vaultUnlockedUntil: Date | null;
  requestId: string;
};

export function assertMcpActor(actor: McpActor): void {
  if (
    !actor ||
    actor.source !== 'mcp' ||
    typeof actor.userId !== 'string' ||
    actor.userId.length === 0 ||
    typeof actor.connectionId !== 'string' ||
    actor.connectionId.length === 0 ||
    typeof actor.clientId !== 'string' ||
    actor.clientId.length === 0 ||
    !Array.isArray(actor.scopes) ||
    !actor.scopes.every(scope => typeof scope === 'string') ||
    typeof actor.vaultUnlocked !== 'boolean' ||
    !(actor.vaultUnlockedUntil === null || actor.vaultUnlockedUntil instanceof Date) ||
    typeof actor.requestId !== 'string' ||
    actor.requestId.length === 0
  ) {
    throw new Error('Invalid MCP actor');
  }
}
