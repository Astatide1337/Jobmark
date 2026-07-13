# JobMark

JobMark is a private career operating system for recording work evidence,
organizing projects and goals, generating reports, and getting AI career-coach
support. It uses Next.js App Router, Auth.js, Prisma, and PostgreSQL.

## Requirements

- Node.js 22
- npm
- PostgreSQL 14+
- Google OAuth credentials for sign-in

Copy `.env.example` to `.env.local` and fill in the required values. Never
commit real environment files or credentials.

## Local development

```bash
cp .env.example .env.local
npm ci
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000. For schema changes, edit `prisma/schema.prisma`,
create a migration with `npx prisma migrate dev --name <description>`, and
apply committed migrations with `npx prisma migrate deploy`.

## Verification and production build

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

The build enables Next.js standalone output for the Docker image. Build and
run it with:

```bash
docker compose build
docker compose up
```

Compose expects runtime secrets through `.env`; migrations should be applied
explicitly before starting production traffic.

The migration history includes compatibility steps for older databases whose
initial schema omitted `UserSettings` and the network/chat models. Run
`prisma migrate deploy` from a clean checkout; do not use `db push` for
production data.

## AI and privacy

Users can save encrypted provider keys in Settings, or the server can use one
of the optional provider environment variables. AI inputs are bounded and
provider failures are returned as safe generic errors. Activity, report,
project, and vault visibility follows the authenticated user and vault state.

Vault unlock cookies are user-bound, expire, and are invalidated when the vault
password version changes. Exports use an explicit allowlist and omit hashes,
encrypted keys, tokens, and cryptographic state.
