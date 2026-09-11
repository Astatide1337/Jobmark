import 'server-only';

const REVISION_ENVIRONMENT_KEYS = [
  'JOBMARK_BUILD_REVISION',
  'VERCEL_GIT_COMMIT_SHA',
  'GIT_COMMIT_SHA',
] as const;

const SAFE_REVISION_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Return deployment identity without exposing arbitrary environment values.
 *
 * Why: health responses are public, so only an explicitly supported,
 * identifier-shaped value may leave the process.
 */
export function getBuildRevision(): string {
  for (const key of REVISION_ENVIRONMENT_KEYS) {
    const value = process.env[key]?.trim();
    if (value && SAFE_REVISION_PATTERN.test(value)) return value;
  }

  return 'unknown';
}
