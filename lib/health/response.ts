import { NextResponse } from 'next/server';

import { getRequestCorrelationHeaders } from '@/lib/observability/request-context';
import type { RequestCorrelation } from '@/lib/observability/request-context';

export type HealthResponse = {
  status: 'ok' | 'not_ready';
  service: 'jobmark';
  build_revision: string;
  checks?: {
    database: 'ok' | 'failed';
  };
};

export function createHealthResponse(
  body: HealthResponse,
  correlation: RequestCorrelation,
  status: number
): NextResponse<HealthResponse> {
  return NextResponse.json(body, {
    status,
    headers: {
      ...getRequestCorrelationHeaders(correlation),
      'Cache-Control': 'no-store, max-age=0',
      ...(status >= 500 ? { 'Retry-After': '5' } : {}),
    },
  });
}
