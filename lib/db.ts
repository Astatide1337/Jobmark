/**
 * Database client singleton for jobmark.
 *
 * Why: Next.js HMR (Hot Module Replacement) in development can cause multiple
 * PrismaClient instances to be created, leading to connection exhaustion.
 * We attach the client to the `globalThis` object to ensure only one instance
 * exists across hot reloads.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
