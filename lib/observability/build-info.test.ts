import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBuildRevision } from './build-info';

const revisionKeys = ['JOBMARK_BUILD_REVISION', 'VERCEL_GIT_COMMIT_SHA', 'GIT_COMMIT_SHA'];
const originalValues = new Map(revisionKeys.map(key => [key, process.env[key]]));

describe('build revision metadata', () => {
  beforeEach(() => {
    for (const key of revisionKeys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of revisionKeys) {
      const originalValue = originalValues.get(key);
      if (originalValue === undefined) delete process.env[key];
      else process.env[key] = originalValue;
    }
  });

  it('prefers the canonical safe revision variable', () => {
    process.env.JOBMARK_BUILD_REVISION = 'release-2026.08.17';
    process.env.GIT_COMMIT_SHA = 'fallback-sha';

    expect(getBuildRevision()).toBe('release-2026.08.17');
  });

  it('does not expose malformed environment values', () => {
    process.env.JOBMARK_BUILD_REVISION = 'Bearer secret-token';
    process.env.VERCEL_GIT_COMMIT_SHA = 'valid-sha';

    expect(getBuildRevision()).toBe('valid-sha');
  });
});
