const DEFAULT_LIMITS = {
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
