import { NextRequest, NextResponse } from 'next/server';
import { getWellKnownAuthServer, getWellKnownProtectedResource } from '@/lib/mcp/auth/provider';
import { getMcpPublicBaseUrl } from '@/lib/mcp/auth/public-origin';

export async function GET(request: NextRequest) {
  const baseUrl = getMcpPublicBaseUrl(request);

  const [authServer, protectedResource] = await Promise.all([
    getWellKnownAuthServer(baseUrl),
    getWellKnownProtectedResource(baseUrl),
  ]);

  // Return auth server metadata by default
  return NextResponse.json(authServer, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'application/json',
    },
  });
}

export async function GET_PROTECTED_RESOURCE(request: NextRequest) {
  const baseUrl = getMcpPublicBaseUrl(request);
  const protectedResource = await getWellKnownProtectedResource(baseUrl);

  return NextResponse.json(protectedResource, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'application/json',
    },
  });
}
