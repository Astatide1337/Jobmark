import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('route proxy authentication boundary', () => {
  it('allows the custom sign-in page without a session', () => {
    const response = proxy(new NextRequest('https://jobmark.example.com/signin'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects an unauthenticated protected route to the landing page', () => {
    const response = proxy(new NextRequest('https://jobmark.example.com/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://jobmark.example.com/');
  });
});
