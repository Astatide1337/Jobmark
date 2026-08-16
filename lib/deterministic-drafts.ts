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
  return Number.isNaN(date.getTime()) ? 'No date' : format(date, 'MMM d, yyyy');
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

function getToneLabel(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'professional') return 'Formal';
  if (normalized === 'casual') return 'Casual';
  if (normalized === 'bullet-points') return 'Bullet points';
  if (normalized === 'concise') return 'Short and clear';
  if (normalized === 'warm') return 'Warm and friendly';
  return clean(value) ?? 'Formal';
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
      return 'Question about a referral';
    case 'catch-up':
      return 'Can we catch up?';
    case 'thank-you':
      return 'Thank you';
    case 'reconnect':
      return 'Checking in';
    case 'introduction':
      return 'Could you introduce me?';
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
  const interactionSummary = latestInteraction ? clean(latestInteraction.summary, 320) : null;

  switch (purpose) {
    case 'referral':
      return {
        opening: isConcise
          ? 'I’m looking at my next step and would like your advice.'
          : 'I’m looking at my next step and would like your advice.',
        ask: 'Would you be open to a short call about a referral? No problem if not.',
      };
    case 'catch-up':
      return {
        opening: 'I’d like to catch up and hear what you are working on.',
        ask: 'Would you have time for a short call?',
      };
    case 'thank-you':
      return {
        opening: context
          ? 'I wanted to send a quick thank-you.'
          : 'I wanted to say thank you and let you know I appreciate it.',
      };
    case 'reconnect':
      return {
        opening: 'I wanted to check in.',
        ask: 'Would you like to catch up soon?',
      };
    case 'introduction':
      return {
        opening: 'I am thinking about my next step and would like your advice.',
        ask: 'Would you be comfortable introducing me to someone who may help? No problem if not.',
      };
    case 'congratulate':
      return {
        opening: 'I wanted to congratulate you.',
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
        opening: 'I wanted to check in.',
        ask: 'Would you be open to a short conversation?',
      };
  }
}

/**
 * Build an actual, editable message from the contact record.
 *
 * This stays predictable and fact-based: it uses a small set of
 * purpose-specific templates, the user's own context, and at most one recent
 * interaction. It never invents a role, company, accomplishment, date, or
 * relationship detail. Missing specifics result in a pleasantly general
 * message that the user can personalize before sending.
 */
