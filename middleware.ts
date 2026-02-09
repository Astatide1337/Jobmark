import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session token
  const sessionToken = request.cookies.get("authjs.session-token") || 
                       request.cookies.get("__Secure-authjs.session-token");

  // Redirect logged-in users from landing page to dashboard
  if (pathname === "/" && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/api/auth", "/terms", "/privacy"];
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );

  // Static assets and API routes
  const isStaticAsset = 
    pathname.startsWith("/_next") || 
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  // Allow public routes and static assets
  if (isPublicRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to landing page (modal will handle auth)
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/", request.url));
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
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
  ],
};
