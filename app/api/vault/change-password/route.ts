import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeSecureActionNonce, validateSecureActionNonce } from '@/lib/jobmark/vault';
import { assertSharedRateLimitAllowed } from '@/lib/rate-limit';
import { readBoundedJsonBody } from '@/lib/request-body';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const changePasswordBodySchema = z
  .object({
    nonce: z.string().min(1).max(256),
    currentPassword: z.string().min(12).max(128),
    newPassword: z.string().min(12).max(128),
  })
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

  const parsed = changePasswordBodySchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Use a valid link code and passwords.' }, { status: 400 });
  }
  const { nonce, currentPassword, newPassword } = parsed.data;

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

  const validNonce = await validateSecureActionNonce(
    nonce,
    'vault_change_password',
    session.user.id
  );
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

  const valid = await bcrypt.compare(currentPassword, settings.vaultPasswordHash);
  if (!valid) {
    return NextResponse.json({ error: 'The current password is not correct.' }, { status: 400 });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  const consumed = await prisma.$transaction(async transaction => {
    const consumed = await consumeSecureActionNonce(
      nonce,
      'vault_change_password',
      session.user.id,
      transaction
    );
    if (!consumed) return null;

    await transaction.userSettings.update({
      where: { userId: session.user.id },
      data: { vaultPasswordHash: newPasswordHash, vaultVersion: { increment: 1 } },
    });
    await transaction.mcpConnection.updateMany({
      where: { userId: session.user.id, revokedAt: null },
      data: { vaultUnlockedUntil: null },
    });

    return consumed;
  });

  if (!consumed) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Private project password changed.' });
}
