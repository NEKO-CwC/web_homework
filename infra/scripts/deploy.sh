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

eval "$(
  node <<'NODE'
const fs = require("fs");
const env = {};
for (const rawLine of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const index = line.indexOf("=");
  if (index === -1) continue;
  const key = line.slice(0, index).trim();
  let value = line.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}
for (const key of ["DATABASE_URL", "AUTH_SESSION_SECRET", "MALL_WRITE_MODE"]) {
  if (env[key] !== undefined) {
    console.log(`export ${key}=${JSON.stringify(env[key])}`);
  }
}
NODE
)"

case "${DATABASE_URL:-}" in
  ""|*"USER"*|*"PASSWORD"*|*"HOST"*)
    echo "DATABASE_URL must be a real PostgreSQL URL, not a placeholder." >&2
    exit 1
    ;;
esac

case "${DATABASE_URL:-}" in
  *"schema=web_homework"*) ;;
  *)
    echo "DATABASE_URL must include schema=web_homework for production deploy." >&2
    exit 1
    ;;
esac

if [ -z "${AUTH_SESSION_SECRET:-}" ]; then
  echo "AUTH_SESSION_SECRET is required." >&2
  exit 1
fi

if [ "${MALL_WRITE_MODE:-prisma}" != "prisma" ]; then
  echo "MALL_WRITE_MODE must be prisma for production deploy." >&2
  exit 1
fi

git fetch --prune "$REMOTE" "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

docker compose build storefront migrate
docker compose run --rm migrate
docker compose up -d --no-deps storefront
docker compose ps
