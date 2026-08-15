/**
 * MCP Pagination utilities
 */

export interface McpPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount?: number;
}

export function paginate<T extends { id: string }>(
  items: T[],
  cursor: string | undefined,
  limit: number
): McpPaginatedResult<T> {
  const startIndex = cursor ? items.findIndex(item => item.id === cursor) + 1 : 0;
  const page = items.slice(startIndex, startIndex + limit + 1);
  let nextCursor: string | null = null;
  if (page.length > limit) {
    nextCursor = page.pop()!.id;
  }
  return { items: page, nextCursor };
}

export const DEFAULT_LIMITS = {
  activities: 50,
  projects: 100,
  goals: 100,
  contacts: 50,
  interactions: 50,
  reports: 25,
  outreach: 25,
  search: 20,
} as const;

export function getLimit(toolName: string, requested?: number): number {
  const max = (DEFAULT_LIMITS as Record<string, number>)[toolName] ?? 50;
  return Math.min(Math.max(requested ?? max, 1), max);
}
