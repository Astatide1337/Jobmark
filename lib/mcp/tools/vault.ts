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
import { McpValidationError, McpVaultLockedError } from '../errors';
import { createStructuredResult } from '../results';

export const vaultStatusTool = {
  definition: {
    name: 'vault_status',
    title: 'Private project status',
    description:
      'Check whether private projects are set up and open. Requires the jobmark:write permission.',
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
    let state = 'not set up';
    if (status.configured) {
      state = 'locked';
      if (status.unlocked) state = 'open';
    }
    return createStructuredResult(status, `Private projects: ${state}`);
  },
};

export const vaultListProjectsTool = {
  definition: {
    name: 'vault_list_projects',
    title: 'List private projects',
    description:
      'List projects hidden by the private project password. Requires the jobmark:write permission.',
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
      return createStructuredResult(data, `Found ${data.projects.length} private projects`);
    } catch (error: unknown) {
      if (error instanceof ValidationError && error.message.includes('not configured')) {
        throw new McpVaultLockedError('Private projects are not set up yet.');
      }
      throw error;
    }
  },
};

export const vaultBeginSetupTool = {
  definition: {
    name: 'vault_begin_setup',
    title: 'Set up private projects',
    description:
      'Open a one-time link to set up the private project password. The link expires in 5 minutes. Requires the jobmark:write permission.',
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
          `Open this link to set up your private project password. It expires in 5 minutes: ${error.actionUrl}`
        );
      }
      throw error;
    }
    throw new McpVaultLockedError('Could not create the setup link.');
  },
};

export const vaultBeginChangePasswordTool = {
  definition: {
    name: 'vault_begin_change_password',
    title: 'Change the private project password',
    description:
      'Open a one-time link to change the private project password. The link expires in 5 minutes. Requires the jobmark:write permission.',
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
          `Open this link to change your private project password. It expires in 5 minutes: ${error.actionUrl}`
        );
      }
      throw error;
    }
    throw new McpVaultLockedError('Could not create the password-change link.');
  },
};

export const vaultBeginUnlockTool = {
  definition: {
    name: 'vault_begin_unlock',
    title: 'Open private projects',
    description:
      'Open a one-time link to open private projects. The link expires in 5 minutes. Requires the jobmark:write permission.',
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
          `Open this link to open your private projects. It expires in 5 minutes: ${error.actionUrl}`
        );
      }
      throw error;
    }
    throw new McpVaultLockedError('Could not create the link to open private projects.');
  },
};

export const vaultLockTool = {
  definition: {
    name: 'vault_lock',
    title: 'Close private projects',
    description: 'Close private projects now. Requires the jobmark:write permission.',
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
    return createStructuredResult({ locked: true }, 'Private projects closed');
  },
};

export const vaultSetProjectLockedTool = {
  definition: {
    name: 'vault_set_project_locked',
    title: 'Set project privacy',
    description:
      'Hide or show one project with the private project password. Requires the jobmark:write permission.',
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
      `Project ${parsed.data.locked ? 'hidden' : 'shown'}`
    );
  },
};
