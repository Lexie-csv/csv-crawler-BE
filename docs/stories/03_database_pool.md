# Story #3: Database Connection Pool & Query Utilities

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a backend engineer, I need a PostgreSQL connection pool with type-safe query utilities so that the API can reliably execute queries without connection exhaustion and with proper error handling.

## Acceptance Criteria
- ✅ PostgreSQL pool initialized in `packages/db/src/index.ts` with config from env
- ✅ Pool connection limit set to 10 (dev) / 20 (prod)
- ✅ `query<T>(sql: string, params?: any[]): Promise<T[]>` utility function
- ✅ `queryOne<T>(sql: string, params?: any[]): Promise<T | null>` utility function
- ✅ Error handling: connection errors logged, no silent failures
- ✅ Graceful shutdown: pool.end() on SIGTERM
- ✅ Health check endpoint: test pool connectivity
- ✅ No mock data; real PostgreSQL required

## Tests Required
- Integration test: Can connect to PostgreSQL via pool
- Integration test: query() returns typed results
- Integration test: queryOne() returns null on empty result
- Integration test: Pool closes cleanly on shutdown
- Error test: Connection error is caught and logged

## Files to Create/Modify
- `/packages/db/src/index.ts` (set up pool and utilities)
- `/apps/api/src/db.ts` (export pool utilities for API use)
- `/apps/api/src/index.ts` (add health check endpoint)

## Implementation Notes
- Use `pg` package (already in deps)
- Connection string from DATABASE_URL env var
- Throw errors instead of catching silently
- Add request logging middleware for debug mode
- Ensure tests run against real PostgreSQL (Docker)

## Testing Command
```bash
docker-compose up -d postgres
pnpm db:migrate
pnpm test -- --testPathPattern="db|database"
```

## Dependencies
- PostgreSQL 14+ running
- pg library
- Environment variables configured

## Next Story
After completion → Story #4: API Endpoints for Source CRUD Operations
