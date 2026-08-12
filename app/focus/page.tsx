/**
 * Decompression & Focus Ritual Page
 *
 * Why: jobmark isn't just for logging work; it's for mental well-being.
 * This page hosts the interactive "End-of-Day" wizard.
 *
 * Technical Implementation:
 * - Goal Resolution: This Server Component resolves "Dynamic Goal IDs"
 *   into actual text strings *before* passing them to the wizard. This
 *   ensures the wizard doesn't need to know about the database or Prisma.
 * - Affirmation Injection: If a user hasn't set custom affirmations,
 *   we inject sane defaults here to ensure the UI remains functional.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import DecompressionWizard from './_components/decompression-wizard';
import { getFocusConfig } from '@/app/actions/focus-config';
import { getCalendarDate } from '@/lib/date-semantics';
import type { ResolvedFocusBlock } from '@/lib/focus/types';
import { DEFAULT_TIME_ZONE, getCalendarRange, isValidTimeZone } from '@/lib/date-semantics';

export const metadata = {
  title: 'Focus | Jobmark',
  description: 'Reset and reflect at the end of the day.',
};

export default async function FocusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin?callbackUrl=/focus');
  }
  const userId = session.user.id;

  // 1. Today's activity stats use the user's calendar day, not the server's timezone.
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timeZone: true, primaryGoal: true, whyStatement: true },
  });
  const timeZone =
    userSettings?.timeZone && isValidTimeZone(userSettings.timeZone)
      ? userSettings.timeZone
      : DEFAULT_TIME_ZONE;
  const now = new Date();
  const todayRange = getCalendarRange({
    kind: 'custom',
    customStartDate: getCalendarDate(now, timeZone),
    customEndDate: getCalendarDate(now, timeZone),
    timeZone,
  });

  const todaysActivities = await prisma.activity.findMany({
    where: { userId, logDate: { gte: todayRange.start, lt: todayRange.endExclusive } },
    include: { project: true },
    orderBy: { createdAt: 'desc' },
  });

  const dailyCount = todaysActivities.length;
  const lastProjectName = todaysActivities[0]?.project?.name || null;

  // 2. Load focus config + user data in parallel
  const [rawBlocks, goals] = await Promise.all([
    getFocusConfig(),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Primary goal resolution chain
  const primaryGoalText = userSettings?.primaryGoal || goals[0]?.title || 'peace of mind';
  const primaryWhyText = userSettings?.whyStatement || goals[0]?.why || undefined;

  // Goal id -> title map
  const goalMap = new Map<string, string>(goals.map(g => [g.id, g.title]));

  // 3. Resolve blocks (inject goal text and affirmations)
  const resolvedBlocks: ResolvedFocusBlock[] = await Promise.all(
    rawBlocks.map(async (block): Promise<ResolvedFocusBlock> => {
      if (block.type === 'goal') {
        const goalText = block.config.goalId
          ? (goalMap.get(block.config.goalId) ?? primaryGoalText)
          : primaryGoalText;
        return {
          ...block,
          config: { ...block.config, resolvedGoalText: goalText },
        };
      }

      if (block.type === 'affirmation') {
        return {
          ...block,
          config: {
            ...block.config,
            resolvedTexts:
              block.config.texts.length > 0
                ? block.config.texts
                : ['I am capable of great things.'],
          },
        };
      }

      return block;
    })
  );

  return (
    <main className="bg-background text-foreground relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto py-12">
      <DecompressionWizard blocks={resolvedBlocks} />
    </main>
  );
}
