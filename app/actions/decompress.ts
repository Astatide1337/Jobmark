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
    return { error: 'Not authenticated' };
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

    // 1. Find or Create the "Decompress" project
    let project = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: 'Decompress',
      },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: session.user.id,
          name: 'Decompress',
          color: '#d4a574', // Warm amber
          description: 'Sessions for psychological detachment and rest.',
        },
      });
    }

    // 2. Log the activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        projectId: project.id,
        content: 'Completed a decompression ritual.',
        logDate,
      },
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to log decompression session:', error);
    return { error: 'Failed to log session' };
  }
}
