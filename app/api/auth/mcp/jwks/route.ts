import { NextResponse } from 'next/server';
import { getJWKSKeys } from '@/lib/mcp/auth/provider';

export async function GET() {
  const jwks = await getJWKSKeys();

  return NextResponse.json(jwks, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/json',
    },
  });
}
