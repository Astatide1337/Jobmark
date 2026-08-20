import * as dns from 'node:dns/promises';
import type { ClientRequest, IncomingHttpHeaders } from 'node:http';
import * as https from 'node:https';
import { isIP } from 'node:net';
import { areValidOAuthRedirectUris } from './redirect-uri';

const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

type ClientMetadata = {
  client_id?: unknown;
  client_name?: unknown;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
};

export type DynamicClientMetadata = ClientMetadata & {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
};

function ipv4ToNumber(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part))) return null;

  const octets = parts.map(Number);
  if (octets.some(octet => octet > 255)) return null;
  return ((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3];
}

function ipv4NumberToString(value: number): string {
  return [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join('.');
}

function isBlockedIPv4(address: string): boolean {
  const value = ipv4ToNumber(address);
  if (value === null) return true;

  const blockedRanges: Array<[number, number]> = [
    [0x00000000, 0x00ffffff], // "this" network / unspecified
    [0x0a000000, 0x0affffff], // RFC 1918
    [0x64400000, 0x647fffff], // RFC 6598
    [0x7f000000, 0x7fffffff], // loopback
    [0xa9fe0000, 0xa9feffff], // link-local
    [0xac100000, 0xac1fffff], // RFC 1918
    [0xc0000000, 0xc00000ff], // IETF protocol assignments
    [0xc0000200, 0xc00002ff], // TEST-NET-1
    [0xc0586300, 0xc05863ff], // deprecated 6to4 relay anycast
    [0xc0a80000, 0xc0a8ffff], // RFC 1918
    [0xc6120000, 0xc613ffff], // benchmarking
    [0xc6336400, 0xc63364ff], // TEST-NET-2
    [0xcb007100, 0xcb0071ff], // TEST-NET-3
    [0xe0000000, 0xffffffff], // multicast and reserved
  ];

  return blockedRanges.some(([start, end]) => value >= start && value <= end);
}

function parseIPv6(address: string): string | null {
  let normalized = address.toLowerCase();
  if (normalized.includes('%')) return null;

  if (normalized.includes('.')) {
    const separator = normalized.lastIndexOf(':');
    if (separator < 0) return null;
    const ipv4 = ipv4ToNumber(normalized.slice(separator + 1));
    if (ipv4 === null) return null;
    normalized = `${normalized.slice(0, separator + 1)}${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const compressionIndex = normalized.indexOf('::');
  let groups: string[];
  if (compressionIndex >= 0) {
    if (normalized.indexOf('::', compressionIndex + 2) >= 0) return null;
    const left = normalized.slice(0, compressionIndex);
    const right = normalized.slice(compressionIndex + 2);
    const leftGroups = left ? left.split(':') : [];
    const rightGroups = right ? right.split(':') : [];
    if (leftGroups.length + rightGroups.length >= 8) return null;
    groups = [
      ...leftGroups,
      ...Array(8 - leftGroups.length - rightGroups.length).fill('0'),
      ...rightGroups,
    ];
  } else {
    groups = normalized.split(':');
    if (groups.length !== 8) return null;
  }

  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map(group => group.padStart(4, '0')).join('');
}

function hasIPv6Prefix(value: string, bits: number, prefix: string): boolean {
  const hexDigits = Math.ceil(bits / 4);
  const normalizedPrefix = prefix.padStart(hexDigits, '0');
  const completeDigits = Math.floor(bits / 4);
  if (value.slice(0, completeDigits) !== normalizedPrefix.slice(0, completeDigits)) return false;
  if (bits % 4 === 0) return true;

  const mask = 0xf << (4 - (bits % 4));
  return (
    (parseInt(value[completeDigits], 16) & mask) ===
    (parseInt(normalizedPrefix[completeDigits], 16) & mask)
  );
}

function isBlockedIPv6(address: string): boolean {
  const value = parseIPv6(address);
  if (value === null) return true;

  if (value.slice(0, 24) === '00000000000000000000ffff') {
    return isBlockedIPv4(ipv4NumberToString(parseInt(value.slice(24), 16)));
  }

  return (
    value === '0'.repeat(32) ||
    value === `0${'0'.repeat(31 - 1)}1` ||
    hasIPv6Prefix(value, 7, 'fc') ||
    hasIPv6Prefix(value, 10, 'fe80') ||
    hasIPv6Prefix(value, 8, 'ff') ||
    value.slice(0, 24) === '0'.repeat(24) ||
    hasIPv6Prefix(value, 32, '20010db8') ||
    hasIPv6Prefix(value, 48, '200100000002') ||
    hasIPv6Prefix(value, 28, '2001001') ||
    hasIPv6Prefix(value, 28, '2001002') ||
    hasIPv6Prefix(value, 64, '0100000000000000') ||
    hasIPv6Prefix(value, 96, '0064ff9b0000000000000000') ||
    hasIPv6Prefix(value, 20, '3fff0')
  );
}

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isBlockedIPv4(address);
  if (family === 6) return isBlockedIPv6(address);
  return true;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

type PinnedAddress = {
  address: string;
  family: 4 | 6;
};

async function resolveSafeAddress(hostname: string): Promise<PinnedAddress | null> {
  const normalizedHostname = hostname.replace(/^\[/, '').replace(/\]$/, '');
  const family = isIP(normalizedHostname);
  if (family) {
    return isBlockedAddress(normalizedHostname)
      ? null
      : { address: normalizedHostname, family: family as 4 | 6 };
  }

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname.endsWith('.local')
  ) {
    return null;
  }

  const results = await withTimeout(
    Promise.allSettled([dns.resolve4(normalizedHostname), dns.resolve6(normalizedHostname)]),
    FETCH_TIMEOUT_MS
  );
  const addresses = results.flatMap(result => (result.status === 'fulfilled' ? result.value : []));
  if (addresses.length === 0 || addresses.some(address => isBlockedAddress(address))) return null;

  const address = addresses[0];
  return { address, family: isIP(address) as 4 | 6 };
}

type PinnedResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
};

async function fetchPinnedMetadata(
  url: URL,
  pinnedAddress: PinnedAddress
): Promise<PinnedResponse> {
  let request: ClientRequest | undefined;
  const responsePromise = new Promise<PinnedResponse>((resolve, reject) => {
    request = https.request(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        agent: false,
        servername: isIP(url.hostname.replace(/^\[/, '').replace(/\]$/, ''))
          ? undefined
          : url.hostname,
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }]);
            return;
          }

          callback(null, pinnedAddress.address, pinnedAddress.family);
        },
      },
      response => {
        const chunks: Buffer[] = [];
        let total = 0;
        response.on('data', (chunk: Buffer | string) => {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += bytes.byteLength;
          if (total > MAX_RESPONSE_BYTES) {
            response.destroy(new Error('response too large'));
            return;
          }
          chunks.push(bytes);
        });
        response.once('end', () => {
          if (total <= MAX_RESPONSE_BYTES) {
            resolve({
              statusCode: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks),
            });
          }
        });
        response.once('error', reject);
      }
    );
    request.once('error', reject);
    request.end();
  });

  try {
    return await withTimeout(responsePromise, FETCH_TIMEOUT_MS);
  } catch (error) {
    request?.destroy();
    throw error;
  }
}

function getResponseHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function readResponseBody(body: Buffer): string | null {
  if (body.byteLength > MAX_RESPONSE_BYTES) return null;
  return new TextDecoder().decode(body);
}

function hasJsonContentType(headers: IncomingHttpHeaders): boolean {
  const contentType = getResponseHeader(headers, 'content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();

  return contentType === 'application/json' || Boolean(contentType?.endsWith('+json'));
}

function hasAcceptableContentLength(headers: IncomingHttpHeaders): boolean {
  const contentLength = getResponseHeader(headers, 'content-length');
  return (
    !contentLength ||
    !Number.isFinite(Number(contentLength)) ||
    Number(contentLength) <= MAX_RESPONSE_BYTES
  );
}

function getValidClientMetadata(
  metadata: ClientMetadata,
  clientId: string
): DynamicClientMetadata | null {
  if (
    metadata.client_id !== clientId ||
    typeof metadata.client_name !== 'string' ||
    metadata.client_name.trim().length === 0 ||
    !Array.isArray(metadata.redirect_uris) ||
    !metadata.redirect_uris.every(uri => typeof uri === 'string') ||
    !areValidOAuthRedirectUris(metadata.redirect_uris)
  ) {
    return null;
  }

  return metadata as DynamicClientMetadata;
}

function parseClientMetadataUrl(clientId: string): URL | null | undefined {
  const looksLikeUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(clientId);
  if (!looksLikeUrl) return undefined;

  try {
    const url = new URL(clientId);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password || url.port !== '' || !url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Resolve and validate a CIDDD metadata document without giving it database access.
 * `undefined` means the client ID is not a URL; `null` means a URL failed validation.
 */
export async function fetchDynamicClientMetadata(
  clientId: string
): Promise<DynamicClientMetadata | null | undefined> {
  const metadataUrl = parseClientMetadataUrl(clientId);
  if (metadataUrl === undefined || metadataUrl === null) return metadataUrl;

  try {
    const pinnedAddress = await resolveSafeAddress(metadataUrl.hostname);
    if (!pinnedAddress) return null;

    const response = await fetchPinnedMetadata(metadataUrl, pinnedAddress);
    if (response.statusCode < 200 || response.statusCode >= 300) return null;
    if (!hasJsonContentType(response.headers) || !hasAcceptableContentLength(response.headers)) {
      return null;
    }

    const body = readResponseBody(response.body);
    if (body === null) return null;
    return getValidClientMetadata(JSON.parse(body) as ClientMetadata, clientId);
  } catch {
    return null;
  }
}
