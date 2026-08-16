import { z } from 'zod';
import {
  listReports,
  getReport,
  generateReport,
  regenerateReport,
  deleteReport,
  improveReportText,
} from '@/lib/jobmark/reports';
import { McpActor, assertMcpActor } from '../actor';
import { McpValidationError, McpNotFoundError } from '../errors';
import { createStructuredResult } from '../results';

const reportListSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
});

const reportGenerateSchema = z.object({
  projectId: z.string().optional(),
  customInstructions: z.string().max(2000).optional(),
});

const reportImproveSchema = z.object({
  reportId: z.string(),
  instruction: z.string().min(1).max(500),
});

export const reportsListTool = {
  definition: {
    name: 'reports_list',
    title: 'List review drafts',
    description: 'List saved review drafts with pagination. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 50 },
        cursor: { type: 'string' },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        reports: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              projectId: { type: ['string', 'null'] },
              project: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                },
              },
              contentPreview: { type: 'string' },
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
    const result = reportListSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await listReports(actor, result.data);
    return createStructuredResult(
      data,
      `Found ${data.reports.length} review drafts${data.nextCursor ? ' (more available)' : ''}`
    );
  },
};

export const reportsGetTool = {
  definition: {
    name: 'reports_get',
    title: 'Get review draft',
    description: 'Get the full review draft by ID. Requires the jobmark:read permission.',
    inputSchema: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
      },
      required: ['reportId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        project: {
          type: ['object', 'null'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
          },
        },
        metadata: { type: ['object', 'null'], additionalProperties: true },
        createdAt: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, requiredScopes: ['jobmark:read'] },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = z.object({ reportId: z.string() }).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const report = await getReport(actor, result.data.reportId);
    if (!report) {
      throw new McpNotFoundError('Review draft');
    }
    return createStructuredResult(report, `Review draft: ${report.title}`);
  },
};

export const reportsGenerateTool = {
  definition: {
    name: 'reports_generate',
    title: 'Make review draft',
    description:
      'Make and save a review draft from your notes. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        customInstructions: { type: 'string', maxLength: 2000 },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        project: {
          type: ['object', 'null'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
          },
        },
        content: { type: 'string' },
        metadata: { type: ['object', 'null'], additionalProperties: true },
        createdAt: { type: 'string' },
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
    const result = reportGenerateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const report = await generateReport(
      actor,
      result.data.projectId ?? null,
      result.data.customInstructions
    );
    return createStructuredResult(report, `Created review draft: ${report.title}`);
  },
};

export const reportsRegenerateTool = {
  definition: {
    name: 'reports_regenerate',
    title: 'Make a new review draft',
    description:
      'Make a new version of a saved review draft from your current notes. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
      },
      required: ['reportId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        project: {
          type: ['object', 'null'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
          },
        },
        content: { type: 'string' },
        metadata: { type: ['object', 'null'], additionalProperties: true },
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
    const result = z.object({ reportId: z.string() }).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const report = await regenerateReport(actor, result.data.reportId);
    return createStructuredResult(report, `Created a new review draft: ${report.title}`);
  },
};

export const reportsImproveTextTool = {
  definition: {
    name: 'reports_improve_text',
    title: 'Edit review draft',
    description:
      'Make a small edit to a saved review draft. For a larger rewrite, open the draft in a connected assistant. Requires the jobmark:write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
        instruction: { type: 'string', minLength: 1, maxLength: 500 },
      },
      required: ['reportId', 'instruction'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        improvedContent: { type: 'string' },
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
    const result = reportImproveSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const improved = await improveReportText(actor, {
      reportId: result.data.reportId,
      instructions: result.data.instruction,
    });
    return createStructuredResult(improved, 'Draft text updated');
  },
};

export const reportsDeleteTool = {
  definition: {
    name: 'reports_delete',
    title: 'Delete review draft',
    description: 'Delete a review draft. Requires the jobmark:destructive permission.',
    inputSchema: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
      },
      required: ['reportId'],
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
    const result = z.object({ reportId: z.string() }).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteReport(actor, result.data.reportId);
    return createStructuredResult({ success: true }, 'Review draft deleted');
  },
};
