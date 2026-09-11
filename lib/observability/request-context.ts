import 'server-only';

const REQUEST_ID_PATTERN =
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9.-]{0,63}$/;

export type RequestCorrelation = {
  requestId: string;
  method: string;
  route: string;
};

export type RequestEvent = {
  event: string;
  outcome: 'success' | 'failure';
  status?: number;
  durationMs?: number;
};

/**
 * Create a bounded correlation context from request metadata only.
 *
 * Why: diagnostics need a stable identifier, but request bodies, query
 * strings, authorization headers, and other user-controlled content must not
 * be copied into logs. Only UUID-shaped upstream IDs are accepted.
 */
export function createRequestCorrelation(request: Request, route: string): RequestCorrelation {
  const upstreamRequestId = request.headers.get('x-request-id')?.trim();
  const requestId =
    upstreamRequestId && REQUEST_ID_PATTERN.test(upstreamRequestId)
      ? upstreamRequestId
      : crypto.randomUUID();

  return {
    requestId,
    method: request.method,
    route: EVENT_NAME_PATTERN.test(route) ? route : 'unknown',
  };
}

export function getRequestCorrelationHeaders(correlation: RequestCorrelation): HeadersInit {
  return { 'X-Request-ID': correlation.requestId };
}

/**
 * Emit a small, allow-listed JSON record suitable for platform log shipping.
 *
 * Why: accepting a generic metadata object here would make it too easy for a
 * future caller to accidentally log a token or user content.
 */
export function logRequestEvent(correlation: RequestCorrelation, event: RequestEvent): void {
  const record: Record<string, string | number> = {
    event: EVENT_NAME_PATTERN.test(event.event) ? event.event : 'unknown',
    request_id: correlation.requestId,
    method: correlation.method,
    route: correlation.route,
    outcome: event.outcome,
  };

  if (typeof event.status === 'number') record.status = event.status;
  if (typeof event.durationMs === 'number') {
    record.duration_ms = Math.max(0, Math.round(event.durationMs));
  }

  console.info(JSON.stringify(record));
}
