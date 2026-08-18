#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Next.js local development uses .env.local, while the repository's .env file
# may contain the deployment database. Prefer the local override whenever it
# exists so a routine development migration cannot accidentally target prod.
URL="${DATABASE_URL:-}"
if [[ -z "$URL" && -f ".env.local" ]]; then
  URL=$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2-)
fi
if [[ -z "$URL" && -f ".env" ]]; then
  URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
fi

if [[ -z "$URL" ]]; then
  echo -e "${RED}ERROR: DATABASE_URL is not set anywhere${NC}" >&2
  exit 1
fi

PROD_ENDPOINTS=(
  "ep-winter-star-ah9jvaa7"
  "ep-winter-star-ah9jvaa7-pooler"
  "ep-dark-lab-avoeezwk"
  "ep-dark-lab-avoeezwk-pooler"
)

for ep in "${PROD_ENDPOINTS[@]}"; do
  if echo "$URL" | grep -F -q "$ep"; then
    echo -e "${RED}████████████████████████████████████████████████████████████████████████${NC}" >&2
    echo -e "${RED}██  BLOCKED: DATABASE_URL points to PRODUCTION database              ██${NC}" >&2
    echo -e "${RED}██  This endpoint is reserved for Vercel deploys only.               ██${NC}" >&2
    echo -e "${RED}██  For local dev, set DATABASE_URL to the dev branch in .env.local   ██${NC}" >&2
    echo -e "${RED}████████████████████████████████████████████████████████████████████████${NC}" >&2
    exit 1
  fi
done

echo -e "✓ DATABASE_URL is safe (not production)" >&2

# When invoked as a wrapper, carry the validated URL into Prisma. A separate
# `npm run db:guard && prisma ...` command cannot export variables to the next
# process, so keeping the check and migration in one process is essential.
if [[ "$#" -gt 0 ]]; then
  export DATABASE_URL="$URL"
  exec "$@"
fi
