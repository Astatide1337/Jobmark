/**
 * Browser favicon fallback.
 *
 * Why: Some browsers request `/favicon.ico` before reading the metadata link.
 * Redirecting that request to the canonical Jobmark SVG prevents a 404 and
 * keeps hosting-provider placeholder icons out of the tab.
 */
export function GET(request: Request) {
  return Response.redirect(new URL('/brand/jobmark-logo.svg', request.url));
}
