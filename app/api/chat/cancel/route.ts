/**
 * Chat Cancellation Route
 *
 * Why: Users need to be able to stop AI responses immediately (e.g., if they
 * notice the AI is going in the wrong direction). This route signals the
 * local stream manager and persists a user-owned cancellation marker so a
 * separate serverless instance can observe it.
 *
 * Flow:
 * 1. Receives a `requestId`.
 * 2. Verifies the user owns the request through the conversation relation.
 * 3. Signals the local controller and marks the persisted user turn cancelled.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { streamManager } from '@/lib/chat/stream-manager';
import { releaseChatRequest } from '@/lib/chat/request-lifecycle';

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
  const claim = await prisma.chatRequest.findFirst({
    where: { requestId, userId: session.user.id, status: 'in_progress' },
    select: { conversationId: true },
  });
  const lifecycleCancelled = claim
    ? await releaseChatRequest(claim.conversationId, requestId, 'cancelled', 'Cancelled by client')
    : false;
  const persisted = await prisma.message.updateMany({
    where: {
      clientRequestId: requestId,
      role: 'user',
      cancelledAt: null,
      conversation: { userId: session.user.id },
    },
    data: { cancelledAt: new Date() },
  });
  return NextResponse.json({
    cancelled: cancelled || lifecycleCancelled || persisted.count > 0,
  });
}
