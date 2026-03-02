type ActiveStream = {
  requestId: string;
  userId: string;
  conversationId: string;
  controller: AbortController;
  startedAt: number;
};

/**
 * StreamManager
 *
 * Why: jobmark supports "Real-time AI Streams". If a user navigates away or
 * manually stops a chat, we need a reliable way to kill the upstream AI
 * process to save costs and server resources.
 *
 * Technical Pattern:
 * - Singleton: Ensures only one registry exists per server instance.
 * - Global Persistence: We attach the instance to `globalThis` to prevent
 *   development-mode hot reloads from losing track of active streams.
 * - Ownership: The `cancel` method requires a `userId` to ensure users
 *   cannot kill other people's AI streams.
 */
class StreamManager {
  private registry: Map<string, ActiveStream>;

  constructor() {
    this.registry = new Map();
  }

  /**
   * Register a new active stream
   */
  register(stream: ActiveStream): void {
    this.registry.set(stream.requestId, stream);
  }

  /**
   * Unregister a stream (when it completes or fails)
   */
  unregister(requestId: string): void {
    this.registry.delete(requestId);
  }

  /**
   * Cancel an active stream by requestId and verify ownership
   */
  cancel(requestId: string, userId: string): boolean {
    const stream = this.registry.get(requestId);
    if (!stream) return false;

    // Safety check: ensure user owns this stream
    if (stream.userId !== userId) {
      console.warn(
        `[StreamManager] Unauthorized cancel attempt for request ${requestId} by user ${userId}`
      );
      return false;
    }

    stream.controller.abort('cancelled-by-user');
    this.registry.delete(requestId);
    return true;
  }

  /**
   * Cleanup stale streams that have been running longer than maxAgeMs
   */
  cleanupStale(maxAgeMs = 5 * 60 * 1000): void {
    const now = Date.now();
    let cleanupCount = 0;

    for (const [requestId, stream] of this.registry.entries()) {
      if (now - stream.startedAt > maxAgeMs) {
        stream.controller.abort('stale-stream-cleanup');
        this.registry.delete(requestId);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      console.log(`[StreamManager] Cleaned up ${cleanupCount} stale streams`);
    }
  }

  /**
   * Get count of currently active streams
   */
  get activeCount(): number {
    return this.registry.size;
  }
}

// Singleton pattern with globalThis attachment for Next.js
const globalState = globalThis as typeof globalThis & {
  __jobmarkStreamManager?: StreamManager;
};

export const streamManager = globalState.__jobmarkStreamManager ?? new StreamManager();

if (process.env.NODE_ENV !== 'production') {
  globalState.__jobmarkStreamManager = streamManager;
}
