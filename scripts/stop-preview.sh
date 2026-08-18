#!/usr/bin/env bash

set -euo pipefail

PR_NUMBER="${1:-}"

if [[ -z "$PR_NUMBER" ]]; then
  echo "Usage: ./scripts/stop-preview.sh <pr-number>"
  exit 1
fi

PROJECT_NAME="pr-${PR_NUMBER}"
CADDY_ROUTE_ID="pr-${PR_NUMBER}"
CADDY_ADMIN="http://127.0.0.1:2019"

echo "🧹 Removing preview for PR #${PR_NUMBER}"

if ! docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then
  echo "⚠️ preview-caddy is not running"
else

  echo "⏳ Checking Caddy Admin API..."

  if curl -fsS \
    "${CADDY_ADMIN}/config/" \
    >/dev/null 2>&1; then

    echo "✓ Caddy Admin API is available"

    echo "🗑️ Removing Caddy route..."

    if curl -fsS \
      -X DELETE \
      "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
      >/dev/null 2>&1; then

      echo "✓ Caddy route removed"

    else

      echo "ℹ️ Caddy route did not exist"

    fi

  else

    echo "⚠️ Caddy Admin API is unavailable"

  fi

fi

echo "🐳 Removing PR containers..."

if docker compose \
  -p "$PROJECT_NAME" \
  down \
  --remove-orphans; then

  echo "✓ PR containers removed"
else

  echo "⚠️ PR containers were not running"

fi

echo ""
echo "========================================"
echo " Preview removed"
echo "========================================"
echo "PR: #${PR_NUMBER}"
echo "========================================"