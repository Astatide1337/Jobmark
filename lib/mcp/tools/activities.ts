import { z } from 'zod';
import {
  listActivities,
  getActivity,
  getActivityStats,
  createActivity,
  updateActivity,
  deleteActivity,
} from '@/lib/jobmark/activities';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError, McpNotFoundError, McpVaultLockedError } from '../errors';
import { createStructuredResult } from '../results';
import { getLimit } from '../pagination';

const activityListSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  projectId: z.string().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().max(200).optional(),
});

const activityGetSchema = z.object({ activityId: z.string() });

const activityCreateSchema = z.object({
  content: z.string().min(1).max(5000),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: z.string().optional().nullable(),
});

const activityUpdateSchema = z.object({
  activityId: z.string(),
  content: z.string().min(1).max(5000).optional(),
  logDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  projectId: z.string().optional().nullable(),
});

const activityDeleteSchema = z.object({ activityId: z.string() });

export const activitiesListTool = {
  definition: {
    name: 'activities_list',
    title: 'List notes',
    description:
      'List saved work notes with pagination and filters. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
        cursor: { type: 'string' },
        projectId: { type: 'string' },
        dateFrom: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        dateTo: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        search: { type: 'string', maxLength: 200 },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        activities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              logDate: { type: 'string' },
              projectId: { type: ['string', 'null'] },
              project: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                },
              },
              createdAt: { type: 'string' },
            },
          },
        },
        nextCursor: { type: ['string', 'null'] },
        totalCount: { type: 'number' },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = activityListSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await listActivities(actor, {
      limit: getLimit('activities', result.data.limit),
      cursor: result.data.cursor,
      projectId: result.data.projectId,
      dateFrom: result.data.dateFrom,
      dateTo: result.data.dateTo,
      search: result.data.search,
    });
    return createStructuredResult(data, `Found ${data.activities.length} notes`);
  },
};

export const activitiesGetTool = {
  definition: {
    name: 'activities_get',
    title: 'Get note',
    description: 'Get one saved note by ID. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {
        activityId: { type: 'string' },
      },
      required: ['activityId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        content: { type: 'string' },
        logDate: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        project: {
          type: ['object', 'null'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
          },
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = activityGetSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const activity = await getActivity(actor, result.data.activityId);
    if (!activity) {
      throw new McpNotFoundError('Note');
    }
    return createStructuredResult(activity, `Note: ${activity.content.slice(0, 80)}...`);
  },
};

export const activitiesCreateTool = {
  definition: {
    name: 'activities_create',
    title: 'Create note',
    description: 'Save a new work note. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 5000 },
        logDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        projectId: { type: ['string', 'null'] },
      },
      required: ['content', 'logDate'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        content: { type: 'string' },
        logDate: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
      },
    },
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      requiredScopes: ['jobmark:write'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = activityCreateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    try {
      const activity = await createActivity(actor, result.data);
      return createStructuredResult(activity, `Saved note for ${result.data.logDate}`);
    } catch (error) {
      if (error instanceof McpVaultLockedError) {
        throw new McpVaultLockedError('This project is private. Open it before editing the note.');
      }
      throw error;
    }
  },
};

export const activitiesUpdateTool = {
  definition: {
    name: 'activities_update',
    title: 'Update note',
    description: 'Update a saved note. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        activityId: { type: 'string' },
        content: { type: 'string', minLength: 1, maxLength: 5000 },
        logDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        projectId: { type: ['string', 'null'] },
      },
      required: ['activityId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        content: { type: 'string' },
        logDate: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        updatedAt: { type: 'string' },
      },
    },
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      requiredScopes: ['jobmark:write'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = activityUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { activityId, ...data } = result.data;
    try {
      const activity = await updateActivity(actor, activityId, data);
      return createStructuredResult(activity, 'Note updated');
    } catch (error) {
      if (error instanceof McpVaultLockedError) {
        throw new McpVaultLockedError('This project is private. Open it before editing the note.');
      }
      throw error;
    }
  },
};

export const activitiesDeleteTool = {
  definition: {
    name: 'activities_delete',
    title: 'Delete note',
    description: 'Delete a saved note. Requires the jobmark:destructive permission.',
    inputSchema: {
      type: 'object',
      properties: {
        activityId: { type: 'string' },
      },
      required: ['activityId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    annotations: {
      destructiveHint: true,
      idempotentHint: true,
      requiredScopes: ['jobmark:destructive'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = activityDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteActivity(actor, result.data.activityId);
    return createStructuredResult({ success: true }, 'Note deleted');
  },
};
