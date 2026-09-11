import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/health/live', () => {
  it('returns the safe liveness shape without dependency details', async () => {
    const response = GET(
      new Request('https://jobmark.example.com/api/health/live', {
        headers: { 'x-request-id': 'not-a-request-token' },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'ok',
      service: 'jobmark',
      build_revision: expect.any(String),
    });
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body).not.toHaveProperty('error');
  });
});
