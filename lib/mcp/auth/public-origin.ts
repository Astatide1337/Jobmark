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