export function buildOutreachDraft(contact: DraftContact, options: OutreachDraftOptions): string {
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
    !formattedContext &&
    relationship &&
    /teammate|collaborat|colleague|mentor|manager|client|friend/i.test(relationship)
      ? 'I have enjoyed working with you.'
      : '';
  const { opening, ask } = getMessageParts(purpose, tone, formattedContext, latestInteraction);
  const greeting = tone.toLowerCase().includes('professional')
    ? `Hello ${getFirstName(contact.fullName)},`
    : `Hi ${getFirstName(contact.fullName)},`;
  const signoff = tone.toLowerCase().includes('professional')
    ? 'Thank you for considering it.'
    : 'Thanks again.';
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
 * Build a review draft without making claims that are not in the user's notes.
 * It gives a connected assistant a clear starting point.
 */
export function buildReviewBrief(options: ReviewBriefOptions): string {
  const activities = options.activities;
  const projectNames = Array.from(
    new Set(activities.map(activity => clean(activity.projectName)).filter(Boolean))
  ) as string[];
  const notes = clean(options.notes, 1_000);
  const lines = [
    'Review draft',
    '',
    `Dates: ${options.startDate} through ${options.endDate}`,
    `Notes: ${activities.length}`,
    `Projects: ${projectNames.length > 0 ? projectNames.join(', ') : 'No project'}`,
    `Style: ${getToneLabel(options.tone)}`,
    '',
    'Summary',
    `These notes cover ${options.startDate} through ${options.endDate}. Add any missing results before you share this.`,
    '',
    'Notes',
  ];

  if (activities.length === 0) {
    lines.push('- No notes were saved for this period.');
  } else {
    let currentProject: string | null = null;
    for (const activity of activities) {
      const project = clean(activity.projectName) ?? 'No project';
      if (project !== currentProject) {
        lines.push(`### ${project}`);
        currentProject = project;
      }
      const content = clean(activity.content, 700) ?? 'No note.';
      lines.push(`- ${formatInteractionDate(activity.logDate)}: ${content}`);
    }
  }

  lines.push(
    '',
    'Check before sharing',
    '- What changed?',
    '- Who did this help?',
    '- Is there a number or other clear result?',
    '- Which note best supports this draft?'
  );

  if (notes) {
    lines.push('', 'Your notes', `- ${notes}`);
  }

  lines.push('', 'Use only saved facts. Check the draft before you share it.');

  return lines.join('\n');
}

/**
 * The MCP edit tools still accept plain-language instructions, so keep this
 * helper intentionally conservative. It never invents new claims.
 */
export function deterministicRewrite(text: string, instruction: string): string {
  const normalized = text;
  const request = instruction.toLowerCase();
  if (!normalized) return '';

  if (request.includes('bullet') || request.includes('list')) {
    // Keep the MCP compatibility path aligned with the local editor: use
    // existing line boundaries instead of guessing where sentences end.
    // Guessing would corrupt decimals, abbreviations, URLs, or other facts.
    const lines = normalized.split(/\r\n|\n/).filter(line => line.trim());
    return lines.length > 0 && lines.every(isBulletLine)
      ? normalized
      : applyQuickEdit(normalized, 'bullets');
  }

  // Do not pretend to rewrite content without an AI app. Preserve the
  // source rather than inventing a claim or changing the user's meaning.
  return normalized.trim() ? normalized : '';
}

export type QuickEditAction = 'bullets' | 'numbered' | 'checklist';

/**
 * Apply one of the small edits that Jobmark can perform locally and
 * predictably. These are deliberately separate from the MCP edit helper so
 * the in-app editor can offer named actions instead of pretending that a
 * free-form instruction is an AI request.
 */
export function applyQuickEdit(text: string, action: QuickEditAction): string {
  const normalized = text;
  if (!normalized.trim()) return text;

  // Keep spaces and newlines at the selection boundary intact. A selected
  // fragment often includes the space before the next word; removing it while
  // replacing the fragment would make the edit unexpectedly change adjacent
  // text.
  const leadingWhitespace = normalized.match(/^\s*/)?.[0] ?? '';
  const trailingWhitespace = normalized.match(/\s*$/)?.[0] ?? '';
  const coreEnd = normalized.length - trailingWhitespace.length;
  const core = normalized.slice(leadingWhitespace.length, coreEnd);

  const preserveBoundary = (editedCore: string) =>
    leadingWhitespace + editedCore + trailingWhitespace;

  // Only use existing line boundaries. Splitting on punctuation can corrupt
  // decimals, abbreviations, URLs, and other source text.
  const lines = core.split(/\r\n|\n/);
  const lineBreak = normalized.includes('\r\n') ? '\r\n' : '\n';
  const contentLines = lines.filter(line => line.trim());
  const stripMarker = (line: string) =>
    line.replace(
      /^[ \t]*(?:(?:[-*•](?:[ \t]+|$))|(?:\d+[.)](?:[ \t]+|$))|(?:\[[ xX]\](?:[ \t]+|$)))+/,
      ''
    );

  if (action === 'bullets') {
    const removing = contentLines.length > 0 && contentLines.every(isBulletLine);
    return preserveBoundary(
      lines
        .map(line => {
          if (!line.trim()) return line;
          const withoutMarker = stripMarker(line);
          return removing ? withoutMarker : `- ${withoutMarker}`;
        })
        .join(lineBreak)
    );
  }

  if (action === 'numbered') {
    const removing = contentLines.length > 0 && contentLines.every(isNumberedLine);
    let number = 0;
    return preserveBoundary(
      lines
        .map(line => {
          if (!line.trim()) return line;
          const withoutMarker = stripMarker(line);
          if (removing) return withoutMarker;
          number += 1;
          return `${number}. ${withoutMarker}`;
        })
        .join(lineBreak)
    );
  }

  const removing = contentLines.length > 0 && contentLines.every(isChecklistLine);
  return preserveBoundary(
    lines
      .map(line => {
        if (!line.trim()) return line;
        const withoutMarker = stripMarker(line);
        return removing ? withoutMarker : `- [ ] ${withoutMarker}`;
      })
      .join(lineBreak)
  );
}

function isBulletLine(line: string): boolean {
  return /^[ \t]*[-*•](?:[ \t]+|$)/.test(line);
}

function isNumberedLine(line: string): boolean {
  return /^[ \t]*\d+[.)](?:[ \t]+|$)/.test(line);
}

function isChecklistLine(line: string): boolean {
  return /^[ \t]*[-*•](?:[ \t]+|$)\[[ xX]\](?:[ \t]+|$)/.test(line);
}
