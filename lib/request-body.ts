const MAX_JSON_BODY_BYTES = 256 * 1024;

export type JsonBodyResult =
  | { kind: 'ok'; value: unknown }
  | { kind: 'too_large' }
  | { kind: 'invalid' };

/** Read JSON with a hard byte limit before parsing attacker-controlled input. */
export async function readBoundedJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<JsonBodyResult> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > maxBytes) return { kind: 'too_large' };
  }

  try {
    const reader = request.body?.getReader();
    if (!reader) return { kind: 'invalid' };

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { kind: 'too_large' };
      }
      chunks.push(value);
    }

    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { kind: 'ok', value: JSON.parse(new TextDecoder().decode(body)) as unknown };
  } catch {
    return { kind: 'invalid' };
  }
}
