import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The internal chat product was retired. Return a real 404 instead of
  // redirecting the stale path to the landing page, which makes old links
  // look valid and violates the route contract in SPEC.md.
  if (pathname === '/chat' || pathname.startsWith('/chat/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // API handlers return their own JSON auth/error responses. Redirecting an
  // unauthenticated API call to the landing page turns a useful 401 into an
  // HTML response and breaks clients such as MCP and the vault handoff.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for session token
  const sessionToken =
    request.cookies.get('authjs.session-token') ||
    request.cookies.get('__Secure-authjs.session-token');

  // Don't auto-redirect from landing page - let the page handle it
  // This prevents redirect loops when cookies exist but session is invalid

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/signin',
    '/api/auth',
    '/terms',
    '/privacy',
    '/articles',
    '/mcp',
    '/api/auth/mcp',
    '/.well-known',
  ];
  const isPublicRoute = publicRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );

  // OG image needs special handling - let it through the middleware
  if (pathname.startsWith('/opengraph-image')) {
    return NextResponse.next();
  }

  // Static assets and API routes
  const isStaticAsset =
    pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.');

  // Allow public routes and static assets
  if (isPublicRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to landing page (modal will handle auth)
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API handlers (they own their authentication response)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
