# Jobmark contributor notes

Jobmark is a personal career record: people capture accomplishments, organize them
into projects, prepare reviews, and connect the record to the assistant they choose
through MCP.

Read [`docs/frontend-standards.md`](docs/frontend-standards.md) before changing UI.
It is the single source of truth for rendering, motion, accessibility, theme tokens,
component boundaries, and validation.

## Architecture

- Next.js App Router with TypeScript and Prisma/PostgreSQL.
- Auth.js with Google authentication and development-only login fixtures.
- Tailwind CSS, Radix UI, Framer Motion, Recharts, and Lucide icons.
- Domain logic belongs in server actions or focused `lib/` modules.
- MCP is a standards-compliant Streamable HTTP server with OAuth 2.1 and PKCE.

## Data safety

Never run Prisma push or migration commands against production. Use the guarded
repository scripts (`npm run db:push`, `npm run db:migrate:dev`, and related commands)
and verify the target database before any schema operation.

## Before handoff

Run `npm run verify`, `npm test`, and `npm run build`. If the change affects a page,
test that route at desktop and mobile widths and check the browser console for errors.

Do not add `Co-Authored-By: Codex` or `Codex-Session` trailers to commits.
