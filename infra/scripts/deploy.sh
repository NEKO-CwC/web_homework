#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"

cd "$PROJECT_ROOT"

if [ ! -f ".env" ]; then
  echo "Missing .env in $PROJECT_ROOT. CI should copy GitHub Secrets to this file before deploy." >&2
  exit 1
fi

git fetch --prune "$REMOTE" "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

docker compose build storefront migrate
docker compose run --rm migrate
docker compose up -d --no-deps storefront
docker compose ps
