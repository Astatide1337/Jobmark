import { NextRequest, NextResponse } from 'next/server';
import { getWellKnownProtectedResource } from '@/lib/mcp/auth/provider';
import { getMcpPublicBaseUrl } from '@/lib/mcp/auth/public-origin';

export async function GET(request: NextRequest) {
  const baseUrl = getMcpPublicBaseUrl(request);
  const protectedResource = await getWellKnownProtectedResource(baseUrl);

  return NextResponse.json(protectedResource, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'application/json',
    },
  });
}
