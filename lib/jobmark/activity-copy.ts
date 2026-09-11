/**
 * Compatibility copy for activity records created by older product versions.
 *
 * Why: Copy changes should improve what users see immediately without requiring
 * a risky data migration or leaving an outdated phrase in the dashboard.
 */
const LEGACY_ACTIVITY_COPY: Record<string, string> = {
  'Completed a decompression ritual.': 'Took a few minutes to reset.',
};

export function getActivityDisplayContent(content: string): string {
  return LEGACY_ACTIVITY_COPY[content] ?? content;
}
