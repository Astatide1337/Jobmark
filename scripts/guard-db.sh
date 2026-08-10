#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check env var first, then .env file (Prisma reads .env directly)
URL="${DATABASE_URL:-}"
if [[ -z "$URL" && -f ".env" ]]; then
  URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
fi

if [[ -z "$URL" ]]; then
  echo -e "${RED}ERROR: DATABASE_URL is not set anywhere${NC}" >&2
  exit 1
fi

PROD_ENDPOINTS=("ep-dark-lab-avoeezwk" "ep-dark-lab-avoeezwk-pooler")

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
