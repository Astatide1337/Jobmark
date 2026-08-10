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
  requestId: string;
};

export function assertMcpActor(actor: McpActor): void {
  if (!actor?.userId || !actor.connectionId || !actor.requestId) {
    throw new Error('Invalid MCP actor');
  }
}