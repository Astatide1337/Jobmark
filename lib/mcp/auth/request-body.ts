export type OAuthRequestBody = Record<string, string>;

/** Parse OAuth endpoint input without allowing malformed values to escape as framework errors. */
export async function readOAuthRequestBody(request: Request): Promise<OAuthRequestBody | null> {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.toLowerCase().includes('application/json')) {
      const parsed: unknown = await request.json();
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

      const entries = Object.entries(parsed);
      if (entries.some(([, value]) => typeof value !== 'string')) return null;
      return Object.fromEntries(entries) as OAuthRequestBody;
    }

    const formData = await request.formData();
    const body: OAuthRequestBody = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== 'string' || key in body) return null;
      body[key] = value;
    }
    return body;
  } catch {
    return null;
  }
}
