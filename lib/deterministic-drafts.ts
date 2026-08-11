import { format } from 'date-fns';

export type DraftInteraction = {
  occurredAt: Date | string;
  channel: string;
  summary: string;
  nextStep?: string | null;
};

export type DraftContact = {
  id: string;
  fullName: string;
  email?: string | null;
  relationship?: string | null;
  personalityTraits?: string | null;
  notes?: string | null;
  interactions: DraftInteraction[];
};

export type OutreachBriefOptions = {
  objective: string;
  tone: string;
  channel: string;
  extraContext?: string;
};

function clean(value: string | null | undefined, maxLength = 500): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function formatInteractionDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'date not recorded' : format(date, 'MMM d, yyyy');
}

/**
 * Build a clear outreach plan from the contact record. It intentionally does
 * not pretend to write a message or invent details; a connected assistant can
 * turn the plan into a message after reading the current record.
 */
export function buildOutreachBrief(
  contact: DraftContact,
  options: OutreachBriefOptions
): string {
  const relationship = clean(contact.relationship);
  const traits = clean(contact.personalityTraits);
  const notes = clean(contact.notes, 1_000);
  const extraContext = clean(options.extraContext, 1_000);
  const interactions = contact.interactions.slice(0, 5);
  const channel = clean(options.channel) ?? 'email';
  const objective = clean(options.objective) ?? 'Reconnect';
  const tone = clean(options.tone) ?? 'Professional';
  const subject = `${objective} — ${contact.fullName}`;

  const lines = [
    'OUTREACH PLAN',
    '',
    `To: ${contact.fullName}`,
    `Channel: ${channel}`,
    `Purpose: ${objective}`,
    `Tone: ${tone}`,
    `Email: ${contact.email ?? 'Not recorded'}`,
    `Suggested subject: ${subject}`,
    '',
    'WHAT YOU KNOW',
    relationship ? `- Relationship: ${relationship}` : '- Relationship: Not recorded',
    traits ? `- Communication notes: ${traits}` : '- Communication notes: Not recorded',
    notes ? `- User notes: ${notes}` : '- User notes: None',
    extraContext ? `- Additional context for this message: ${extraContext}` : '- Additional context: None',
    '',
    'RECENT CONVERSATIONS',
  ];

  if (interactions.length === 0) {
    lines.push('- No interactions are recorded. Keep the opening general and do not imply shared history.');
  } else {
    for (const interaction of interactions) {
      const summary = clean(interaction.summary, 600) ?? 'No summary recorded.';
      const nextStep = clean(interaction.nextStep, 300);
      lines.push(
        `- ${formatInteractionDate(interaction.occurredAt)} · ${interaction.channel || 'other'} · ${summary}${nextStep ? ` · Next step: ${nextStep}` : ''}`
      );
    }
  }

  lines.push(
    '',
    'SUGGESTED MESSAGE SHAPE',
    '1. Open with a truthful, context-aware reason for reaching out.',
    '2. Reference only the verified details above.',
    '3. Make one clear, low-pressure ask or next step.',
    '4. Close warmly and make replying easy.',
    '',
    'BEFORE YOU SEND',
    '- Do not invent accomplishments, mutual connections, dates, or familiarity.',
    '- Do not send anything automatically; the user reviews and sends it.',
    '- If the record is too thin, say what detail would make the message more specific.'
  );

  return lines.join('\n');
}

export type ReviewBriefActivity = {
  logDate: Date | string;
  content: string;
  projectName?: string | null;
};

export type ReviewBriefOptions = {
  startDate: string;
  endDate: string;
  tone: string;
  notes?: string;
  activities: ReviewBriefActivity[];
};

/**
 * Build a manager-ready review brief without making claims that are not in the
 * user's record. It gives an MCP assistant a strong, structured starting point
 * while remaining useful on its own when no assistant is connected.
 */
export function buildReviewBrief(options: ReviewBriefOptions): string {
  const activities = options.activities;
  const projectNames = Array.from(
    new Set(activities.map(activity => clean(activity.projectName)).filter(Boolean))
  ) as string[];
  const notes = clean(options.notes, 1_000);
  const lines = [
    'REVIEW BRIEF',
    '',
    `Period: ${options.startDate} through ${options.endDate}`,
    `Documented contributions: ${activities.length}`,
    `Projects represented: ${projectNames.length > 0 ? projectNames.join(', ') : 'Unassigned work'}`,
    `Requested tone: ${options.tone}`,
    '',
    'EXECUTIVE SUMMARY',
    `This record contains ${activities.length} documented contribution${activities.length === 1 ? '' : 's'} from ${options.startDate} through ${options.endDate}. The entries below are the evidence available for a review, manager update, or promotion conversation. Add measurable outcomes where the record does not yet include them.`,
    '',
    'KEY CONTRIBUTIONS',
  ];

  if (activities.length === 0) {
    lines.push('- No contributions were recorded for this period.');
  } else {
    let currentProject: string | null = null;
    for (const activity of activities) {
      const project = clean(activity.projectName) ?? 'Unassigned work';
      if (project !== currentProject) {
        lines.push(`### ${project}`);
        currentProject = project;
      }
      const content = clean(activity.content, 700) ?? 'No description recorded.';
      lines.push(`- ${formatInteractionDate(activity.logDate)}: ${content}`);
    }
  }

  lines.push(
    '',
    'IMPACT TO ADD BEFORE SHARING',
    '- What changed because of this work?',
    '- Who benefited, and how can that benefit be measured?',
    '- What risk, cost, time, or quality improvement can be stated with evidence?',
    '- Which contribution best supports the requested review or promotion conversation?'
  );

  if (notes) {
    lines.push('', 'FOCUS NOTES', `- ${notes}`);
  }

  lines.push(
    '',
    'Keep the message grounded in what you actually know. If a connected assistant helps write it, review the result before sending.'
  );

  return lines.join('\n');
}

/** A small, predictable edit helper used when no assistant is connected. */
export function deterministicRewrite(text: string, instruction: string): string {
  const normalized = text.trim();
  const request = instruction.toLowerCase();
  if (!normalized) return '';

  if (request.includes('bullet') || request.includes('list')) {
    return normalized
      .split(/\n+|(?<=[.!?])\s+/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => `- ${part.replace(/^[*-]\s*/, '')}`)
      .join('\n');
  }

  if (request.includes('short') || request.includes('concise')) {
    const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
    return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(' ');
  }

  // Do not pretend to rewrite content without an assistant. Preserve the
  // source rather than inventing a claim or changing the user's meaning.
  return normalized;
}
