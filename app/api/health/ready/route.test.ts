import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ isDatabaseReady: vi.fn() }));

vi.mock('@/lib/health/readiness', () => ({ isDatabaseReady: mocks.isDatabaseReady }));

import { GET } from './route';

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports readiness when the database check succeeds', async () => {
    mocks.isDatabaseReady.mockResolvedValue(true);
    const requestId = '123e4567-e89b-12d3-a456-426614174000';

    const response = await GET(
      new Request('https://jobmark.example.com/api/health/ready', {
        headers: { 'x-request-id': requestId },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'ok',
      service: 'jobmark',
      build_revision: expect.any(String),
      checks: { database: 'ok' },
    });
    expect(response.headers.get('x-request-id')).toBe(requestId);
    expect(response.headers.get('retry-after')).toBeNull();
  });

  it('returns a generic 503 when the database is unavailable', async () => {
    mocks.isDatabaseReady.mockResolvedValue(false);

    const response = await GET(
      new Request('https://jobmark.example.com/api/health/ready', {
        headers: { 'x-request-id': 'Bearer user-token-must-not-be-echoed' },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      status: 'not_ready',
      service: 'jobmark',
      build_revision: expect.any(String),
      checks: { database: 'failed' },
    });
    expect(JSON.stringify(body)).not.toContain('user-token');
    expect(response.headers.get('retry-after')).toBe('5');
    expect(response.headers.get('x-request-id')).not.toContain('Bearer');
  });
});
