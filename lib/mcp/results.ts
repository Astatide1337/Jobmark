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

export function createStructuredResult(
  structuredContent: Record<string, unknown>,
  textFallback: string,
  isError = false
): McpToolResult {
  // Some MCP clients currently ignore `structuredContent`. Include the same
  // payload in the standard text channel so every supported provider can use
  // the result instead of seeing only a generic success message.
  const serializedContent = JSON.stringify(structuredContent, null, 2);

  return {
    structuredContent,
    content: [{ type: 'text', text: `${textFallback}\n\n${serializedContent}` }],
    isError,
  };
}
