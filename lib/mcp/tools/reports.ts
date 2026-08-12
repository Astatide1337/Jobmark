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
    title: 'List Reports',
    description: 'List user reports with pagination. Requires jobmark:read scope.',
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
      `Found ${data.reports.length} reports${data.nextCursor ? ' (more available)' : ''}`
    );
  },
};

export const reportsGetTool = {
  definition: {
    name: 'reports_get',
    title: 'Get Report',
    description: 'Get full report content by ID. Requires jobmark:read scope.',
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
      throw new McpNotFoundError('Report not found');
    }
    return createStructuredResult(report, `Report: ${report.title}`);
  },
};

export const reportsGenerateTool = {
  definition: {
    name: 'reports_generate',
    title: 'Generate Report',
    description:
      'Build and save a deterministic review brief from the activity record. Requires jobmark:write scope.',
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
    return createStructuredResult(report, `Generated report: ${report.title}`);
  },
};

export const reportsRegenerateTool = {
  definition: {
    name: 'reports_regenerate',
    title: 'Regenerate Report',
    description:
      'Regenerate a saved report brief from the current activity record. Requires jobmark:write scope.',
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
    return createStructuredResult(report, `Regenerated report: ${report.title}`);
  },
};

export const reportsImproveTextTool = {
  definition: {
    name: 'reports_improve_text',
    title: 'Improve Report Text',
    description:
      'Apply a predictable edit to a saved report. For richer writing, use your connected assistant with Jobmark MCP. Requires jobmark:write scope.',
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
    return createStructuredResult(improved, 'Improved text generated');
  },
};

export const reportsDeleteTool = {
  definition: {
    name: 'reports_delete',
    title: 'Delete Report',
    description: 'Delete a report. Requires jobmark:destructive scope.',
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
    return createStructuredResult({ success: true }, 'Report deleted');
  },
};
