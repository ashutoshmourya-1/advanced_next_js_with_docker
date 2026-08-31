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

echo ""
echo "========================================"
echo "🧹 Cleaning Preview PR #${PR_NUMBER}"
echo "========================================"

echo ""
echo "🔀 Step 1: Removing Caddy route..."

if docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then

  if curl -fsS "${CADDY_ADMIN}/config/" >/dev/null 2>&1; then

    echo "✓ Caddy Admin API available"

    if curl -fsS \
      "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
      >/dev/null 2>&1; then

      echo "🗑️ Removing route: ${CADDY_ROUTE_ID}"

      curl -fsS \
        -X DELETE \
        "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
        >/dev/null

      echo "✓ Caddy route removed"

    else

      echo "ℹ️ Caddy route ${CADDY_ROUTE_ID} does not exist"

    fi

  else

    echo "⚠️ Caddy Admin API unavailable"
    echo "   Continuing Docker cleanup..."

  fi

else

  echo "⚠️ preview-caddy is not running"
  echo "   Continuing Docker cleanup..."

fi


echo ""
echo "🔍 Step 2: Verifying Caddy route cleanup..."

if docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then

  if curl -fsS \
    "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
    >/dev/null 2>&1; then

    echo "❌ Caddy route still exists!"
    echo "   Refusing to continue silently."

    curl -s \
      "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
      | jq . || true

    exit 1

  else

    echo "✓ Caddy route confirmed removed"

  fi

fi

echo ""
echo "🐳 Step 3: Removing PR Docker stack..."

if docker compose \
  -p "$PROJECT_NAME" \
  down \
  --remove-orphans \
  --volumes; then

  echo "✓ PR containers/network/volumes removed"

else

  echo "⚠️ Compose cleanup returned non-zero"
fi

echo ""
echo "🧨 Step 4: Removing leftover PR containers..."

LEFTOVER_CONTAINERS="$(
  docker ps -aq \
    --filter "name=${PROJECT_NAME}-" \
    2>/dev/null || true
)"

if [[ -n "$LEFTOVER_CONTAINERS" ]]; then

  docker rm -f $LEFTOVER_CONTAINERS

  echo "✓ Leftover PR containers removed"

else

  echo "✓ No leftover PR containers"

fi


echo ""
echo "🌐 Step 5: Removing leftover PR networks..."

PR_NETWORKS="$(
  docker network ls \
    --format '{{.Name}}' \
    | grep -E "^${PROJECT_NAME}_" \
    || true
)"

if [[ -n "$PR_NETWORKS" ]]; then

  echo "$PR_NETWORKS" | while read -r NETWORK; do
    echo "🗑️ Removing network: $NETWORK"
    docker network rm "$NETWORK" >/dev/null 2>&1 || true
  done

  echo "✓ PR networks cleaned"

else

  echo "✓ No leftover PR networks"

fi

echo ""
echo "🖼️ Step 6: Removing PR images..."

PR_IMAGES="$(
  docker images \
    --format '{{.Repository}}:{{.Tag}}' \
    | grep -E "^${PROJECT_NAME}-" \
    || true
)"

if [[ -n "$PR_IMAGES" ]]; then

  echo "$PR_IMAGES" | while read -r IMAGE; do
    echo "🗑️ Removing image: $IMAGE"
    docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
  done

else

  echo "✓ No PR images found"

fi

echo ""
echo "🔎 Step 7: Checking leftover PR image IDs..."

PR_IMAGE_IDS="$(
  docker images -aq \
    | while read -r IMAGE_ID; do
        docker inspect \
          --format '{{join .RepoTags "\n"}}' \
          "$IMAGE_ID" 2>/dev/null \
          | grep -E "^${PROJECT_NAME}-" \
          >/dev/null \
          && echo "$IMAGE_ID"
      done \
    | sort -u
)"

if [[ -n "$PR_IMAGE_IDS" ]]; then

  docker image rm -f $PR_IMAGE_IDS >/dev/null 2>&1 || true

  echo "✓ Leftover PR images removed"

else

  echo "✓ No leftover PR image IDs"

fi

echo ""
echo "💾 Step 8: Removing leftover PR volumes..."

PR_VOLUMES="$(
  docker volume ls \
    --format '{{.Name}}' \
    | grep -E "^${PROJECT_NAME}_" \
    || true
)"

if [[ -n "$PR_VOLUMES" ]]; then

  echo "$PR_VOLUMES" | while read -r VOLUME; do
    echo "🗑️ Removing volume: $VOLUME"
    docker volume rm "$VOLUME" >/dev/null 2>&1 || true
  done

  echo "✓ PR volumes cleaned"

else

  echo "✓ No leftover PR volumes"

fi


echo ""
echo "🧽 Step 9: Removing dangling Docker artifacts..."

docker image prune -f >/dev/null 2>&1 || true
docker container prune -f >/dev/null 2>&1 || true
docker network prune -f >/dev/null 2>&1 || true

echo "✓ Dangling Docker artifacts cleaned"


echo ""
echo "🔍 Step 10: Final verification..."

echo ""
echo "Containers:"
if docker ps -a \
  --format '{{.Names}}' \
  | grep -E "^${PROJECT_NAME}-" ; then

  echo "❌ PR containers still exist"

else

  echo "✓ No PR containers"

fi


echo ""
echo "Images:"
if docker images \
  --format '{{.Repository}}:{{.Tag}}' \
  | grep -E "^${PROJECT_NAME}-" ; then

  echo "❌ PR images still exist"

else

  echo "✓ No PR images"

fi


echo ""
echo "Networks:"
if docker network ls \
  --format '{{.Name}}' \
  | grep -E "^${PROJECT_NAME}_" ; then

  echo "❌ PR networks still exist"

else

  echo "✓ No PR networks"

fi


echo ""
echo "Volumes:"
if docker volume ls \
  --format '{{.Name}}' \
  | grep -E "^${PROJECT_NAME}_" ; then

  echo "❌ PR volumes still exist"

else

  echo "✓ No PR volumes"

fi


if docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then

  echo ""
  echo "Caddy route:"

  if curl -fsS \
    "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
    >/dev/null 2>&1; then

    echo "❌ Caddy route STILL EXISTS"

    curl -s \
      "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
      | jq . || true

    exit 1

  else

    echo "✓ Caddy route removed"

  fi

fi


echo ""
echo "========================================"
echo "✅ Preview cleanup completed"
echo "========================================"
echo "PR: #${PR_NUMBER}"
echo "========================================"
echo ""