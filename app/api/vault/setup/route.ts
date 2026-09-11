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

  if (password.length < 12 || password.length > 128) {
    return NextResponse.json(
      { error: 'Use 12 to 128 characters for the password.' },
      { status: 400 }
    );
  }

  const consumed = await consumeSecureActionNonce(nonce, 'vault_setup', session.user.id);
  if (!consumed) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 400 });
  }

  const existing = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { vaultPasswordHash: true },
  });

  if (existing?.vaultPasswordHash) {
    return NextResponse.json(
      { error: 'Private projects are already set up. Choose Change password.' },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, vaultPasswordHash: passwordHash },
    update: { vaultPasswordHash: passwordHash },
  });

  return NextResponse.json({ success: true, message: 'Private projects are ready.' });
}
