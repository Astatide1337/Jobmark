import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeSecureActionNonce } from '@/lib/jobmark/vault';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const body = await request.json();
  const { nonce, password } = body as { nonce?: string; password?: string };

  if (!nonce || !password) {
    return NextResponse.json({ error: 'Enter the link code and password.' }, { status: 400 });
  }

  const consumed = await consumeSecureActionNonce(nonce, 'vault_unlock', session.user.id);
  if (!consumed) {
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

  if (consumed.connectionId) {
    await prisma.mcpConnection.update({
      where: { id: consumed.connectionId },
      data: { vaultUnlockedUntil: new Date(Date.now() + 4 * 60 * 60 * 1000) },
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Private projects are open for 4 hours.',
  });
}
