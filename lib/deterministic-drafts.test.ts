import { describe, expect, it } from 'vitest';
import {
  applyQuickEdit,
  buildOutreachDraft,
  buildReviewBrief,
  deterministicRewrite,
} from './deterministic-drafts';

describe('deterministic drafts', () => {
  it('builds an editable outreach message from a contact record', () => {
    const draft = buildOutreachDraft(
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

    expect(draft).toContain('Subject: Following up');
    expect(draft).toContain('Hi Jordan,');
    expect(draft).toContain('Discussed a product launch');
    expect(draft).toContain('Would you be open to a quick reply when you have a moment?');
    expect(draft).not.toContain('OUTREACH PLAN');
    expect(draft).not.toContain('contacts_get');
  });

  it('keeps a thin referral record useful without inventing specifics', () => {
    const draft = buildOutreachDraft(
      {
        id: 'contact-2',
        fullName: 'Jeevan Shah',
        interactions: [],
      },
      {
        objective: 'referral',
        tone: 'warm',
        channel: 'email',
        extraContext: 'worked on Linktree together',
      }
    );

    expect(draft).toContain('Subject: A quick referral question');
    expect(draft).toContain('Hi Jeevan,');
    expect(draft).toContain('We worked on Linktree together.');
    expect(draft).toContain(
      'Would you be open to a short conversation about whether a referral might make sense?'
    );
    expect(draft).not.toContain('role');
    expect(draft).not.toContain('company');
  });

  it('builds a manager-ready review brief without inventing impact', () => {
    const brief = buildReviewBrief({
      startDate: '2026-08-01',
      endDate: '2026-08-07',
      tone: 'professional',
      activities: [
        {
          logDate: '2026-08-02T12:00:00.000Z',
          content: 'Shipped the onboarding flow',
          projectName: 'Web',
        },
      ],
    });

    expect(brief).toContain('Period: 2026-08-01 through 2026-08-07');
    expect(brief).toContain('Shipped the onboarding flow');
    expect(brief).toContain('What changed because of this work?');
    expect(brief).toContain('Review the result before sharing it.');
  });

  it('makes only predictable edits', () => {
    expect(deterministicRewrite('One. Two. Three.', 'make this concise')).toBe('One. Two. Three.');
    expect(deterministicRewrite('One. Two.', 'turn this into a bullet list')).toBe('- One. Two.');
    expect(deterministicRewrite('Version 2.0 is ready. Dr. Lee approved.', 'make a list')).toBe(
      '- Version 2.0 is ready. Dr. Lee approved.'
    );
    expect(deterministicRewrite('Keep my wording.', 'rewrite this warmly')).toBe(
      'Keep my wording.'
    );
  });

  it('offers named quick edits without changing the underlying meaning', () => {
    expect(applyQuickEdit('One. Two.', 'bullets')).toBe('- One. Two.');
    expect(applyQuickEdit('- One.\n- Two.', 'bullets')).toBe('One.\nTwo.');
    expect(applyQuickEdit('One\nTwo', 'numbered')).toBe('1. One\n2. Two');
    expect(applyQuickEdit('1. One\n2. Two', 'numbered')).toBe('One\nTwo');
    expect(applyQuickEdit('One\nTwo', 'checklist')).toBe('- [ ] One\n- [ ] Two');
    expect(applyQuickEdit('- [x] One\n- [ ] Two', 'checklist')).toBe('One\nTwo');
    expect(applyQuickEdit('  One. Two.  ', 'bullets')).toBe('  - One. Two.  ');
    expect(applyQuickEdit('Version 2.0 is ready. Dr. Lee approved.', 'bullets')).toBe(
      '- Version 2.0 is ready. Dr. Lee approved.'
    );
    expect(applyQuickEdit('before\nA sentence\nafter', 'bullets')).toBe(
      '- before\n- A sentence\n- after'
    );
  });

  it('does not mutate empty selections', () => {
    expect(applyQuickEdit('   ', 'bullets')).toBe('   ');
  });
});
