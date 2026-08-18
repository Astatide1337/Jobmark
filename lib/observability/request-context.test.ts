import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createRequestCorrelation,
  getRequestCorrelationHeaders,
  logRequestEvent,
} from './request-context';

describe('request correlation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('accepts UUID correlation IDs and returns the same response header', () => {
    const requestId = '123e4567-e89b-12d3-a456-426614174000';
    const correlation = createRequestCorrelation(
      new Request('https://jobmark.example.com/api/health/live', {
        headers: { 'x-request-id': requestId },
      }),
      'health.live'
    );

    expect(correlation.requestId).toBe(requestId);
    expect(getRequestCorrelationHeaders(correlation)).toEqual({ 'X-Request-ID': requestId });
  });

  it('does not log arbitrary request headers or user content', () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const correlation = createRequestCorrelation(
      new Request('https://jobmark.example.com/api/health/live?token=secret-token', {
        headers: { 'x-request-id': 'secret-token' },
      }),
      'health.live'
    );

    logRequestEvent(correlation, {
      event: 'health.readiness.failed',
      outcome: 'failure',
      status: 503,
      durationMs: 12.4,
    });

    expect(consoleInfo).toHaveBeenCalledOnce();
    const record = JSON.parse(consoleInfo.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(record).toEqual({
      event: 'health.readiness.failed',
      request_id: expect.any(String),
      method: 'GET',
      route: 'health.live',
      outcome: 'failure',
      status: 503,
      duration_ms: 12,
    });
    expect(JSON.stringify(record)).not.toContain('secret-token');
  });
});
