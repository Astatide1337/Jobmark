function cleanLine(value: string | undefined, maxLength = 1_000): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export type OutreachAssistantInstructionsInput = {
  recipient: string;
  purpose: string;
  channel: string;
  tone: string;
  context?: string;
  draft?: string;
};

/**
 * Plain-language handoff text for a connected AI app. Keep this separate
 * from the MCP implementation so internal IDs, tool names, and protocol
 * instructions cannot accidentally become part of the user-visible prompt.
 */
export function buildOutreachAssistantInstructions(
  input: OutreachAssistantInstructionsInput
): string {
  const recipient = cleanLine(input.recipient) ?? 'this person';
  const purpose = cleanLine(input.purpose) ?? 'connect';
  const channel = cleanLine(input.channel) ?? 'email';
  const tone = cleanLine(input.tone) ?? 'warm';
  const context = cleanLine(input.context);
  const draft = input.draft?.trim();

  return [
    `Help me prepare an outreach message to ${recipient}.`,
    `Purpose: ${purpose}.`,
    `Channel: ${channel}.`,
    `Tone: ${tone}.`,
    context ? `Context I provided: ${context}.` : '',
    draft
      ? `Here is the draft Jobmark prepared:\n\n${draft}\n\nPlease polish it without adding facts. Return an editable draft for me to review. Do not send anything.`
      : 'Use the information available in my Jobmark record. Keep every detail accurate, do not invent shared history or outcomes, and return an editable draft for me to review. Do not send anything.',
  ]
    .filter(Boolean)
    .join('\n');
}

export type ReviewAssistantInstructionsInput = {
  period: string;
  projectScope: string;
  tone: string;
  focus?: string;
};

/** Plain-language handoff text for the review workflow. */
export function buildReviewAssistantInstructions(input: ReviewAssistantInstructionsInput): string {
  const focus = cleanLine(input.focus);

  return [
    'Help me prepare a review draft using my Jobmark record.',
    `Period: ${cleanLine(input.period) ?? 'the selected period'}.`,
    `Project scope: ${cleanLine(input.projectScope) ?? 'all projects'}.`,
    `Tone: ${cleanLine(input.tone) ?? 'professional'}.`,
    focus ? `Additional focus: ${focus}.` : '',
    'Use only recorded facts, do not invent outcomes, and return an editable draft for me to review. Do not send anything.',
  ]
    .filter(Boolean)
    .join('\n');
}
