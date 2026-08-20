# Jobmark

Jobmark stores and organizes your work notes and connects them to the AI assistant you choose through MCP (Model Context Protocol). It uses Next.js 16 (App Router), Auth.js, Prisma, and PostgreSQL.

## Overview

Jobmark is a personal career management platform that lets you:

- **Save work notes** — Quick capture of daily work, wins, and metrics
- **Organize projects** — Group related work with colors, archives, and progress tracking
- **Set goals** — Track progress against measurable career objectives
- **Build review drafts** — Weekly, monthly, and quarterly drafts from your notes
- **Manage your network** — CRM-lite for professional contacts and interactions
- **Draft outreach** — Editable messages built from your saved conversations
- **Focus & decompress** — Guided breathing, intention-setting, and affirmations
- **Connect your assistant** — Use Jobmark through Claude, ChatGPT, Gemini, or another MCP-compatible assistant

## Architecture

Jobmark no longer operates an internal chat product. Instead, it exposes every capability through a **standards-compliant MCP server** with a compliant **OAuth 2.1 provider**:

- **MCP Endpoint**: `POST /mcp` (Streamable HTTP)
- **OAuth Authorization**: `/api/auth/mcp/authorize` (PKCE, `authorization_code` + `refresh_token`)
- **OAuth Token**: `/api/auth/mcp/token`
- **OAuth Revocation**: `/api/auth/mcp/revoke` (RFC 7009)
- **OAuth Introspection**: `/api/auth/mcp/introspect` (RFC 7662)
- **JWKS**: `/api/auth/mcp/jwks` (RS256, 24h rotation)
- **Discovery**: `/.well-known/oauth-authorization-server` + `/.well-known/oauth-protected-resource`

**Connection Page**: `/settings/connections` — Add Jobmark to Claude, ChatGPT, or Gemini

**Scopes**: `jobmark:read`, `jobmark:write`, `jobmark:destructive`, `offline_access`

**Vault**: Per-connection locking; unlock via short-lived one-time browser flow (`/mcp/vault/unlock?token=...`)

**Idempotency**: `Idempotency-Key` header on mutating calls (24h TTL)

**Rate Limits**: 120 req/min per connection (burst 20); OAuth endpoints limited per IP

## Requirements

- Node.js 22
- npm
- PostgreSQL 14+
- Google OAuth credentials for sign-in

Copy `.env.example` to `.env.local` and fill in the required values. Never commit real environment files or credentials.

## Local development

```bash
cp .env.example .env.local
npm ci
npm run db:migrate:deploy
npm run dev
```

Open http://localhost:3000. Confirm `DATABASE_URL` points to the development database before any
Prisma command. For schema changes, edit `prisma/schema.prisma`, create a migration with
`npm run db:migrate:dev -- --name <description>`, and apply committed migrations with
`npm run db:migrate:deploy`.

## Verification and production build

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

The build enables Next.js standalone output for the Docker image. Build and run it with:

```bash
docker compose build
docker compose up
```

Compose expects runtime secrets through `.env`; migrations should be applied explicitly before starting production traffic.

## Kubernetes delivery

The production and preview deployments use the GitOps repository rather than
Vercel:

- pushes to `main` publish `ghcr.io/astatide1337/jobmark:main`;
- pushes to `preview` publish `ghcr.io/astatide1337/jobmark:preview`;
- Argo CD deploys the image only after its channel tag is promoted to the
  immutable `tag@sha256:digest` form in GitOps;
- the production namespace uses Neon’s `production` branch, while the preview
  namespace uses Neon’s `dev` branch;
- Prisma migrations run from the same image in an Argo pre-sync Job, using the
  direct Neon endpoint and the namespace-local runtime Secret.

The Kubernetes runtime Secrets are SOPS-encrypted in GitOps. Do not copy the
Vercel environment file into the cluster: local Vercel pulls can contain stale
Neon endpoint values, and preview must never point at the production branch.

## MCP Integration

### Quick Start (Claude Desktop)

1. Open Jobmark at `/settings/connections` and click "Connect" for Claude
2. Complete OAuth authorization
3. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jobmark": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000/mcp"],
      "env": {
        "MCP_AUTH_SERVER": "http://localhost:3000/api/auth/mcp"
      }
    }
  }
}
```

### Available tools

The authorized `tools/list` response is the exact tool catalog. Definitions live
in `lib/mcp/tools/` and cover notes, projects, goals, review drafts, contacts,
conversations, outreach drafts, Focus, settings, and private projects.

Export and account deletion remain browser-only Settings → Data flows. The MCP
connection can clear notes only after explicit confirmation.

## Assistant handoffs and privacy

Jobmark creates review drafts, outreach messages, and small text cleanups from the record you keep here. These first drafts are deterministic and do not require an external model service. When you choose a connected assistant, Jobmark hands it the relevant draft or record context; the provider then handles the content under its own terms and privacy policy. Activity, report, project, and vault visibility follows the authenticated user and vault state.

Vault unlock cookies are user-bound, expire, and are invalidated when the vault password version changes. Exports use an explicit allowlist and omit hashes, encrypted keys, tokens, and cryptographic state.

Jobmark has no internal chat route; Connect AI lives at `/settings/connections`.
