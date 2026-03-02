/**
 * Chat Cancellation Route
 *
 * Why: Users need to be able to stop AI responses immediately (e.g., if they
 * notice the AI is going in the wrong direction). This route communicates
 * with the `StreamManager` to kill the upstream process and save tokens.
 *
 * Flow:
 * 1. Receives a `requestId`.
 * 2. Verifies the user owns the request.
 * 3. Signals the `AbortController` stored in the `StreamManager`.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { streamManager } from '@/lib/chat/stream-manager';

type CancelBody = {
  requestId?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CancelBody;
  try {
    body = (await request.json()) as CancelBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  streamManager.cleanupStale();
  const cancelled = streamManager.cancel(requestId, session.user.id);

  return NextResponse.json({ cancelled });
}
