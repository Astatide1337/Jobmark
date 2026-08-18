import { createHealthResponse } from '@/lib/health/response';
import { getBuildRevision } from '@/lib/observability/build-info';
import { createRequestCorrelation } from '@/lib/observability/request-context';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const correlation = createRequestCorrelation(request, 'health.live');

  return createHealthResponse(
    {
      status: 'ok',
      service: 'jobmark',
      build_revision: getBuildRevision(),
    },
    correlation,
    200
  );
}
