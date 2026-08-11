import { describe, expect, it } from 'vitest';
import {
  buildOutreachBrief,
  buildReviewBrief,
  deterministicRewrite,
} from './deterministic-drafts';

describe('deterministic drafts', () => {
  it('builds an evidence-only outreach brief from a contact record', () => {
    const brief = buildOutreachBrief(
      {
        id: 'contact-1',
        fullName: 'Jordan Lee',
        email: 'jordan@example.com',
        relationship: 'Former teammate',
        notes: 'Prefers concise updates',
        interactions: [
          {
            occurredAt: '2026-08-01T12:00:00.000Z',
            channel: 'email',
            summary: 'Discussed a product launch',
            nextStep: 'Share the launch notes',
          },
        ],
      },
      { objective: 'Follow up', tone: 'Warm', channel: 'email' }
    );

    expect(brief).toContain('To: Jordan Lee');
    expect(brief).toContain('Discussed a product launch');
    expect(brief).toContain('Do not send anything automatically');
    expect(brief).not.toContain('Generated outreach content');
  });

  it('builds a manager-ready review brief without inventing impact', () => {
    const brief = buildReviewBrief({
      startDate: '2026-08-01',
      endDate: '2026-08-07',
      tone: 'professional',
      activities: [
        { logDate: '2026-08-02T12:00:00.000Z', content: 'Shipped the onboarding flow', projectName: 'Web' },
      ],
    });

    expect(brief).toContain('Period: 2026-08-01 through 2026-08-07');
    expect(brief).toContain('Shipped the onboarding flow');
    expect(brief).toContain('What changed because of this work?');
    expect(brief).toContain('connected assistant');
  });

  it('makes only predictable edits', () => {
    expect(deterministicRewrite('One. Two. Three.', 'make this concise')).toBe('One. Two.');
    expect(deterministicRewrite('One. Two.', 'turn this into a bullet list')).toBe('- One.\n- Two.');
    expect(deterministicRewrite('Keep my wording.', 'rewrite this warmly')).toBe('Keep my wording.');
  });
});
