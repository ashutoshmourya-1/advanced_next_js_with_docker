```bash
#!/usr/bin/env bash

set -u

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


# ============================================================
# STEP 1 — REMOVE CADDY ROUTE
# ============================================================

echo ""
echo "🔀 Step 1: Removing Caddy route..."

if docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then

  if curl -fsS "${CADDY_ADMIN}/config/" >/dev/null 2>&1; then

    echo "✓ Caddy Admin API available"

    if curl -fsS \
      "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
      >/dev/null 2>&1; then

      echo "🗑️ Removing route: ${CADDY_ROUTE_ID}"

      if curl -fsS \
        -X DELETE \
        "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
        >/dev/null 2>&1; then

        echo "✓ Caddy route removed"

      else

        echo "⚠️ Failed to remove Caddy route"

      fi

    else

      echo "✓ Caddy route ${CADDY_ROUTE_ID} does not exist"

    fi

  else

    echo "⚠️ Caddy Admin API unavailable"
    echo "   Continuing Docker cleanup..."

  fi

else

  echo "⚠️ preview-caddy is not running"
  echo "   Continuing Docker cleanup..."

fi


# ============================================================
# STEP 2 — VERIFY CADDY ROUTE
# ============================================================

echo ""
echo "🔍 Step 2: Verifying Caddy route cleanup..."

if docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then

  if curl -fsS \
    "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
    >/dev/null 2>&1; then

    echo "❌ Caddy route STILL EXISTS"

    curl -s \
      "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
      | jq . 2>/dev/null || true

    exit 1

  else

    echo "✓ Caddy route confirmed removed"

  fi

else

  echo "✓ Caddy is not running; route cannot exist"

fi


# ============================================================
# STEP 3 — REMOVE DOCKER COMPOSE STACK
# ============================================================

echo ""
echo "🐳 Step 3: Removing PR Docker stack..."

docker compose \
  -p "$PROJECT_NAME" \
  down \
  --remove-orphans \
  --volumes \
  --timeout 10 \
  >/dev/null 2>&1 || true

echo "✓ Compose cleanup completed"


# ============================================================
# STEP 4 — REMOVE LEFTOVER CONTAINERS
# ============================================================

echo ""
echo "🧨 Step 4: Removing leftover PR containers..."

LEFTOVER_CONTAINERS="$(
  docker ps -aq \
    --filter "name=${PROJECT_NAME}-" \
    2>/dev/null || true
)"

if [[ -n "$LEFTOVER_CONTAINERS" ]]; then

  echo "$LEFTOVER_CONTAINERS" | while read -r CONTAINER_ID; do

    [[ -z "$CONTAINER_ID" ]] && continue

    CONTAINER_NAME="$(
      docker inspect \
        --format '{{.Name}}' \
        "$CONTAINER_ID" \
        2>/dev/null \
        | sed 's#^/##' \
        || true
    )"

    echo "🗑️ Removing container: ${CONTAINER_NAME:-$CONTAINER_ID}"

    docker rm -f "$CONTAINER_ID" >/dev/null 2>&1 || true

  done

  echo "✓ Leftover PR containers removed"

else

  echo "✓ No leftover PR containers"

fi


# ============================================================
# STEP 5 — REMOVE LEFTOVER NETWORKS
# ============================================================

echo ""
echo "🌐 Step 5: Removing leftover PR networks..."

PR_NETWORKS="$(
  docker network ls \
    --format '{{.Name}}' \
    2>/dev/null \
    | grep -E "^${PROJECT_NAME}_" \
    || true
)"

if [[ -n "$PR_NETWORKS" ]]; then

  while read -r NETWORK; do

    [[ -z "$NETWORK" ]] && continue

    echo "🗑️ Removing network: $NETWORK"

    docker network rm "$NETWORK" >/dev/null 2>&1 || true

  done <<< "$PR_NETWORKS"

  echo "✓ PR networks cleaned"

else

  echo "✓ No leftover PR networks"

fi


# ============================================================
# STEP 6 — REMOVE PR IMAGES
# ============================================================

echo ""
echo "🖼️ Step 6: Removing PR images..."

PR_IMAGES="$(
  docker images \
    --format '{{.Repository}}:{{.Tag}}' \
    2>/dev/null \
    | grep -E "^${PROJECT_NAME}-" \
    || true
)"

if [[ -n "$PR_IMAGES" ]]; then

  while read -r IMAGE; do

    [[ -z "$IMAGE" ]] && continue

    echo "🗑️ Removing image: $IMAGE"

    docker image rm -f "$IMAGE" >/dev/null 2>&1 || {
      echo "⚠️ Could not remove image: $IMAGE"
    }

  done <<< "$PR_IMAGES"

else

  echo "✓ No PR images found"

fi


# ============================================================
# STEP 7 — REMOVE PR IMAGE IDs
# ============================================================

echo ""
echo "🔎 Step 7: Checking leftover PR image IDs..."

PR_IMAGE_IDS="$(
  docker images -aq \
    2>/dev/null \
    | while read -r IMAGE_ID; do

        [[ -z "$IMAGE_ID" ]] && continue

        docker inspect \
          --format '{{join .RepoTags "\n"}}' \
          "$IMAGE_ID" \
          2>/dev/null \
          | grep -E "^${PROJECT_NAME}-" \
          >/dev/null 2>&1 \
          && echo "$IMAGE_ID"

      done \
    | sort -u \
    || true
)"

if [[ -n "$PR_IMAGE_IDS" ]]; then

  while read -r IMAGE_ID; do

    [[ -z "$IMAGE_ID" ]] && continue

    echo "🗑️ Removing leftover image ID: $IMAGE_ID"

    docker image rm -f "$IMAGE_ID" >/dev/null 2>&1 || {
      echo "⚠️ Could not remove image ID: $IMAGE_ID"
    }

  done <<< "$PR_IMAGE_IDS"

else

  echo "✓ No leftover PR image IDs"

fi


# ============================================================
# STEP 8 — REMOVE PR VOLUMES
# ============================================================

echo ""
echo "💾 Step 8: Removing leftover PR volumes..."

PR_VOLUMES="$(
  docker volume ls \
    --format '{{.Name}}' \
    2>/dev/null \
    | grep -E "^${PROJECT_NAME}_" \
    || true
)"

if [[ -n "$PR_VOLUMES" ]]; then

  while read -r VOLUME; do

    [[ -z "$VOLUME" ]] && continue

    echo "🗑️ Removing volume: $VOLUME"

    docker volume rm "$VOLUME" >/dev/null 2>&1 || {
      echo "⚠️ Could not remove volume: $VOLUME"
    }

  done <<< "$PR_VOLUMES"

  echo "✓ PR volumes cleaned"

else

  echo "✓ No leftover PR volumes"

fi


# ============================================================
# STEP 9 — REMOVE DANGLING ARTIFACTS
# ============================================================

echo ""
echo "🧽 Step 9: Removing dangling Docker artifacts..."

docker image prune -f >/dev/null 2>&1 || true
docker container prune -f >/dev/null 2>&1 || true
docker network prune -f >/dev/null 2>&1 || true

echo "✓ Dangling Docker artifacts cleaned"


# ============================================================
# STEP 10 — FINAL VERIFICATION
# ============================================================

echo ""
echo "🔍 Step 10: Final verification..."


CLEANUP_FAILED=0


# ----------------------------
# Containers
# ----------------------------

echo ""
echo "Containers:"

REMAINING_CONTAINERS="$(
  docker ps -a \
    --format '{{.Names}}' \
    2>/dev/null \
    | grep -E "^${PROJECT_NAME}-" \
    || true
)"

if [[ -n "$REMAINING_CONTAINERS" ]]; then

  echo "❌ PR containers still exist:"
  echo "$REMAINING_CONTAINERS"

  CLEANUP_FAILED=1

else

  echo "✓ No PR containers"

fi


# ----------------------------
# Images
# ----------------------------

echo ""
echo "Images:"

REMAINING_IMAGES="$(
  docker images \
    --format '{{.Repository}}:{{.Tag}}' \
    2>/dev/null \
    | grep -E "^${PROJECT_NAME}-" \
    || true
)"

if [[ -n "$REMAINING_IMAGES" ]]; then

  echo "❌ PR images still exist:"
  echo "$REMAINING_IMAGES"

  CLEANUP_FAILED=1

else

  echo "✓ No PR images"

fi


# ----------------------------
# Networks
# ----------------------------

echo ""
echo "Networks:"

REMAINING_NETWORKS="$(
  docker network ls \
    --format '{{.Name}}' \
    2>/dev/null \
    | grep -E "^${PROJECT_NAME}_" \
    || true
)"

if [[ -n "$REMAINING_NETWORKS" ]]; then

  echo "❌ PR networks still exist:"
  echo "$REMAINING_NETWORKS"

  CLEANUP_FAILED=1

else

  echo "✓ No PR networks"

fi


# ----------------------------
# Volumes
# ----------------------------

echo ""
echo "Volumes:"

REMAINING_VOLUMES="$(
  docker volume ls \
    --format '{{.Name}}' \
    2>/dev/null \
    | grep -E "^${PROJECT_NAME}_" \
    || true
)"

if [[ -n "$REMAINING_VOLUMES" ]]; then

  echo "❌ PR volumes still exist:"
  echo "$REMAINING_VOLUMES"

  CLEANUP_FAILED=1

else

  echo "✓ No PR volumes"

fi


# ----------------------------
# Caddy route
# ----------------------------

if docker ps --format '{{.Names}}' | grep -qx "preview-caddy"; then

  echo ""
  echo "Caddy route:"

  if curl -fsS \
    "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
    >/dev/null 2>&1; then

    echo "❌ Caddy route STILL EXISTS"

    curl -s \
      "${CADDY_ADMIN}/id/${CADDY_ROUTE_ID}" \
      | jq . 2>/dev/null || true

    CLEANUP_FAILED=1

  else

    echo "✓ Caddy route removed"

  fi

fi


# ============================================================
# FINAL RESULT
# ============================================================

echo ""

if [[ "$CLEANUP_FAILED" -ne 0 ]]; then

  echo "========================================"
  echo "❌ Preview cleanup FAILED"
  echo "========================================"
  echo "PR: #${PR_NUMBER}"
  echo "========================================"
  echo ""

  exit 1

fi


echo "========================================"
echo "✅ Preview cleanup completed"
echo "========================================"
echo "PR: #${PR_NUMBER}"
echo "========================================"
echo ""
```
