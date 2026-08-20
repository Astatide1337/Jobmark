# Jobmark agent instructions

System, developer, and user instructions take precedence over this file. Keep work scoped to the
request, preserve unrelated changes, and inspect `git status` before editing.

## Product contract

Jobmark is a personal work-record app for notes, projects, goals, review drafts, professional
contacts, Focus sessions, and connections to external AI assistants.

- The app uses Next.js 16 App Router, React 19, strict TypeScript, Node.js 22, npm, Prisma, and
  PostgreSQL. Auth.js uses Google in normal environments; the Demo User credentials provider is
  development-only.
- There is no internal chat product or `/chat` route. Connect AI is `/settings/connections` and
  exposes Jobmark through the Streamable HTTP MCP endpoint at `/mcp`. Contact conversations are a
  separate feature.
- Keep public copy accurate: say “note,” “project,” “review draft,” “conversation,” “focus session,”
  and “AI assistant.” Do not imply built-in chat, fabricated usage, or capabilities that do not
  exist in the current routes and UI.
- Preview and production are GitOps/Argo CD deployments using immutable GHCR image digests. A local
  build or an unpinned image tag is not deployment evidence.

## Working rules

- Make the smallest coherent change. Prefer reversible edits and focused commits; do not reset,
  rewrite history, force-push, or broadly delete files unless the user names the exact scope.
- Do not commit secrets, `.env` files, credentials, tokens, database URLs, generated output, or
  browser artifacts. Never add a Codex co-author or session trailer.
- If ownership, authorization, environment, deletion scope, or production target is unclear, stop
  and report the ambiguity. Access is not permission to mutate external systems.
- For cleanup, inventory references first. Preserve working public routes and article slugs unless
  the request explicitly changes them.

## Architecture and UI

- Prefer server components and server-fetched first paint. Keep domain rules in typed server-only
  modules under `lib/`; server actions and MCP tools should call those rules instead of duplicating
  authorization or validation.
- Derive the authenticated actor on the server with `auth()`/`requireUserId()`. Never trust a
  caller-supplied user ID for tenant selection. Validate external input with existing Zod schemas;
  keep types explicit and never use `any`.
- Keep render functions pure. Use effects only for external subscriptions, timers, browser APIs, or
  unavoidable post-commit synchronization, and clean them up. Prefer local state/revalidation/router
  navigation over `window.location.reload()`.
- Use `DashboardShell` for authenticated pages; Focus is the documented distraction-free exception.
  Reuse shared UI primitives and semantic tokens from `app/globals.css` and `lib/themes.ts`. Do not
  introduce one-off controls, hard-coded semantic colors, dynamic Tailwind class construction, or
  default `transition-all`/scroll hijacking.
- Preserve purposeful motion, first-paint content, keyboard access, responsive layouts, and reduced-
  motion behavior. For UI changes, check desktop and mobile widths, keyboard use, reduced motion,
  overflow/layout shifts, and browser-console errors.

## Data and security

- Enforce ownership for every read, write, export, delete, project, contact, report, and MCP action;
  linked records must belong to the authenticated actor. Preserve user-timezone semantics for dates,
  streaks, heatmaps, and reports.
- Preserve MCP OAuth 2.1 protections: discovery, PKCE, scopes, origin validation, rate limits,
  idempotency, refresh-token rotation, and destructive-action confirmation. Keep vault state bound to
  the user, expiring, and invalidated on password-version changes.
- Never log passwords, keys, OAuth tokens, cookies, full notes, contact details, tool arguments, or
  full tool results. Keep client secrets and provider credentials out of browser bundles and source.
- Keep `/api/health/live` and `/api/health/ready` bounded, uncached, request-correlated, and free of
  stack traces or sensitive data. Export and account deletion remain allow-listed, exact-confirmation
  flows; E2E must not submit their final irreversible actions.

## Database and operations

- Use the development PostgreSQL database from `.env.local`. Verify `DATABASE_URL` before schema
  work; never point Prisma at production. Use the guarded scripts `npm run db:push`,
  `npm run db:migrate:dev`, `npm run db:migrate:deploy`, and `npm run db:migrate:resolve`.
- Commit migrations, never edit an applied migration, and validate both web and MCP paths that use a
  changed schema. `prisma generate` is safe without a database; `db:studio` requires a disposable
  development target.
- Do not weaken lint, type, security, dependency, or migration gates to make a check pass. Do not
  mutate branches, issues, PRs, packages, deployments, DNS, credentials, or production data without
  explicit scope and a reversible plan.

## Verification and handoff

Use Node 22 and the lockfile. For normal application changes run:

```bash
npm ci
npm run verify
npm test
npm run build
```

Use Playwright only against local `localhost`/`127.0.0.1` with marked Demo User data; never use
preview or production credentials/databases. Run route-specific manual checks for UI or auth/MCP
changes. Before handoff, review `git diff --check`, list changed files, report exact commands and
results, and state any unverified limitation. Do not claim a test, deployment, or security check that
was not actually run.

## Git safety

Develop on a feature branch. `main` and `preview` are protected; release through reviewed GitHub
PRs and required checks. Keep commits focused and explain behavior changes. Never use destructive
history operations or broad filesystem deletes without explicit authorization.
