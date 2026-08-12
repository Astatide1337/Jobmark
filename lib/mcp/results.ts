/**
 * MCP Tool result types
 */

import type { McpActor } from './actor';

export interface McpToolResult {
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface McpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: McpToolAnnotations;
}

export interface McpTool {
  definition: McpToolDefinition;
  execute: (actor: McpActor, input: unknown) => Promise<McpToolResult>;
}

export function createTextResult(text: string, isError = false): McpToolResult {
  return {
    content: [{ type: 'text', text }],
    isError,
  };
}

const PRIVATE_RESULT_KEYS =
  /^(id|userId|projectId|contactId|connectionId|clientId|oauthClientId|nextCursor|cursor|token|.*Token|.*Secret|.*Hash)$/i;

function labelForKey(key: string): string {
  return key
    .replace(/^_/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function toHumanValue(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return 'Not recorded';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (depth > 2) return '…';
  if (Array.isArray(value)) {
    return value.length === 0
      ? 'None'
      : value
          .slice(0, 20)
          .map(item => `- ${toHumanValue(item, depth + 1)}`)
          .join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !PRIVATE_RESULT_KEYS.test(key))
      .map(([key, item]) => `${labelForKey(key)}: ${toHumanValue(item, depth + 1)}`)
      .join('\n');
  }
  return String(value);
}

function createHumanFallback(structuredContent: Record<string, unknown>): string {
  const text = toHumanValue(structuredContent).trim();
  if (!text) return '';
  return text.length > 6_000 ? `${text.slice(0, 6_000).trimEnd()}…` : text;
}

export function createStructuredResult(
  structuredContent: Record<string, unknown>,
  textFallback: string,
  isError = false
): McpToolResult {
  // Keep machine-readable data in `structuredContent`, while giving clients
  // that only render text a useful, redacted fallback. Internal IDs, cursors,
  // tokens, and hashes never enter the user-facing text channel.
  const humanFallback = createHumanFallback(structuredContent);
  return {
    structuredContent,
    content: [
      { type: 'text', text: humanFallback ? `${textFallback}\n\n${humanFallback}` : textFallback },
    ],
    isError,
  };
}
