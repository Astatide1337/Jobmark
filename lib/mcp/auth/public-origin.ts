const PUBLIC_URL_PROTOCOLS = new Set(['http:', 'https:']);

function firstHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(',')[0]?.trim();
  return firstValue || null;
}

function normalizeBaseUrl(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    const parsedUrl = new URL(trimmedValue);
    if (
      !PUBLIC_URL_PROTOCOLS.has(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      return null;
    }

    const pathname = parsedUrl.pathname.replace(/\/+$/, '');
    return `${parsedUrl.origin}${pathname}`;
  } catch {
    return null;
  }
}

/**
 * Resolve the URL that MCP clients can reach, not the address of the app
 * container. The deployment sets MCP_PUBLIC_BASE_URL for tunneled hosts;
 * forwarded headers keep local and other reverse-proxy deployments usable.
 */
export function getMcpPublicBaseUrl(request: Request): string {
  const configuredBaseUrl = process.env.MCP_PUBLIC_BASE_URL
    ? normalizeBaseUrl(process.env.MCP_PUBLIC_BASE_URL)
    : null;
  if (configuredBaseUrl) return configuredBaseUrl;

  const requestUrl = new URL(request.url);
  const forwardedHost =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ??
    firstHeaderValue(request.headers.get('host'));
  if (!forwardedHost) return requestUrl.origin;

  const protocol =
    firstHeaderValue(request.headers.get('x-forwarded-proto')) ??
    requestUrl.protocol.replace(/:$/, '');
  return normalizeBaseUrl(`${protocol}://${forwardedHost}`) ?? requestUrl.origin;
}

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      !PUBLIC_URL_PROTOCOLS.has(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Streamable HTTP requires rejecting an invalid Origin to prevent DNS
 * rebinding. Cross-origin browser callers must be explicitly allowlisted;
 * absent Origin remains valid for non-browser MCP clients.
 */
export function isAllowedMcpOrigin(request: Request): boolean {
  const originHeader = request.headers.get('origin');
  if (!originHeader) return true;

  const origin = normalizeOrigin(originHeader);
  if (!origin) return false;

  const allowedOrigins = new Set<string>();
  const publicBaseUrl = getMcpPublicBaseUrl(request);
  const publicOrigin = normalizeOrigin(new URL(publicBaseUrl).origin);
  if (publicOrigin) allowedOrigins.add(publicOrigin);

  for (const configuredOrigin of (process.env.MCP_ALLOWED_ORIGINS ?? '').split(',')) {
    const normalizedOrigin = normalizeOrigin(configuredOrigin.trim());
    if (normalizedOrigin) allowedOrigins.add(normalizedOrigin);
  }

  return allowedOrigins.has(origin);
}
