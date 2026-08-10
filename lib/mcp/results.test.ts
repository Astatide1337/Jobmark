import { describe, expect, it } from 'vitest';
import { createStructuredResult } from './results';

describe('createStructuredResult', () => {
  it('includes structured data in the text fallback for clients that ignore structuredContent', () => {
    const data = { activities: { total: 42 }, projects: { active: 5 } };

    const result = createStructuredResult(data, 'Dashboard stats retrieved');

    expect(result.structuredContent).toEqual(data);
    expect(result.content[0].text).toContain('Dashboard stats retrieved');
    expect(result.content[0].text).toContain('"total": 42');
    expect(result.content[0].text).toContain('"active": 5');
  });
});
