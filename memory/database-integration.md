---
name: Database Integration
description: Verified real PostgreSQL integration status and operational notes.
metadata:
  type: reference
updated_at: 2026-05-29
last_verified_scope: "Prisma connection, migration status, seed verification, and business smoke verification for schema web_homework"
---

# Database Integration

The hosted PostgreSQL database is reachable with Prisma when `DATABASE_URL` includes `?schema=web_homework`.

Verified on 2026-05-29:
- `current_database()` returned `default`.
- `current_schema()` returned `web_homework`.
- `current_user` returned the project database user.
- `prisma migrate status --schema prisma/schema.prisma` reported the database schema is up to date.
- `pnpm --dir packages/db db:verify` passed against the hosted database.
- `pnpm prisma:smoke` passed against the hosted database. The script creates a temporary customer, runs checkout, virtual payment, merchant shipment, receipt confirmation, and review through `PrismaMallWriteService`, then cleans temporary records and restores product stock.

Safety note: `packages/db/prisma/seed.ts` starts by deleting application tables in the selected schema before recreating seed data. Do not run `pnpm db:seed` against a shared or user-populated database unless resetting that schema is intended.
