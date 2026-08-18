# Jobmark operations

This document describes the application-side release-readiness hooks. It does
not create a monitoring-vendor integration or store monitoring credentials.

## Health endpoints

Both endpoints are public, return JSON, disable caching, and include an
`X-Request-ID` response header. They never return stack traces, database URLs,
SQL errors, authorization headers, cookies, request bodies, query strings, or
user records.

| Endpoint                | Purpose           | Success | Dependency check                |
| ----------------------- | ----------------- | ------- | ------------------------------- |
| `GET /api/health/live`  | Process liveness  | `200`   | None; use for restart decisions |
| `GET /api/health/ready` | Traffic readiness | `200`   | Bounded database `SELECT 1`     |

The response has this shape:

```json
{
  "status": "ok",
  "service": "jobmark",
  "build_revision": "<safe revision>",
  "checks": { "database": "ok" }
}
```

The liveness response omits `checks`. A failed readiness check returns HTTP
`503` with `status: "not_ready"` and `checks.database: "failed"`; it does not
include the underlying error. The revision is read from
`JOBMARK_BUILD_REVISION`, then `VERCEL_GIT_COMMIT_SHA`, then
`GIT_COMMIT_SHA`. Values must be identifier-shaped; malformed values are
skipped and the endpoint returns `"unknown"` when no safe value is available.

## Request correlation and logs

The shared request helper accepts only UUID-shaped incoming `X-Request-ID`
values. Otherwise it generates a UUID. The structured logger accepts an
allow-listed event, outcome, status, duration, route, method, and request ID.
It has no generic metadata argument, so callers cannot accidentally pass a
request body, token, query string, cookie, or user content into the log record.

The readiness failure event is suitable for JSON log collection:

```json
{
  "event": "health.readiness.failed",
  "request_id": "<uuid>",
  "method": "GET",
  "route": "health.ready",
  "outcome": "failure",
  "status": 503,
  "duration_ms": 1001
}
```

## Response security headers

Next applies compatible baseline headers to all routes: content-type sniffing
protection, same-origin framing, strict-origin referrers, a restricted
permissions policy (same-origin microphone access remains available for voice
typing), disabled DNS prefetch, and no cross-domain policy. HSTS is added only
for production processes whose `NEXT_PUBLIC_SITE_URL` starts with `https://`.
A Content-Security-Policy is intentionally not enabled until the OAuth and
browser integration sources are inventoried and tested.

## Remaining Cloudflare wiring

Configure the Cloudflare health monitor/load balancer for
`/api/health/live`, HTTPS, the application port, and an expected `200` JSON
response. Ensure the monitor can reach the path without an interactive WAF
challenge, bot challenge, authentication redirect, or cache layer. Keep
`/api/health/*` uncached at the edge; the application already sends
`Cache-Control: no-store, max-age=0`.

The Cloudflare-side work still needed is to select the account/zone metrics
and alerts: origin health-check status, origin HTTP 5xx rate, request latency
percentiles, traffic volume, and TLS/edge error rate. Alert on sustained
health-check failures, elevated 5xx responses, and latency breaches, with
deployment revision and `X-Request-ID` links available in the log destination.
No Cloudflare API token or vendor credentials are required by this code.

## Remaining Kubernetes wiring

In the GitOps Deployment, add HTTP probes such as:

```yaml
livenessProbe:
  httpGet: { path: /api/health/live, port: http }
readinessProbe:
  httpGet: { path: /api/health/ready, port: http }
```

Set probe periods, timeouts, and failure thresholds to match the cluster’s
rollout policy. A startup probe may be used for slow image/database startup so
the liveness probe does not restart a process that is still booting. Keep
liveness independent of the database; readiness should control Service
endpoints during a database outage.

The cluster-side metrics and alerts still needed are ready/available replica
count, pod restart rate, container CPU and memory saturation, ingress request
rate/5xx/latency, and readiness probe failures. Alert on zero available
production replicas, repeated restarts, sustained readiness failures, and
error/latency budget breaches. Wire these in the existing GitOps observability
stack rather than adding a new dependency here.

Inject `JOBMARK_BUILD_REVISION` from the immutable image or deployment
metadata. The current image publication labels the image revision, but the
Kubernetes deployment must explicitly expose that value to the container if it
is to appear in health responses. Do not put secrets in this variable.
