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

export type OutreachDraftOptions = {
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

type OutreachPurpose =
  | 'referral'
  | 'catch-up'
  | 'thank-you'
  | 'reconnect'
  | 'introduction'
  | 'congratulate'
  | 'follow-up'
  | 'other';

function getOutreachPurpose(value: string): OutreachPurpose {
  const normalized = value.toLowerCase().trim();
  if (normalized.includes('referr')) return 'referral';
  if (normalized.includes('catch')) return 'catch-up';
  if (normalized.includes('thank')) return 'thank-you';
  if (normalized.includes('reconnect')) return 'reconnect';
  if (normalized.includes('intro')) return 'introduction';
  if (normalized.includes('congrat')) return 'congratulate';
  if (normalized.includes('follow') || normalized.includes('update')) return 'follow-up';
  return 'other';
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

function toSentence(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/[.!?]$/.test(normalized)) return normalized;
  return `${normalized}.`;
}

/**
 * Turn a short user-supplied context note into a readable sentence without
 * rewriting its meaning. The small verb-prefix allowlist handles common notes
 * such as "worked on Linktree together" while leaving everything else intact.
 */
function formatExtraContext(value: string | null): string {
  if (!value) return '';
  if (/^(worked|met|spoke|talked|collaborated|connected|worked)\b/i.test(value)) {
    return toSentence(`We ${value}`);
  }
  return toSentence(value);
}

function getSubject(purpose: OutreachPurpose): string {
  switch (purpose) {
    case 'referral':
      return 'A quick referral question';
    case 'catch-up':
      return 'Would you be up for a catch-up?';
    case 'thank-you':
      return 'Thank you';
    case 'reconnect':
      return 'Checking in';
    case 'introduction':
      return 'A quick introduction question';
    case 'congratulate':
      return 'Congratulations';
    case 'follow-up':
      return 'Following up';
    default:
      return 'A quick note';
  }
}

function getMessageParts(
  purpose: OutreachPurpose,
  tone: string,
  context: string,
  latestInteraction: DraftInteraction | undefined
): { opening: string; ask?: string } {
  const isConcise = tone.toLowerCase().includes('concise') || tone.toLowerCase().includes('short');
  const interactionSummary = latestInteraction
    ? clean(latestInteraction.summary, 320)
    : null;

  switch (purpose) {
    case 'referral':
      return {
        opening: isConcise
          ? 'I’m exploring a next step and would value your perspective.'
          : 'I’m reaching out because I’m exploring a next step and would value your perspective.',
        ask: 'Would you be open to a short conversation about whether a referral might make sense? No pressure if the timing isn’t right.',
      };
    case 'catch-up':
      return {
        opening: 'I’d love to catch up and hear what you’ve been working on.',
        ask: 'Would you be open to finding a little time to talk?',
      };
    case 'thank-you':
      return {
        opening: context
          ? 'I wanted to send a quick thank-you.'
          : 'I wanted to say thank you and let you know I appreciate it.',
      };
    case 'reconnect':
      return {
        opening: 'I wanted to reach out and reconnect.',
        ask: 'If you’re open to it, would you like to catch up sometime soon?',
      };
    case 'introduction':
      return {
        opening: 'I’m hoping to make a useful connection as I think through my next step.',
        ask: 'Would you be comfortable making an introduction if someone comes to mind? No pressure if not.',
      };
    case 'congratulate':
      return {
        opening: 'I wanted to send a quick congratulations.',
      };
    case 'follow-up':
      return {
        opening: interactionSummary
          ? `I’m following up on our recent conversation: ${toSentence(interactionSummary)}`
          : 'I wanted to follow up and see how things are going.',
        ask: 'Would you be open to a quick reply when you have a moment?',
      };
    default:
      return {
        opening: 'I wanted to reach out and see if you’d be open to connecting.',
        ask: 'Would you be open to a quick conversation?',
      };
  }
}

/**
 * Build an actual, editable outreach message from the contact record.
 *
 * This stays deterministic and evidence-safe: it uses a small set of
 * purpose-specific templates, the user's own context, and at most one recent
 * interaction. It never invents a role, company, accomplishment, date, or
 * relationship detail. Missing specifics result in a pleasantly general
 * message that the user can personalize before sending.
 */
export function buildOutreachDraft(
  contact: DraftContact,
  options: OutreachDraftOptions
): string {
  const relationship = clean(contact.relationship);
  const extraContext = clean(options.extraContext, 1_000);
  const interactions = contact.interactions.slice(0, 5);
  const channel = clean(options.channel) ?? 'email';
  const objective = clean(options.objective) ?? 'Reconnect';
  const tone = clean(options.tone) ?? 'Professional';
  const purpose = getOutreachPurpose(objective);
  const latestInteraction = interactions[0];
  const formattedContext = formatExtraContext(extraContext);
  const relationshipContext =
    !formattedContext && relationship && /teammate|collaborat|colleague|mentor|manager|client|friend/i.test(relationship)
      ? 'I’ve appreciated working with you.'
      : '';
  const { opening, ask } = getMessageParts(
    purpose,
    tone,
    formattedContext,
    latestInteraction
  );
  const greeting = tone.toLowerCase().includes('professional')
    ? `Hello ${getFirstName(contact.fullName)},`
    : `Hi ${getFirstName(contact.fullName)},`;
  const signoff = tone.toLowerCase().includes('professional') ? 'Thank you for considering it.' : 'Thanks again.';
  const isMessageChannel = channel.toLowerCase() === 'text' || channel.toLowerCase() === 'linkedin';
  const body = [
    greeting,
    '',
    opening,
    formattedContext || relationshipContext,
    '',
    ask,
    ask ? '' : undefined,
    signoff,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return isMessageChannel ? body : [`Subject: ${getSubject(purpose)}`, '', body].join('\n');
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
