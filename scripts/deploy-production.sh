#!/usr/bin/env bash

set -u

echo ""
echo "========================================"
echo "🚀 Production Deployment"
echo "========================================"

echo ""
echo "📥 Pulling latest code..."

# git fetch origin main
# git checkout main
# git reset --hard origin/main

echo ""
echo "🐳 Building production containers..."

# docker compose \
#   -f docker-compose.production.yml \
#   build

echo ""
echo "🛑 Stopping old production containers..."

# docker compose \
#   -f docker-compose.production.yml \
#   down \
#   --remove-orphans

echo ""
echo "🚀 Starting production..."

# docker compose \
#   -f docker-compose.production.yml \
#   up -d

echo ""
echo "🔍 Checking production containers..."

# docker compose \
#   -f docker-compose.production.yml \
#   ps

echo ""
echo "========================================"
echo "✅ Production deployment completed"
echo "========================================"
echo ""