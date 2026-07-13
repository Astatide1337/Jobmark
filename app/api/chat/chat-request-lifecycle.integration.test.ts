import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';

const enabled = process.env.INTEGRATION_TESTS === '1';

describe.skipIf(!enabled)('durable chat request lifecycle', () => {
  let userId = '';
  let conversationId = '';
  let assistantId = '';
  const createdUserIds: string[] = [];

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `chat-request-${Date.now()}-${Math.random()}@example.test` },
    });
    const conversation = await prisma.conversation.create({ data: { userId: user.id } });
    const assistant = await prisma.message.create({
      data: { conversationId: conversation.id, role: 'assistant', content: 'prior valid answer' },
    });
    userId = user.id;
    createdUserIds.push(user.id);
    conversationId = conversation.id;
    assistantId = assistant.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it('rejects two concurrent claims using the same regeneration request ID', async () => {
    await prisma.chatRequest.create({
      data: { userId, conversationId, requestId: 'same', targetMessageId: assistantId },
    });
    await expect(
      prisma.chatRequest.create({
        data: { userId, conversationId, requestId: 'same', targetMessageId: assistantId },
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects two request IDs targeting the same assistant', async () => {
    await prisma.chatRequest.create({
      data: { userId, conversationId, requestId: 'first', targetMessageId: assistantId },
    });
    await expect(
      prisma.chatRequest.create({
        data: { userId, conversationId, requestId: 'second', targetMessageId: assistantId },
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('retains the prior assistant when a pre-generation failure marks a claim failed', async () => {
    const claim = await prisma.chatRequest.create({
      data: { userId, conversationId, requestId: 'config-failure', targetMessageId: assistantId },
    });
    await prisma.chatRequest.update({
      where: { id: claim.id },
      data: { status: 'failed', error: 'AI configuration failed' },
    });
    await expect(prisma.message.findUnique({ where: { id: assistantId } })).resolves.toMatchObject({
      content: 'prior valid answer',
    });
  });

  it('cleans up a newly claimed user turn after provider failure', async () => {
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: 'retry me',
        clientRequestId: 'provider-failure',
      },
    });
    const claim = await prisma.chatRequest.create({
      data: {
        userId,
        conversationId,
        requestId: 'provider-failure',
        userMessageId: userMessage.id,
        createdUserMessage: true,
      },
    });
    await prisma.$transaction([
      prisma.message.delete({ where: { id: userMessage.id } }),
      prisma.chatRequest.update({
        where: { id: claim.id },
        data: { status: 'failed', error: 'provider failed' },
      }),
    ]);
    await expect(
      prisma.message.count({ where: { conversationId, clientRequestId: 'provider-failure' } })
    ).resolves.toBe(0);
    await expect(prisma.message.findUnique({ where: { id: assistantId } })).resolves.toBeTruthy();
  });

  it('retries a failed request without duplicating its user turn', async () => {
    const claim = await prisma.chatRequest.create({
      data: { userId, conversationId, requestId: 'retryable' },
    });
    const first = await prisma.message.create({
      data: { conversationId, role: 'user', content: 'retry me', clientRequestId: 'retryable' },
    });
    await prisma.chatRequest.update({
      where: { id: claim.id },
      data: { status: 'failed', userMessageId: first.id, createdUserMessage: true },
    });
    await prisma.message.delete({ where: { id: first.id } });
    await prisma.chatRequest.update({
      where: { id: claim.id },
      data: { status: 'in_progress', error: null },
    });
    await prisma.message.create({
      data: { conversationId, role: 'user', content: 'retry me', clientRequestId: 'retryable' },
    });
    await expect(
      prisma.message.count({ where: { conversationId, clientRequestId: 'retryable' } })
    ).resolves.toBe(1);
  });
});
