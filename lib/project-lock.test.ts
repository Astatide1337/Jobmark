import { describe, expect, it } from 'vitest';
import { buildLockedActivityFilter, filterLockedReports } from './project-lock';

describe('vault visibility filters', () => {
  it('keeps unassigned activities visible while excluding locked projects', () => {
    expect(buildLockedActivityFilter(['private-project'])).toEqual({
      OR: [{ projectId: null }, { projectId: { notIn: ['private-project'] } }],
    });
    expect(buildLockedActivityFilter([])).toEqual({});
  });

  it('filters report metadata that references a locked project', () => {
    const reports = [
      { id: 'public', metadata: { projectId: 'public-project' } },
      { id: 'private', metadata: { projectId: 'private-project' } },
      { id: 'general', metadata: null },
    ];

    expect(filterLockedReports(reports, ['private-project']).map(report => report.id)).toEqual([
      'public',
      'general',
    ]);
  });
});
