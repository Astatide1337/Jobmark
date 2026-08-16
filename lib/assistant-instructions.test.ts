import { describe, expect, it } from 'vitest';
import {
  buildOutreachAssistantInstructions,
  buildReviewAssistantInstructions,
} from './assistant-instructions';

describe('assistant handoff instructions', () => {
  it('keeps outreach instructions plain-language and free of internal identifiers', () => {
    const instructions = buildOutreachAssistantInstructions({
      recipient: 'Jeevan Shah',
      purpose: 'referral',
      channel: 'email',
      tone: 'warm',
      context: 'worked on Linktree together',
    });

    expect(instructions).toContain('Help me prepare a message to Jeevan Shah.');
    expect(instructions).toContain('Extra details: worked on Linktree together.');
    expect(instructions).not.toMatch(/MCP|contacts_get|contactId|cmr[a-z0-9]+/i);
  });

  it('keeps review instructions focused on the user task', () => {
    const instructions = buildReviewAssistantInstructions({
      period: 'Aug 1–7, 2026',
      projectScope: 'All projects',
      tone: 'Professional',
      focus: 'Highlight measurable impact',
    });

    expect(instructions).toContain('Help me prepare a review draft from my Jobmark notes.');
    expect(instructions).toContain('Highlight measurable impact');
    expect(instructions).not.toMatch(/MCP|tools|contactId/i);
  });

  it('keeps editing handoffs review-only', () => {
    const instructions = buildOutreachAssistantInstructions({
      recipient: 'Jeevan Shah',
      purpose: 'referral',
      channel: 'email',
      tone: 'warm',
      draft: 'Subject: A quick referral question\n\nHi Jeevan,',
    });

    expect(instructions).toContain('Edit it without adding facts.');
    expect(instructions).toContain('Return a draft I can review. Do not send it.');
    expect(instructions).not.toMatch(/MCP|contacts_get|contactId|cmr[a-z0-9]+/i);
  });
});
