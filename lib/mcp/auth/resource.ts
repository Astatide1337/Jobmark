const RESOURCE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Jobmark currently exposes one OAuth protected resource. Keeping its
 * identifier in one place prevents discovery, authorization, and token
 * requests from silently drifting apart.
 */
export function getMcpResourceUri(baseUrl: string): string {
  return `${baseUrl}/mcp`;
}

function normalizeResource(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      !RESOURCE_PROTOCOLS.has(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    if (
      (url.protocol === 'https:' && url.port === '443') ||
      (url.protocol === 'http:' && url.port === '80')
    ) {
      url.port = '';
    }
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Accept equivalent absolute resource URIs such as an uppercase scheme or
 * host, while rejecting different hosts, paths, ports, queries, and fragments.
 */
export function isMcpResource(value: string | null | undefined, expected: string): boolean {
  if (!value) return false;
  const normalizedValue = normalizeResource(value);
  const normalizedExpected = normalizeResource(expected);
  return normalizedValue !== null && normalizedValue === normalizedExpected;
}
