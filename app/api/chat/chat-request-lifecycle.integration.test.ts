import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import {
  acquireChatRequest,
  CHAT_REQUEST_STALE_MS,
  finalizeChatRequest,
  releaseChatRequest,
} from '@/lib/chat/request-lifecycle';

const enabled = process.env.INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('production chat request lifecycle', () => {
  let userId = '';
  let conversationId = '';
  let assistantId = '';
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `chat-lifecycle-${Date.now()}-${Math.random()}@example.test` },
    });
    const conversation = await prisma.conversation.create({ data: { userId: user.id } });
    await prisma.message.create({
      data: { conversationId: conversation.id, role: 'user', content: 'regenerate me' },
    });
    const assistant = await prisma.message.create({
      data: { conversationId: conversation.id, role: 'assistant', content: 'prior valid answer' },
    });
    userId = user.id;
    conversationId = conversation.id;
    assistantId = assistant.id;
    createdUserIds.push(user.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  const acquireRegeneration = (requestId: string) =>
    acquireChatRequest({
      conversationId,
      userId,
      requestId,
      targetMessageId: assistantId,
      shouldCreateUserMessage: false,
      userMessage: 'regenerate me',
    });

  it('allows exactly one of two concurrent reclaims of a failed regeneration', async () => {
    await acquireRegeneration('same-retry');
    await releaseChatRequest(conversationId, 'same-retry', 'failed', 'provider failed');

    let providerCalls = 0;
    const reclaimThenInvokeProvider = () =>
      acquireRegeneration('same-retry').then(result => {
        providerCalls += 1;
        return result;
      });
    const results = await Promise.allSettled([
      reclaimThenInvokeProvider(),
      reclaimThenInvokeProvider(),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(providerCalls).toBe(1);
  });

  it('retries a failed regeneration with a new UI request ID', async () => {
    await acquireRegeneration('failed-first');
    await releaseChatRequest(conversationId, 'failed-first', 'failed', 'provider failed');

    await expect(acquireRegeneration('failed-second')).resolves.toMatchObject({
      createdUserMessage: false,
    });
    await expect(
      prisma.chatRequest.findUnique({
        where: { conversationId_requestId: { conversationId, requestId: 'failed-first' } },
      })
    ).resolves.toMatchObject({ status: 'failed', targetMessageId: null });
  });

  it('retries a cancelled regeneration with a new UI request ID', async () => {
    await acquireRegeneration('cancelled-first');
    await releaseChatRequest(conversationId, 'cancelled-first', 'cancelled', 'stopped');

    await expect(acquireRegeneration('cancelled-second')).resolves.toBeTruthy();
  });

  it('reclaims a stale normal request without duplicating its user message', async () => {
    await acquireChatRequest({
      conversationId,
      userId,
      requestId: 'stale-normal',
      shouldCreateUserMessage: true,
      userMessage: 'stale normal message',
    });
    await prisma.chatRequest.update({
      where: { conversationId_requestId: { conversationId, requestId: 'stale-normal' } },
      data: { updatedAt: new Date(Date.now() - CHAT_REQUEST_STALE_MS - 1_000) },
    });

    await expect(
      acquireChatRequest({
        conversationId,
        userId,
        requestId: 'stale-normal',
        shouldCreateUserMessage: true,
        userMessage: 'stale normal message',
      })
    ).resolves.toMatchObject({ reusedStaleUserMessage: true });
    await expect(
      prisma.message.count({ where: { conversationId, clientRequestId: 'stale-normal' } })
    ).resolves.toBe(1);
  });

  it('does not finalize after cancellation wins the claim transition', async () => {
    await acquireRegeneration('cancel-before-finalize');
    await releaseChatRequest(conversationId, 'cancel-before-finalize', 'cancelled', 'stopped');

    await expect(
      finalizeChatRequest({
        conversationId,
        requestId: 'cancel-before-finalize',
        assistantContent: 'must not persist',
        assistantIdToDelete: assistantId,
      })
    ).resolves.toEqual({ completed: false });
    await expect(prisma.message.findUnique({ where: { id: assistantId } })).resolves.toMatchObject({
      content: 'prior valid answer',
    });
    await expect(
      prisma.message.count({ where: { conversationId, content: 'must not persist' } })
    ).resolves.toBe(0);
    await expect(
      prisma.chatRequest.findUnique({
        where: {
          conversationId_requestId: {
            conversationId,
            requestId: 'cancel-before-finalize',
          },
        },
      })
    ).resolves.toMatchObject({ status: 'cancelled' });
  });
});
