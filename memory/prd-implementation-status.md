---
name: PRD Implementation Status
description: Durable status boundary for PRD implementation coverage.
metadata:
  type: workflow
updated_at: 2026-05-29
last_verified_scope: "docs/PRD.md Compose/CI deployment scope plus docs/PRD_AUDIT.md application-side audit"
---

# PRD Implementation Status

`docs/PRD_AUDIT.md` records the current requirement-by-requirement audit for `docs/PRD.md`.

As of 2026-05-29, REQ-001 through REQ-024, local non-functional gates, Docker Compose orchestration, and GitHub Actions SSH deployment are treated as satisfied by code and focused verification.

Compose is defined at repo root in `compose.yaml`. Production defaults to external PostgreSQL via `DATABASE_URL`; the `postgres` service is optional behind the `postgres` profile, and `storefront` maps host port `4862` to container port `3000`. The `migrate` service runs Prisma `migrate deploy`.

GitHub Actions deployment is defined in `.github/workflows/deploy.yml`. Pull requests run install, Prisma client generation, lint, typecheck, tests, and build. Pushes to `main` run the same verification, copy GitHub Secrets into the server `.env`, SSH to `SSH_DEPLOY_PATH`, then execute `infra/scripts/deploy.sh` to pull `main`, build images, run migrations, and restart Compose.
