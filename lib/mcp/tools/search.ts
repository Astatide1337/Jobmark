import { z } from 'zod';
import { globalSearch } from '@/lib/jobmark/search';
import { getDashboardStats, getInsights } from '@/lib/jobmark/insights';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError } from '../errors';
import { createStructuredResult } from '../results';
import { getLimit } from '../pagination';

const searchGlobalSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).optional(),
});

export const searchGlobalTool = {
  definition: {
    name: 'search_global',
    title: 'Global Search',
    description:
      'Search across activities, projects, reports, contacts, and interactions. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
        limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['activity', 'project', 'report', 'contact', 'interaction'],
              },
              id: { type: 'string' },
              title: { type: 'string' },
              snippet: { type: 'string' },
              metadata: { type: 'object', additionalProperties: true },
            },
          },
        },
        query: { type: 'string' },
      },
      required: ['results', 'query'],
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = searchGlobalSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await globalSearch(actor, result.data.query, {
      limit: getLimit('search', result.data.limit),
    });
    return createStructuredResult(
      { results: data, query: result.data.query },
      `Search results for: ${result.data.query}`
    );
  },
};

export const dashboardStatsTool = {
  definition: {
    name: 'dashboard_stats',
    title: 'Dashboard Statistics',
    description: 'Get aggregated dashboard statistics. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        activities: {
          type: 'object',
          properties: {
            thisMonth: { type: 'number' },
            thisWeek: { type: 'number' },
            total: { type: 'number' },
          },
        },
        projects: {
          type: 'object',
          properties: {
            active: { type: 'number' },
            archived: { type: 'number' },
          },
        },
        goals: {
          type: 'object',
          properties: {
            total: { type: 'number' },
          },
        },
        reports: {
          type: 'object',
          properties: {
            total: { type: 'number' },
          },
        },
        contacts: {
          type: 'object',
          properties: {
            total: { type: 'number' },
          },
        },
        streak: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            longest: { type: 'number' },
          },
          required: ['current', 'longest'],
        },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor) => {
    assertMcpActor(actor);
    const data = await getDashboardStats(actor);
    return createStructuredResult(data, `Dashboard stats retrieved`);
  },
};

export const insightsGetTool = {
  definition: {
    name: 'insights_get',
    title: 'Get Insights',
    description: 'Get heatmap and trend insights. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        activityHeatmap: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        weeklyTrend: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              week: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        projectDistribution: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              projectName: { type: 'string' },
              color: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        reportStats: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            byProject: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  projectId: { type: 'string' },
                  name: { type: 'string' },
                  count: { type: 'number' },
                },
                required: ['projectId', 'name', 'count'],
              },
            },
          },
          required: ['total', 'byProject'],
        },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = z.object({}).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input');
    }

    const data = await getInsights(actor);
    return createStructuredResult(data, 'Insights retrieved');
  },
};
