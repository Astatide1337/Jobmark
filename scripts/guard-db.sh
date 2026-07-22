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

PROD_ENDPOINTS=("ep-winter-star-ah9jvaa7" "ep-winter-star-ah9jvaa7-pooler")

for ep in "${PROD_ENDPOINTS[@]}"; do
  if echo "$URL" | grep -F -q "$ep"; then
    if [[ "${ALLOW_PRODUCTION:-}" == "1" ]]; then
      echo -e "${YELLOW}⚠  DATABASE_URL points to production — ALLOW_PRODUCTION=1 set, proceeding${NC}" >&2
      exit 0
    fi
    echo -e "${RED}████████████████████████████████████████████████████████████████████████${NC}" >&2
    echo -e "${RED}██  BLOCKED: DATABASE_URL points to PRODUCTION database              ██${NC}" >&2
    echo -e "${RED}██  This endpoint is reserved for production deploys only.           ██${NC}" >&2
    echo -e "${RED}██  Set ALLOW_PRODUCTION=1 to override (use with extreme care!)       ██${NC}" >&2
    echo -e "${RED}██  For local dev, set DATABASE_URL to the dev branch in .env.local   ██${NC}" >&2
    echo -e "${RED}████████████████████████████████████████████████████████████████████████${NC}" >&2
    exit 1
  fi
done

echo -e "✓ DATABASE_URL is safe (not production)" >&2
