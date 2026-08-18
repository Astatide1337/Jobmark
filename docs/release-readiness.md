# Release readiness

This document describes the CI and release security gates. A release is not ready while any hard gate is failing.

## Automated gates

- **Dependency audit:** CI runs `npm audit --audit-level=high` against the locked dependency tree. High and critical advisories fail the workflow; no audit exception or `continue-on-error` is used.
- **Node and application verification:** CI asserts Node.js 22, installs the lockfile, validates and generates Prisma, applies all committed migrations to a clean PostgreSQL 16 service, then runs lint, typecheck, frontend invariants, formatting, tests, and the production build.
- **CodeQL:** JavaScript and TypeScript analysis runs on pull requests, release branches, and weekly on a schedule.
- **Secret scanning:** Gitleaks scans the complete Git history on pull requests, release branches, and weekly on a schedule.
- **Container security:** The publish workflow builds the exact source revision locally before pushing it. Trivy blocks fixed high and critical image vulnerabilities, and the workflow uploads a CycloneDX image SBOM as a 30-day artifact.

The image is published only after the upstream CI workflow succeeds and the container security job succeeds. A manual publish is still restricted to `main` or `preview` by the source-resolution step.

## Prisma/deepmerge-ts remediation requirement

The repository baseline previously resolved `deepmerge-ts@7.1.5` through Prisma 6.19.3. That produced three high-severity instances of GHSA-ggr8-5vv4-36mx (recursive-object-graph stack exhaustion), and the same Prisma CLI dependency closure is copied into the production image.

The current workspace contains a dependency override resolving `deepmerge-ts` to 8.0.1, and the current `npm audit --audit-level=high` passes. This does not justify weakening the gate: if a branch or lockfile returns the vulnerable version, the audit and release gates must fail. Remediation requires an approved Prisma/deepmerge-ts upgrade or override, followed by a fresh lockfile install and reruns of dependency, migration, test, build, and image gates. Do not apply `npm audit fix --force` blindly; review any Prisma version change for compatibility.

## Current verification note

The local release candidate passes the application verification sequence, the
production build, the full unit/integration suite, and the local Chromium E2E
smoke suite. The browser suite is intentionally local-only and uses the
development demo login; production OAuth, Cloudflare/Kubernetes probes,
external security review, and counsel approval remain release gates outside
the repository test suite.

## Repository settings required

Configure branch protection so the CI, CodeQL, Secret scan, and any release image security checks required by the deployment branch are required status checks. Enable GitHub secret scanning and push protection in repository security settings where the plan supports them; the workflow scan is a CI backstop and does not enable those repository features.
