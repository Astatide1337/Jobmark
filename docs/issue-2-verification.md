# Issue #2 verification record

This is the local verification record for the stabilization work. It is
intentionally explicit about checks that still require a hosted CI run or
authenticated manual QA.

## Automated evidence

| Area                        | Evidence                                                                                          | Result                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Clean install               | `npm ci`                                                                                          | Passed                                                             |
| Prisma schema               | `npx prisma validate` and `npx prisma generate`                                                   | Passed                                                             |
| Unit/regression suite       | `npm test`                                                                                        | 28 passed; 5 database integration tests skipped without a database |
| PostgreSQL integration      | Fresh PostgreSQL 16 container, `npx prisma migrate deploy`, `INTEGRATION_TESTS=1 npm test`        | 14 migrations applied; 33 tests passed                             |
| Type safety                 | `npm run typecheck`                                                                               | Passed                                                             |
| Repository verification     | `npm run verify`                                                                                  | Passed; 0 lint errors, typecheck passed, formatting passed         |
| Lint                        | `npm run lint`                                                                                    | 0 errors; warnings remain in legacy UI/components                  |
| Production build            | `npm run build`                                                                                   | Passed                                                             |
| Docker build                | `docker build --tag jobmark-issue2-final .`                                                       | Passed                                                             |
| Docker runtime              | Configured image returned HTTP 200                                                                | Passed                                                             |
| Missing configuration       | Image without required runtime variables exited with code 1 and logged the missing-variable error | Passed                                                             |
| Production dependency audit | `npm audit --omit=dev --audit-level=high`                                                         | No high/critical findings; 3 moderate transitive findings remain   |

Brief-generation actions are deterministic and bounded; they do not call a
Jobmark model service or require a provider timeout. Vault and other sensitive
operations use the shared database-backed request limit.

## Migration notes

The original migration history omitted tables and fields that the current
application already depends on. Compatibility migrations now cover:

- `UserSettings` creation before vault/key migrations;
- removal of obsolete required report columns;
- missing goals, contacts, interactions, outreach, conversations, messages,
  and the conversation/report join table;
- current vault, timezone, chat-idempotency, report-project, and canonical
  monthly-target, and persisted chat-cancellation changes.

The full chain was applied successfully to an empty PostgreSQL 16 database.

Date-boundary consumers, including Focus and Network monthly statistics, use
the persisted user timezone rather than the deployment server timezone.

## Remaining manual/hosted evidence

- Run the committed workflow on GitHub and retain the check-run URL.
- Execute the two-account authenticated QA matrix in issue #2, including
  account deletion, vault switching, reports, chat regeneration, and locked
  data visibility.
- Attach redacted export/database snapshots and screenshots to the eventual
  pull request.
