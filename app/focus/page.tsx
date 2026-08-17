/**
 * Focus Page
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
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Focus | Jobmark',
  description: 'Take a short break and decide what to do next.',
};

export default async function FocusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin?callbackUrl=/focus');
  }
  const userId = session.user.id;

  // Load only the data the wizard needs, in parallel. The wizard does not
  // need the dashboard's activity timeline.
  const [userSettings, rawBlocks, goals] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
      select: { primaryGoal: true },
    }),
    getFocusConfig(),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Primary goal resolution chain
  const primaryGoalText = userSettings?.primaryGoal || goals[0]?.title || 'a clear next step';

  // Goal id -> title map
  const goalMap = new Map<string, string>(goals.map(g => [g.id, g.title]));

  // 3. Resolve blocks (inject goal text and affirmations)
  const resolvedBlocks: ResolvedFocusBlock[] = rawBlocks.map((block): ResolvedFocusBlock => {
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
            block.config.texts.length > 0 ? block.config.texts : ['I can take the next step.'],
        },
      };
    }

    return block;
  });

  return (
    <main className="bg-background text-foreground relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto py-12">
      <DecompressionWizard blocks={resolvedBlocks} />
      <Toaster position="bottom-right" richColors />
    </main>
  );
}
