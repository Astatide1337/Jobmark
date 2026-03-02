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
import type { ResolvedFocusBlock } from '@/lib/focus/types';

export const metadata = {
  title: 'Decompress | JobMark',
  description: 'End your day with intention.',
};

export default async function FocusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;

  // 1. Today's activity stats (still needed for some background context if ever revived, but focus on the blocks)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaysActivities = await prisma.activity.findMany({
    where: { userId, logDate: { gte: startOfDay } },
    include: { project: true },
    orderBy: { createdAt: 'desc' },
  });

  const dailyCount = todaysActivities.length;
  const lastProjectName = todaysActivities[0]?.project?.name || null;

  // 2. Load focus config + user data in parallel
  const [rawBlocks, userSettings, goals] = await Promise.all([
    getFocusConfig(userId),
    prisma.userSettings.findUnique({ where: { userId } }),
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

  // 3. Resolve blocks (inject goal text + AI affirmations)
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
