import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { revokeMcpConnectionForUser } from '@/lib/mcp/connections';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { connectionId } = await params;
  const revoked = await revokeMcpConnectionForUser(connectionId, session.user.id);
  if (!revoked) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
