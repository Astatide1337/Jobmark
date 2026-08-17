/**
 * Browser favicon fallback.
 *
 * Why: Some browsers request `/favicon.ico` before reading the metadata link.
 * Redirecting that request to the canonical Jobmark SVG prevents a 404 and
 * keeps hosting-provider placeholder icons out of the tab.
 */
export function GET() {
  // Use a relative location. The app runs behind an ingress that can expose
  // the pod's internal host in request.url; browsers must stay on the public
  // origin when they follow the favicon redirect.
  return new Response(null, {
    status: 307,
    headers: { Location: '/brand/jobmark-logo.svg' },
  });
}
