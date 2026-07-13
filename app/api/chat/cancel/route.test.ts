import { describe, expect, it, vi } from 'vitest';

const { authMock, updateManyMock, findClaimMock, releaseClaimMock, cancelMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    updateManyMock: vi.fn(),
    findClaimMock: vi.fn(),
    releaseClaimMock: vi.fn(),
    cancelMock: vi.fn(),
  })
);

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/db', () => ({
  prisma: {
    message: { updateMany: updateManyMock },
    chatRequest: { findFirst: findClaimMock },
  },
}));
vi.mock('@/lib/chat/request-lifecycle', () => ({ releaseChatRequest: releaseClaimMock }));
vi.mock('@/lib/chat/stream-manager', () => ({
  streamManager: {
    cleanupStale: vi.fn(),
    cancel: cancelMock,
  },
}));

import { POST } from './route';

describe('chat cancellation route', () => {
  it('persists cancellation for serverless-safe cancellation', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-a' } });
    cancelMock.mockReturnValue(false);
    updateManyMock.mockResolvedValue({ count: 1 });
    findClaimMock.mockResolvedValue({ conversationId: 'conversation-1' });
    releaseClaimMock.mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/chat/cancel', {
        method: 'POST',
        body: JSON.stringify({ requestId: 'request-1' }),
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ cancelled: true });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        clientRequestId: 'request-1',
        role: 'user',
        cancelledAt: null,
        conversation: { userId: 'user-a' },
      },
      data: { cancelledAt: expect.any(Date) },
    });
  });
});
