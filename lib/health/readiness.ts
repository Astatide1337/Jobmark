import 'server-only';

import { prisma } from '@/lib/db';

const DATABASE_TIMEOUT_MS = 1_000;

/** Check the database without returning provider or connection details. */
export async function isDatabaseReady(timeoutMs = DATABASE_TIMEOUT_MS): Promise<boolean> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('readiness timeout')), timeoutMs);
      }),
    ]);
    return true;
  } catch {
    // The response intentionally contains no database error, host, or query.
    return false;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
