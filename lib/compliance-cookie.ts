import { COMPLIANCE_DOCUMENT_VERSIONS } from '@/lib/compliance-policy';

export const COMPLIANCE_COOKIE_NAME = 'jobmark-compliance';

function getSigningSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || null;
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(value: string): ArrayBuffer {
  return Uint8Array.from(Buffer.from(value, 'base64url')).buffer as ArrayBuffer;
}

async function getSigningKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  );
}

/** Create a signed cookie value for the currently published document versions. */
export async function createComplianceCookieValue(): Promise<string | null> {
  const secret = getSigningSecret();
  if (!secret) return null;

  const version = `${COMPLIANCE_DOCUMENT_VERSIONS.terms}:${COMPLIANCE_DOCUMENT_VERSIONS.privacy}`;
  const key = await getSigningKey(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(version));
  return `${version}.${toBase64Url(signature)}`;
}

/** Validate both the signature and the currently published compliance version. */
export async function isValidComplianceCookieValue(value: string | undefined): Promise<boolean> {
  const secret = getSigningSecret();
  if (!secret || !value) return false;

  const [version, signature, ...extra] = value.split('.');
  const expectedVersion = `${COMPLIANCE_DOCUMENT_VERSIONS.terms}:${COMPLIANCE_DOCUMENT_VERSIONS.privacy}`;
  if (!version || !signature || extra.length > 0 || version !== expectedVersion) return false;

  try {
    const key = await getSigningKey(secret, ['verify']);
    return crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(version)
    );
  } catch {
    return false;
  }
}
