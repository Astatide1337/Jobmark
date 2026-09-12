import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeSecureActionNonce, validateSecureActionNonce } from '@/lib/jobmark/vault';
import { assertSharedRateLimitAllowed } from '@/lib/rate-limit';
import { readBoundedJsonBody } from '@/lib/request-body';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const unlockBodySchema = z
  .object({ nonce: z.string().min(1).max(256), password: z.string().min(12).max(128) })
  .strict();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const body = await readBoundedJsonBody(request);
  if (body.kind === 'too_large') {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }
  if (body.kind !== 'ok') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = unlockBodySchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Use a valid link code and password.' }, { status: 400 });
  }
  const { nonce, password } = parsed.data;

  try {
    await assertSharedRateLimitAllowed(
      session.user.id,
      'vault-action',
      5,
      'Too many private-project requests'
    );
  } catch {
    return NextResponse.json({ error: 'Too many tries. Try again later.' }, { status: 429 });
  }

  const validNonce = await validateSecureActionNonce(nonce, 'vault_unlock', session.user.id);
  if (!validNonce) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 400 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { vaultPasswordHash: true },
  });

  if (!settings?.vaultPasswordHash) {
    return NextResponse.json({ error: 'Private projects are not set up yet.' }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, settings.vaultPasswordHash);
  if (!valid) {
    return NextResponse.json({ error: 'That password is not correct.' }, { status: 400 });
  }

  const consumed = await prisma.$transaction(async transaction => {
    const consumed = await consumeSecureActionNonce(
      nonce,
      'vault_unlock',
      session.user.id,
      transaction
    );
    if (!consumed) return null;

    if (consumed.connectionId) {
      await transaction.mcpConnection.updateMany({
        where: { id: consumed.connectionId, userId: session.user.id, revokedAt: null },
        data: { vaultUnlockedUntil: new Date(Date.now() + 4 * 60 * 60 * 1000) },
      });
    }

    return consumed;
  });
  if (!consumed) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Private projects are open for 4 hours.',
  });
}
