/**
 * MCP Project Tools
 */
import { z } from 'zod';
import {
  listProjects,
  getProject,
  getProjectWithActivities,
  createProject,
  updateProject,
  setProjectArchived,
  deleteProject,
} from '@/lib/jobmark/projects';
import { McpActor, assertMcpActor } from '../actor';
import { createTextResult, createStructuredResult } from '../results';
import { McpValidationError, McpForbiddenError, McpNotFoundError } from '../errors';
import { getLimit } from '../pagination';

const projectsListSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  includeArchived: z.boolean().optional(),
  includeLocked: z.boolean().optional(),
});

const projectGetSchema = z.object({
  projectId: z.string(),
});

const projectCreateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  description: z.string().max(200).optional().nullable(),
});

const projectUpdateSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional().nullable(),
});

const projectArchiveSchema = z.object({
  projectId: z.string(),
  archived: z.boolean(),
});

const projectDeleteSchema = z.object({
  projectId: z.string(),
});

export const projectsListTool = {
  definition: {
    name: 'projects_list',
    title: 'List Projects',
    description: 'List user projects with pagination. Returns project details including activity/report counts.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100, default: 100 },
        cursor: { type: 'string' },
        includeArchived: { type: 'boolean', default: false },
        includeLocked: { type: 'boolean', default: false },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              color: { type: 'string' },
              description: { type: ['string', 'null'] },
              archived: { type: 'boolean' },
              locked: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              _count: {
                type: 'object',
                properties: {
                  activities: { type: 'number' },
                  reports: { type: 'number' },
                },
              },
            },
          },
        },
        nextCursor: { type: ['string', 'null'] },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = projectsListSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await listProjects(actor, {
      limit: getLimit('projects', result.data.limit),
      cursor: result.data.cursor,
      includeArchived: result.data.includeArchived,
      includeLocked: result.data.includeLocked,
    });

    return createStructuredResult(data, `Found ${data.projects.length} projects`);
  },
};

export const projectsGetTool = {
  definition: {
    name: 'projects_get',
    title: 'Get Project',
    description: 'Get detailed project information including activity count.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
        description: { type: ['string', 'null'] },
        archived: { type: 'boolean' },
        locked: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        _count: {
          type: 'object',
          properties: {
            activities: { type: 'number' },
            reports: { type: 'number' },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = projectGetSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const project = await getProject(actor, result.data.projectId);
    return createStructuredResult(project, `Project: ${project.name}`);
  },
};

export const projectsGetWithActivitiesTool = {
  definition: {
    name: 'projects_get_with_activities',
    title: 'Get Project with Activities',
    description: 'Get project details with a paginated list of its activities.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 50, default: 50 },
        cursor: { type: 'string' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
            description: { type: ['string', 'null'] },
            archived: { type: 'boolean' },
            locked: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            _count: {
              type: 'object',
              properties: {
                activities: { type: 'number' },
                reports: { type: 'number' },
              },
            },
          },
        },
        activities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              logDate: { type: 'string' },
              createdAt: { type: 'string' },
              project: { type: 'object' },
            },
          },
        },
        nextCursor: { type: ['string', 'null'] },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = z.object({
      projectId: z.string(),
      limit: z.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }).safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const data = await getProjectWithActivities(actor, result.data.projectId, {
      limit: getLimit('activities', result.data.limit),
      cursor: result.data.cursor,
    });

    return createStructuredResult(data, `Project: ${data.project.name} with ${data.activities.length} activities`);
  },
};

export const projectsCreateTool = {
  definition: {
    name: 'projects_create',
    title: 'Create Project',
    description: 'Create a new project. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 50 },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', default: '#6366f1' },
        description: { type: ['string', 'null'], maxLength: 200 },
      },
      required: ['name'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
        description: { type: ['string', 'null'] },
        archived: { type: 'boolean' },
        locked: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        _count: {
          type: 'object',
          properties: {
            activities: { type: 'number' },
            reports: { type: 'number' },
          },
        },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = projectCreateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const project = await createProject(actor, result.data);
    return createStructuredResult(project, `Created project: ${project.name}`);
  },
};

export const projectsUpdateTool = {
  definition: {
    name: 'projects_update',
    title: 'Update Project',
    description: 'Update project details. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string', minLength: 1, maxLength: 50 },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        description: { type: ['string', 'null'], maxLength: 200 },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
        description: { type: ['string', 'null'] },
        archived: { type: 'boolean' },
        locked: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        _count: {
          type: 'object',
          properties: {
            activities: { type: 'number' },
            reports: { type: 'number' },
          },
        },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = projectUpdateSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const { projectId, ...data } = result.data;
    const project = await updateProject(actor, projectId, data);
    return createStructuredResult(project, `Updated project: ${project.name}`);
  },
};

export const projectsSetArchivedTool = {
  definition: {
    name: 'projects_set_archived',
    title: 'Archive/Restore Project',
    description: 'Archive or restore a project. Requires jobmark:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        archived: { type: 'boolean' },
      },
      required: ['projectId', 'archived'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        archived: { type: 'boolean' },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  execute: async (actor: McpActor, input: unknown) => {
    assertMcpActor(actor);
    const result = projectArchiveSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    const project = await setProjectArchived(actor, result.data.projectId, result.data.archived);
    return createStructuredResult(
      { id: project.id, name: project.name, archived: project.archived },
      result.data.archived ? `Archived project: ${project.name}` : `Restored project: ${project.name}`
    );
  },
};

export const projectsDeleteTool = {
  definition: {
    name: 'projects_delete',
    title: 'Delete Project',
    description: 'Permanently delete a project and all its activities. Requires jobmark:destructive scope.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
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
    const result = projectDeleteSchema.safeParse(input);
    if (!result.success) {
      throw new McpValidationError('Invalid input', result.error.flatten().fieldErrors);
    }

    await deleteProject(actor, result.data.projectId);
    return createStructuredResult({ success: true }, 'Project deleted');
  },
};