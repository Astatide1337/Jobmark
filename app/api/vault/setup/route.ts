import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeSecureActionNonce } from '@/lib/jobmark/vault';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { nonce, password } = body as { nonce?: string; password?: string };

  if (!nonce || !password) {
    return NextResponse.json({ error: 'Missing nonce or password' }, { status: 400 });
  }

  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be 12-128 characters' }, { status: 400 });
  }

  const consumed = await consumeSecureActionNonce(nonce, 'vault_setup', session.user.id);
  if (!consumed) {
    return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 400 });
  }

  const existing = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { vaultPasswordHash: true },
  });

  if (existing?.vaultPasswordHash) {
    return NextResponse.json({ error: 'Vault already configured. Use change password instead.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, vaultPasswordHash: passwordHash },
    update: { vaultPasswordHash: passwordHash },
  });

  return NextResponse.json({ success: true, message: 'Vault password set successfully' });
}
