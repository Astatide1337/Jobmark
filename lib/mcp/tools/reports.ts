
import { z } from 'zod';
import {
  listReports,
  getReport,
  generateReport,
  createReport,
  updateReport,
  deleteReport,
  improveReportText,
} from '@/lib/jobmark/reports';
import { McpActor, assertMcpActor } from '../actor';
import {
  McpValidationError,
  McpNotFoundError,
  McpVaultLockedError,
} from '../errors';
import { createStructuredResult } from '../results';

const reportListSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
  projectId: z.string().optional(),
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
        projectId: { type: 'string' },
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
              periodStart: { type: 'string' },
              periodEnd: { type: 'string' },
              projectId: { type: ['string', 'null'] },
              project: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                },
              },
              status: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
        nextCursor: { type: ['string', 'null'] },
        totalCount: { type: 'number' },
      },
    },
    annotations: { readOnlyHint: true },
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
        periodStart: { type: 'string' },
        periodEnd: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        project: {
          type: ['object', 'null'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
          },
        },
        status: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true },
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
    description: 'Generate a new report for a project or global period. Requires jobmark:write scope.',
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
        periodStart: { type: 'string' },
        periodEnd: { type: 'string' },
        status: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = reportGenerateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const report = await generateReport(actor, result.data.projectId ?? null, result.data.customInstructions);
    return createStructuredResult(report, `Generated report: ${report.title}`);
  },
};

export const reportsRegenerateTool = {
  definition: {
    name: 'reports_regenerate',
    title: 'Regenerate Report',
    description: 'Regenerate an existing report with fresh AI content. Requires jobmark:write scope.',
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
        status: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = z.object({ reportId: z.string() }).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const report = await generateReport(actor, result.data.reportId);
    return createStructuredResult(report, `Regenerated report: ${report.title}`);
  },
};

export const reportsImproveTextTool = {
  definition: {
    name: 'reports_improve_text',
    title: 'Improve Report Text',
    description: 'Improve a section of a report with AI assistance. Requires jobmark:write scope.',
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
        improvedText: { type: 'string' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = reportImproveSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const improved = await improveReportText(actor, { reportId: result.data.reportId, instructions: result.data.instruction });
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
    annotations: { destructiveHint: true, idempotentHint: true },
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