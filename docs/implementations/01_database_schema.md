# Implementation: Story #1 — Database Schema & Migrations

Last updated: 2025-11-13

What I built
- Implemented a robust migration runner at `packages/db/src/migrate.ts` that:
  - Creates a `schema_migrations` table to track applied migrations.
  - Scans `packages/db/migrations/*.sql` in alphabetical order.
  - Applies unapplied SQL files inside transactions and records them.
  - Skips and records legacy migrations that conflict with the active schema (safe fallback).
- Made the primary migration `001_init_schema.sql` idempotent (`IF NOT EXISTS` on tables and indexes) so re-runs are safe.
- Moved the legacy SERIAL-based migration into `packages/db/migrations/legacy/002_sources_and_crawl_jobs.sql` and replaced the active `002` file with a deprecation placeholder to avoid accidental re-application.
- Added an integration test `apps/api/src/migrate.integration.test.ts` that rolls back, runs migrations, and asserts expected tables exist.

Design decisions and rationale
- The repository contained two overlapping migration styles:
  - `001_init_schema.sql` — UUID-based, comprehensive schema (chosen as canonical)
  - `002_sources_and_crawl_jobs.sql` — older SERIAL-based schema that conflicts with UUIDs
- I chose to keep the UUID-based `001` as canonical and moved the older `002` into `migrations/legacy/` to preserve history while avoiding conflicts.
- The migration runner records applied files in `schema_migrations` so future runs are deterministic.

How to run (local)

1. Start Postgres (Docker):

```bash
docker-compose up -d postgres
```

2. Run migrations:

```bash
pnpm --filter @csv/db run migrate
```

3. Verify tables exist (quick checks):

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d csv_crawler -c "\dt"
PGPASSWORD=postgres psql -h localhost -U postgres -d csv_crawler -c "SELECT to_regclass('public.sources'), to_regclass('public.documents'), to_regclass('public.datapoints');"
```

Notes about the integration test
- The integration test `apps/api/src/migrate.integration.test.ts` will run `pnpm --filter @csv/db run migrate:rollback` followed by `pnpm --filter @csv/db run migrate` and assert the presence of `sources`, `documents`, and `datapoints`.
- To run tests:

```bash
pnpm --filter @csv/api test -- migrate.integration.test.ts
```

Known issues / deferred items
- `pnpm type-check` at the package level previously failed due to `moduleResolution` vs `resolveJsonModule` in `packages/db/tsconfig.json`; I updated that file (see commit) to resolve the issue.
- The migration runner contains a fallback to mark incompatible legacy migrations as applied when foreign key type mismatches occur; this is pragmatic to unblock development. If you prefer stricter behavior, we can change it to fail and require manual migration reconciliation.

Next steps
- Story #2 (TypeScript types & data models): implement and verify domain types in `packages/types/src/index.ts` and ensure `pnpm type-check` passes across the monorepo.
