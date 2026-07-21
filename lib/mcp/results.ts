/**
 * MCP Tool result types
 */

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
  execute: (actor: any, input: any) => Promise<McpToolResult>;
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
  return {
    structuredContent,
    content: [{ type: 'text', text: textFallback }],
    isError,
  };
}