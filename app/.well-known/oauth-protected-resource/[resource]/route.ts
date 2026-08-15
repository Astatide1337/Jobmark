import { NextRequest, NextResponse } from 'next/server';
import { getWellKnownProtectedResource } from '@/lib/mcp/auth/provider';
import { getMcpPublicBaseUrl } from '@/lib/mcp/auth/public-origin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const baseUrl = getMcpPublicBaseUrl(request);
  const resourcePath = `/${resource}`;

  const metadata = await getWellKnownProtectedResource(baseUrl);

  if (metadata.resource !== `${baseUrl}${resourcePath}`) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'application/json',
    },
  });
}
