import { z } from 'zod';
import {
  getVaultStatus,
  listLockedProjects,
  beginVaultSetup,
  beginVaultChangePassword,
  beginVaultUnlock,
  lockVault,
  setProjectLocked,
} from '@/lib/jobmark/vault';
import { UserActionRequiredError, ValidationError } from '@/lib/jobmark/errors';
import { McpActor, assertMcpActor } from '../actor';
import {
  McpValidationError,
  McpVaultLockedError,
} from '../errors';
import { createStructuredResult } from '../results';

export const vaultStatusTool = {
  definition: {
    name: 'vault_status',
    title: 'Vault Status',
    description: 'Get vault lock status and configuration. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false as const,
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        configured: { type: 'boolean' as const },
        unlocked: { type: 'boolean' as const },
        unlockedUntil: { type: ['string', 'null'] as unknown[] },
        lockedProjectCount: { type: 'number' as const },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const status = await getVaultStatus(actor);
    return createStructuredResult(status, `Vault: ${status.configured ? (status.unlocked ? 'unlocked' : 'locked') : 'not configured'}`);
  },
};

export const vaultListProjectsTool = {
  definition: {
    name: 'vault_list_projects',
    title: 'List Vault Projects',
    description: 'List projects locked in the vault. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false as const,
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        projects: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              name: { type: 'string' as const },
              color: { type: 'string' as const },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    try {
      const data = await listLockedProjects(actor);
      return createStructuredResult(data, `Found ${data.projects.length} locked projects`);
    } catch (error: unknown) {
      if (error instanceof ValidationError && error.message.includes('not configured')) {
        throw new McpVaultLockedError('Vault is not configured');
      }
      throw error;
    }
  },
};

export const vaultBeginSetupTool = {
  definition: {
    name: 'vault_begin_setup',
    title: 'Begin Vault Setup',
    description: 'Start vault password setup via secure one-time browser URL. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false as const,
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        actionUrl: { type: 'string' as const },
        expiresAt: { type: 'string' as const },
      },
    },
    annotations: { openWorldHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    try {
      await beginVaultSetup(actor);
    } catch (error: unknown) {
      if (error instanceof UserActionRequiredError) {
        return createStructuredResult(
          { actionUrl: error.actionUrl, expiresAt: error.expiresAt },
          `Open this URL to set up your vault password (expires in 5 minutes): ${error.actionUrl}`
        );
      }
      throw error;
    }
    throw new McpVaultLockedError('Unexpected: vault setup did not return action URL');
  },
};

export const vaultBeginChangePasswordTool = {
  definition: {
    name: 'vault_begin_change_password',
    title: 'Begin Vault Password Change',
    description: 'Start vault password change via secure one-time browser URL. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false as const,
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        actionUrl: { type: 'string' as const },
        expiresAt: { type: 'string' as const },
      },
    },
    annotations: { openWorldHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    try {
      await beginVaultChangePassword(actor);
    } catch (error: unknown) {
      if (error instanceof UserActionRequiredError) {
        return createStructuredResult(
          { actionUrl: error.actionUrl, expiresAt: error.expiresAt },
          `Open this URL to change your vault password (expires in 5 minutes): ${error.actionUrl}`
        );
      }
      throw error;
    }
    throw new McpVaultLockedError('Unexpected: password change did not return action URL');
  },
};

export const vaultBeginUnlockTool = {
  definition: {
    name: 'vault_begin_unlock',
    title: 'Begin Vault Unlock',
    description: 'Start vault unlock flow via secure one-time browser URL (5 min TTL). Requires jobmark:write scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false as const,
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        actionUrl: { type: 'string' as const },
        expiresAt: { type: 'string' as const },
      },
    },
    annotations: { openWorldHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    try {
      await beginVaultUnlock(actor);
    } catch (error: unknown) {
      if (error instanceof UserActionRequiredError) {
        return createStructuredResult(
          { actionUrl: error.actionUrl, expiresAt: error.expiresAt },
          `Open this URL to unlock your vault (expires in 5 minutes): ${error.actionUrl}`
        );
      }
      throw error;
    }
    throw new McpVaultLockedError('Unexpected: vault unlock did not return action URL');
  },
};

export const vaultLockTool = {
  definition: {
    name: 'vault_lock',
    title: 'Lock Vault',
    description: 'Lock the vault immediately. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false as const,
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        locked: { type: 'boolean' as const },
      },
    },
    annotations: { destructiveHint: true, idempotentHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    await lockVault(actor);
    return createStructuredResult({ locked: true }, 'Vault locked');
  },
};

export const vaultSetProjectLockedTool = {
  definition: {
    name: 'vault_set_project_locked',
    title: 'Set Project Vault Lock',
    description: 'Lock or unlock a specific project in the vault. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' as const },
        locked: { type: 'boolean' as const },
      },
      required: ['projectId', 'locked'],
      additionalProperties: false as const,
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' as const },
        locked: { type: 'boolean' as const },
      },
    },
    annotations: { idempotentHint: true, requiredScopes: ['jobmark:write'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const parsed = z.object({ projectId: z.string(), locked: z.boolean() }).safeParse(input);
    if (!parsed.success) {
      throw new McpValidationError('Invalid input', parsed.error.flatten().fieldErrors);
    }

    const updated = await setProjectLocked(actor, parsed.data.projectId, parsed.data.locked);
    return createStructuredResult(
      { projectId: parsed.data.projectId, locked: parsed.data.locked },
      `Project ${parsed.data.locked ? 'locked' : 'unlocked'} in vault`
    );
  },
};
