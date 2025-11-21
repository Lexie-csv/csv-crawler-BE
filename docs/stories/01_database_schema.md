# Story #1: Database Schema & Migrations for Sources & Crawl Jobs

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a system engineer, I need persistent PostgreSQL tables for managing crawl sources and job tracking so that the system can store and query regulatory source metadata and monitor crawl execution.

## Acceptance Criteria
- ✅ `sources` table exists with columns: id, name, url, type, country, sector, active, created_at, updated_at
- ✅ `crawl_jobs` table exists with columns: id, source_id, status, started_at, completed_at, items_crawled, items_new, error_message, created_at
- ✅ `crawled_documents` table exists with columns: id, source_id, crawl_job_id, url, content_hash, title, content, extracted_at, created_at
- ✅ Foreign key constraints enforced (crawl_jobs.source_id → sources.id)
- ✅ Indexes on frequently queried columns (source_id, status, content_hash)
- ✅ Migrations can be run via `pnpm db:migrate`
- ✅ Schema matches TypeScript types in `packages/types/src/index.ts`

## Tests Required
- Unit test: Migration file exists and is valid SQL
- Integration test: Can connect to PostgreSQL and run migration
- Smoke test: Tables exist and accept INSERT/SELECT queries

## Files to Create/Modify
- `/packages/db/migrations/002_sources_and_crawl_jobs.sql` (already created, needs verification)
- `/packages/types/src/index.ts` (add TypeScript types matching schema)
- `/packages/db/src/migrate.ts` (ensure migration runner works)

## Implementation Notes
- Use SERIAL PRIMARY KEY for auto-increment IDs
- Use CHECK constraints for enum-like status values (pending/running/done/failed)
- Set active boolean DEFAULT true for sources
- Use CURRENT_TIMESTAMP for created_at/updated_at
- Do NOT use mock data; verify with real PostgreSQL connection

## Rollback Plan
```sql
DROP TABLE IF EXISTS crawled_documents CASCADE;
DROP TABLE IF EXISTS crawl_jobs CASCADE;
DROP TABLE IF EXISTS sources CASCADE;
```

## Dependencies
- PostgreSQL 14+ running (Docker)
- pnpm packages installed
- Migration CLI working

## Next Story
After completion → Story #2: API Endpoint Tests & Data Layer
