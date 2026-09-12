import crypto from 'crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

/** Hash the exact logical tool arguments, independent of object key order. */
export function hashMcpArguments(argumentsValue: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(argumentsValue)))
    .digest('hex');
}
