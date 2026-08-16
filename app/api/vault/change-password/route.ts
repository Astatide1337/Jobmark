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
  const { nonce, currentPassword, newPassword } = body as {
    nonce?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  if (!nonce || !currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Enter the link code and both passwords.' }, { status: 400 });
  }

  if (newPassword.length < 12 || newPassword.length > 128) {
    return NextResponse.json(
      { error: 'Use 12 to 128 characters for the new password.' },
      { status: 400 }
    );
  }

  const consumed = await consumeSecureActionNonce(nonce, 'vault_change_password', session.user.id);
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

  const valid = await bcrypt.compare(currentPassword, settings.vaultPasswordHash);
  if (!valid) {
    return NextResponse.json({ error: 'The current password is not correct.' }, { status: 400 });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.userSettings.update({
    where: { userId: session.user.id },
    data: { vaultPasswordHash: newPasswordHash },
  });

  return NextResponse.json({ success: true, message: 'Private project password changed.' });
}
