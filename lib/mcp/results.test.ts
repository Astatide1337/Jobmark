import { describe, expect, it } from 'vitest';
import { createStructuredResult } from './results';

describe('createStructuredResult', () => {
  it('keeps structured data machine-readable while redacting internal identifiers from text', () => {
    const data = { activities: { id: 'act_internal_123', total: 42 }, projects: { active: 5 } };

    const result = createStructuredResult(data, 'Dashboard stats retrieved');

    expect(result.structuredContent).toEqual(data);
    expect(result.content[0].text).toContain('Dashboard stats retrieved');
    expect(result.content[0].text).not.toContain('act_internal_123');
    expect(result.content[0].text).toContain('Total: 42');
  });
});
