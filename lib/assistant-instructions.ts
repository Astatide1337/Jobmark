function cleanLine(value: string | undefined, maxLength = 1_000): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function getToneLabel(value: string | undefined, fallback: string): string {
  const normalized = cleanLine(value)?.toLowerCase();
  if (normalized === 'professional') return 'Formal';
  if (normalized === 'casual') return 'Casual';
  if (normalized === 'bullet-points') return 'Bullet points';
  if (normalized === 'concise') return 'Short and clear';
  if (normalized === 'warm') return 'Warm and friendly';
  return cleanLine(value) ?? fallback;
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
  const tone = getToneLabel(input.tone, 'Warm and friendly');
  const context = cleanLine(input.context);
  const draft = input.draft?.trim();

  return [
    `Help me prepare a message to ${recipient}.`,
    `What it is for: ${purpose}.`,
    `Channel: ${channel}.`,
    `Style: ${tone}.`,
    context ? `Extra details: ${context}.` : '',
    draft
      ? `Here is the draft Jobmark made:\n\n${draft}\n\nEdit it without adding facts. Return a draft I can review. Do not send it.`
      : 'Use only the notes I saved in Jobmark. Do not add facts or shared history. Return a draft I can review. Do not send it.',
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
    'Help me prepare a review draft from my Jobmark notes.',
    `Period: ${cleanLine(input.period) ?? 'the selected period'}.`,
    `Projects: ${cleanLine(input.projectScope) ?? 'all projects'}.`,
    `Style: ${getToneLabel(input.tone, 'Formal')}.`,
    focus ? `Include this: ${focus}.` : '',
    'Use only saved facts. Do not add results. Return a draft I can review. Do not send it.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildSavedDraftAssistantInstructions(
  kind: 'review' | 'outreach',
  draft: string
): string {
  const label = kind === 'review' ? 'review' : 'message';
  return [
    `Help me edit this saved Jobmark ${label} draft.`,
    'Keep the facts in the draft and my Jobmark notes. Do not add results, dates, relationships, or shared history.',
    'Return a draft I can review. Do not send it.',
    '',
    'Draft:',
    draft,
  ].join('\n');
}
