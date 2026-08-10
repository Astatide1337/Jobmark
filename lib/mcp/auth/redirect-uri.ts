/**
 * OAuth redirect URIs must never point at plaintext or non-web schemes.
 * Loopback HTTP callbacks remain available for local development only.
 */
export function isValidOAuthRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return false;
    if (url.protocol === 'https:') return Boolean(url.hostname);
    if (url.protocol !== 'http:') return false;

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

export function areValidOAuthRedirectUris(values: readonly string[]): boolean {
  return values.length > 0 && values.every(isValidOAuthRedirectUri);
}
