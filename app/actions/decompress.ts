/**
 * Decompression Server Actions
 *
 * Why: Part of the "Focus & Well-being" subsystem. This action automatically
 * categorizes a user's decompression session into a dedicated "Decompress"
 * project, ensuring their rest time is tracked alongside their work accomplishments.
 */
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import {
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  isValidTimeZone,
} from '@/lib/date-semantics';

export async function logDecompressionSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Sign in to save this focus session.' };
  }

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { timeZone: true },
    });
    const timeZone =
      settings?.timeZone && isValidTimeZone(settings.timeZone)
        ? settings.timeZone
        : DEFAULT_TIME_ZONE;
    const logDate = calendarDateToUtcMidnight(getCalendarDate(new Date(), timeZone));

    // 1. Find or create the project used for saved focus sessions.
    let project = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: { in: ['Focus', 'Decompress'] },
      },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: session.user.id,
          name: 'Focus',
          color: '#d4a574', // Warm amber
          description: 'Focus and reset sessions.',
        },
      });
    } else if (project.name === 'Decompress') {
      project = await prisma.project.update({
        where: { id: project.id },
        data: { name: 'Focus', description: 'Focus and reset sessions.' },
      });
    }

    // 2. Log the activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        projectId: project.id,
        content: 'Took a few minutes to reset.',
        logDate,
      },
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to save focus session:', error);
    return { error: 'The focus session was not saved.' };
  }
}
