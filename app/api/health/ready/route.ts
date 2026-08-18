import { isDatabaseReady } from '@/lib/health/readiness';
import { createHealthResponse } from '@/lib/health/response';
import { getBuildRevision } from '@/lib/observability/build-info';
import { createRequestCorrelation, logRequestEvent } from '@/lib/observability/request-context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const startedAt = Date.now();
  const correlation = createRequestCorrelation(request, 'health.ready');
  const databaseReady = await isDatabaseReady();

  if (!databaseReady) {
    logRequestEvent(correlation, {
      event: 'health.readiness.failed',
      outcome: 'failure',
      status: 503,
      durationMs: Date.now() - startedAt,
    });
  }

  return createHealthResponse(
    {
      status: databaseReady ? 'ok' : 'not_ready',
      service: 'jobmark',
      build_revision: getBuildRevision(),
      checks: { database: databaseReady ? 'ok' : 'failed' },
    },
    correlation,
    databaseReady ? 200 : 503
  );
}
