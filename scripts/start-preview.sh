#!/usr/bin/env bash

set -euo pipefail

PR_NUMBER="${1:-}"

if [[ -z "$PR_NUMBER" ]]; then
  echo "Usage: ./scripts/start-preview.sh <pr-number>"
  exit 1
fi

PROJECT_NAME="pr-${PR_NUMBER}"
PREVIEW_HOST="pr-${PR_NUMBER}.localhost"

NEXT_CONTAINER="${PROJECT_NAME}-next_js-1"

CADDY_ADMIN="http://127.0.0.1:2019"
CADDY_SERVER_ID="srv0"
CADDY_ROUTE_ID="pr-${PR_NUMBER}"

echo "🚀 Starting preview for PR #${PR_NUMBER}"

if ! docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then
  echo "❌ preview-caddy is not running."
  echo "Start infrastructure first."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "advanced_next_js_with_docker-postgres-1"; then
  echo "❌ PostgreSQL is not running."
  echo "Start infrastructure first."
  exit 1
fi

echo "✓ Infrastructure is running"

echo "⏳ Checking Caddy Admin API..."

for i in {1..15}; do

  if curl -fsS \
    "${CADDY_ADMIN}/config/" \
    >/dev/null 2>&1; then

    echo "✓ Caddy Admin API is available"
    break
  fi

  sleep 1

  if [[ "$i" == "15" ]]; then
    echo "❌ Caddy Admin API is unavailable"
    exit 1
  fi

done

echo "⏳ Checking Caddy HTTP server..."

if ! curl -fsS \
  "${CADDY_ADMIN}/config/apps/http/servers/${CADDY_SERVER_ID}" \
  >/dev/null 2>&1; then

  echo "➕ Creating Caddy HTTP server..."

  curl -fsS \
    -X PUT \
    "${CADDY_ADMIN}/config/apps/http/servers/${CADDY_SERVER_ID}" \
    -H "Content-Type: application/json" \
    --data '{
      "listen": [":80"],
      "routes": []
    }'

  echo ""
  echo "✓ Caddy HTTP server created"

else

  echo "✓ Caddy HTTP server already exists"

fi

echo "🐳 Starting PR containers..."

docker compose \
  -p "$PROJECT_NAME" \
  up -d --build

echo "✓ PR containers started"

echo "⏳ Waiting for Node.js..."

NODE_CONTAINER="${PROJECT_NAME}-node_js-1"

for i in {1..30}; do

  STATUS="$(
    docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' \
      "$NODE_CONTAINER" 2>/dev/null || true
  )"

  if [[ "$STATUS" == "healthy" ]]; then
    echo "✓ Node.js is healthy"
    break
  fi

  if [[ "$STATUS" == "unhealthy" ]]; then
    echo "❌ Node.js became unhealthy"
    docker logs "$NODE_CONTAINER" --tail 50
    exit 1
  fi

  sleep 2

  if [[ "$i" == "30" ]]; then
    echo "❌ Node.js health check timed out"
    docker logs "$NODE_CONTAINER" --tail 50
    exit 1
  fi

done

if ! docker ps --format '{{.Names}}' | grep -qx "$NEXT_CONTAINER"; then

  echo "❌ Next.js container is not running"

  docker logs "$NEXT_CONTAINER" --tail 50 || true

  exit 1

fi

echo "✓ Next.js container is running"

echo "⏳ Waiting for Next.js..."

for i in {1..30}; do

  if docker inspect \
    --format '{{.State.Running}}' \
    "$NEXT_CONTAINER" 2>/dev/null | grep -qx "true"; then

    echo "✓ Next.js process is running"
    break

  fi

  sleep 2

  if [[ "$i" == "30" ]]; then

    echo "❌ Next.js did not start"

    docker logs "$NEXT_CONTAINER" --tail 50

    exit 1

  fi

done

echo "🧹 Removing existing Caddy route if present..."

curl -s \
  -X DELETE \
  "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
  >/dev/null 2>&1 || true

echo "✓ Existing route removed"

echo "➕ Adding Caddy route..."

curl -fsS \
  -X POST \
  "${CADDY_ADMIN}/config/apps/http/servers/${CADDY_SERVER_ID}/routes" \
  -H "Content-Type: application/json" \
  --data @- <<EOF
{
  "@id": "${CADDY_ROUTE_ID}",
  "match": [
    {
      "host": [
        "${PREVIEW_HOST}"
      ]
    }
  ],
  "handle": [
    {
      "handler": "reverse_proxy",
      "upstreams": [
        {
          "dial": "${NEXT_CONTAINER}:3000"
        }
      ]
    }
  ],
  "terminal": true
}
EOF

echo ""
echo "✓ Caddy route configured"

echo "🔍 Verifying Caddy route..."

if curl -fsS \
  "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
  >/dev/null 2>&1; then

  echo "✓ Caddy route verified"

else

  echo "❌ Caddy route was not created"

  echo ""
  echo "===== Caddy config ====="

  curl -s \
    "${CADDY_ADMIN}/config/" \
    | jq . || true

  exit 1

fi

echo "⏳ Checking preview through Caddy..."

for i in {1..30}; do

  HTTP_STATUS="$(
    curl -s \
      -o /dev/null \
      -w '%{http_code}' \
      -H "Host: ${PREVIEW_HOST}" \
      "http://127.0.0.1/" \
      || true
  )"

  if [[ "$HTTP_STATUS" != "000" && "$HTTP_STATUS" != "404" ]]; then

    echo "✓ Preview is responding with HTTP ${HTTP_STATUS}"

    echo ""
    echo "========================================"
    echo " Preview deployment ready"
    echo "========================================"
    echo "PR:  #${PR_NUMBER}"
    echo "URL: http://${PREVIEW_HOST}"
    echo "========================================"
    echo ""

    exit 0

  fi

  sleep 2

done

echo "❌ Preview did not become available"

echo ""
echo "===== Caddy route ====="

curl -s \
  "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
  | jq . || true

echo ""
echo "===== Caddy config ====="

curl -s \
  "${CADDY_ADMIN}/config/apps/http/servers/${CADDY_SERVER_ID}" \
  | jq . || true

echo ""
echo "===== Next.js container ====="

docker ps \
  --filter "name=${NEXT_CONTAINER}"

echo ""
echo "===== Next.js logs ====="

docker logs "$NEXT_CONTAINER" --tail 50

exit 1