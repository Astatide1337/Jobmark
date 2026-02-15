type ActiveStream = {
  requestId: string;
  userId: string;
  conversationId: string;
  controller: AbortController;
  startedAt: number;
};

type Registry = Map<string, ActiveStream>;

const globalState = globalThis as typeof globalThis & {
  __jobmarkChatStreamRegistry?: Registry;
};

const registry: Registry = globalState.__jobmarkChatStreamRegistry ?? new Map();

if (!globalState.__jobmarkChatStreamRegistry) {
  globalState.__jobmarkChatStreamRegistry = registry;
}

export function registerChatStream(stream: ActiveStream): void {
  registry.set(stream.requestId, stream);
}

export function unregisterChatStream(requestId: string): void {
  registry.delete(requestId);
}

export function cancelChatStream(requestId: string, userId: string): boolean {
  const stream = registry.get(requestId);
  if (!stream) return false;
  if (stream.userId !== userId) return false;

  stream.controller.abort("cancelled-by-user");
  registry.delete(requestId);
  return true;
}

export function cleanupStaleChatStreams(maxAgeMs = 5 * 60 * 1000): void {
  const now = Date.now();
  for (const [requestId, stream] of registry.entries()) {
    if (now - stream.startedAt > maxAgeMs) {
      stream.controller.abort("stale-stream-cleanup");
      registry.delete(requestId);
    }
  }
}
