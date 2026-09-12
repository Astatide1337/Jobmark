/**
 * Jobmark Actor - trusted identity for domain functions
 */
export type JobmarkActor = {
  userId: string;
  source: 'web' | 'mcp';
  connectionId?: string;
  vaultUnlocked: boolean;
  /** The verified MCP grant expiry, when the actor came from MCP. */
  vaultUnlockedUntil?: Date | null;
  requestId: string;
};

export function assertActor(actor: JobmarkActor): void {
  if (!actor?.userId) {
    throw new Error('Invalid actor: missing userId');
  }
  if (!actor.requestId) {
    throw new Error('Invalid actor: missing requestId');
  }
}
