
import { z } from 'zod';
import {
  globalSearch,
} from '@/lib/jobmark/search';
import { getDashboardStats, getInsights } from '@/lib/jobmark/insights';
import { McpActor, assertMcpActor } from '../actor';
import {
  McpValidationError,
} from '../errors';
import { createStructuredResult } from '../results';
import { getLimit } from '../pagination';

const searchGlobalSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).optional(),
  projectId: z.string().optional(),
});

export const searchGlobalTool = {
  definition: {
    name: 'search_global',
    title: 'Global Search',
    description: 'Search across activities, projects, reports, goals, and contacts. Requires jobmark:read scope.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
        limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
        projectId: { type: 'string' },
      },
      required: ['query'],
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
              project: { type: ['object', 'null'] },
            },
          },
        },
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              color: { type: 'string' },
              description: { type: ['string', 'null'] },
            },
          },
        },
        reports: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              periodStart: { type: 'string' },
              periodEnd: { type: 'string' },
            },
          },
        },
        goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              period: { type: 'string' },
            },
          },
        },
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: ['string', 'null'] },
              company: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = searchGlobalSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await globalSearch(actor, result.data.query, { limit: getLimit('search', result.data.limit) });
    return createStructuredResult({ results: data, query: result.data.query }, `Search results for: ${result.data.query}`);
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
            today: { type: 'number' },
            total: { type: 'number' },
          },
        },
        projects: {
          type: 'object',
          properties: {
            active: { type: 'number' },
            archived: { type: 'number' },
            locked: { type: 'number' },
          },
        },
        goals: {
          type: 'object',
          properties: {
            active: { type: 'number' },
            completed: { type: 'number' },
          },
        },
        reports: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            pending: { type: 'number' },
          },
        },
        contacts: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            recent: { type: 'number' },
          },
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
      properties: {
        year: z.number().int().min(2020).max(2030).optional(),
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        heatmap: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              count: { type: 'number' },
              level: { type: 'number' },
            },
          },
        },
        weeklyTrends: {
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
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = z.object({ year: z.number().int().min(2020).max(2030).optional() }).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await getInsights(actor);
    return createStructuredResult(data, 'Insights retrieved');
  },
};