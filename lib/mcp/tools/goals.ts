/**
 * Goals MCP Tools
 */
import { z } from 'zod';
import { listGoals, getGoal, createGoal, updateGoal, deleteGoal } from '@/lib/jobmark/goals';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError } from '../errors';
import { createStructuredResult } from '../results';

const goalCreateSchema = z.object({
  title: z.string().min(1).max(200),
  deadline: z.string().datetime().optional().nullable(),
  why: z.string().max(500).optional().nullable(),
});

const goalUpdateSchema = z.object({
  goalId: z.string(),
  title: z.string().min(1).max(200).optional(),
  deadline: z.string().datetime().optional().nullable(),
  why: z.string().max(500).optional().nullable(),
});

const goalGetDeleteSchema = z.object({
  goalId: z.string(),
});

export const goalsListTool = {
  definition: {
    name: 'goals_list',
    title: 'List goals',
    description: 'List your goals. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100, default: 100 },
        cursor: { type: 'string' },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              deadline: { type: ['string', 'null'] },
              why: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
        nextCursor: { type: ['string', 'null'] },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = z
      .object({
        limit: z.number().int().min(1).max(100).default(100),
        cursor: z.string().optional(),
      })
      .safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { goals, nextCursor } = await listGoals(actor, result.data);
    return createStructuredResult({ goals, nextCursor }, `Found ${goals.length} goals`);
  },
};

export const goalsGetTool = {
  definition: {
    name: 'goals_get',
    title: 'Get goal',
    description: 'Get one goal by ID. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {
        goalId: { type: 'string' },
      },
      required: ['goalId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        deadline: { type: ['string', 'null'] },
        why: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = goalGetDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const goal = await getGoal(actor, result.data.goalId);
    return createStructuredResult(goal, `Goal: ${goal.title}`);
  },
};

export const goalsCreateTool = {
  definition: {
    name: 'goals_create',
    title: 'Create goal',
    description: 'Create a new goal. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        deadline: { type: ['string', 'null'], format: 'date-time' },
        why: { type: ['string', 'null'], maxLength: 500 },
      },
      required: ['title'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        deadline: { type: ['string', 'null'] },
        why: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: {
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
      requiredScopes: ['jobmark:write'],
    },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = goalCreateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const goal = await createGoal(actor, result.data);
    return createStructuredResult(goal, `Created goal: ${goal.title}`);
  },
};

export const goalsUpdateTool = {
  definition: {
    name: 'goals_update',
    title: 'Update goal',
    description: 'Update a goal. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        goalId: { type: 'string' },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        deadline: { type: ['string', 'null'], format: 'date-time' },
        why: { type: ['string', 'null'], maxLength: 500 },
      },
      required: ['goalId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        deadline: { type: ['string', 'null'] },
        why: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
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
    const result = goalUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { goalId, ...data } = result.data;
    const goal = await updateGoal(actor, goalId, data);
    return createStructuredResult(goal, `Updated goal: ${goal.title}`);
  },
};

export const goalsDeleteTool = {
  definition: {
    name: 'goals_delete',
    title: 'Delete goal',
    description: 'Delete a goal. Requires the jobmark:destructive permission.',
    inputSchema: {
      type: 'object',
      properties: {
        goalId: { type: 'string' },
      },
      required: ['goalId'],
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
    const result = goalGetDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteGoal(actor, result.data.goalId);
    return createStructuredResult({ success: true }, 'Goal deleted');
  },
};
