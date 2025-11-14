# Implementation: Story #3 — Database Connection Pool

Last updated: 2025-11-13

## What I built

- Implemented a typed PostgreSQL connection pool in `packages/db/src/index.ts` that:
  - Initializes a `pg.Pool` with connection limits and timeouts from environment variables.
  - Exports helper functions: `query<T>()`, `queryOne<T>()` for type-safe database operations.
  - Provides health check endpoint for connection verification.
  - Exports graceful shutdown handler for SIGTERM/SIGINT.
  - Handles connection errors with logging.

- Added integration test `packages/db/src/index.test.ts` that:
  - Verifies pool connects to PostgreSQL.
  - Tests `query<T>()` execution with multiple rows.
  - Tests `queryOne<T>()` execution with single row results.
  - Tests null handling when no rows match.
  - Validates health check returns connection status.
  - Tests graceful shutdown drains the pool.
  - Timeout: 15 seconds per test for database operations.

- Updated Jest configuration in `packages/db/jest.config.js` to support TypeScript tests.

- Added `jest` and `ts-jest` to `packages/db/package.json` dev dependencies.

## Design decisions and rationale

- **Connection pool vs. single connection**: A pool allows concurrent requests and proper resource management. Uses `pg.Pool` with:
  - `max: 10` in development (single machine)
  - `max: 20` in production (shared infrastructure)
  - `idleTimeoutMillis: 5000` (5 seconds)
  - `connectionTimeoutMillis: 5000` (5 seconds)

- **Helper functions**: Instead of exposing raw `Pool.query()`, we provide `query<T>()` and `queryOne<T>()` wrappers that:
  - Automatically handle parameter binding and error logging.
  - Enforce type safety for results using TypeScript generics.
  - Provide clear semantics (multiple vs. single row).
  - Throw descriptive errors on failure.

- **Graceful shutdown**: Exports `setupGracefulShutdown()` that:
  - Listens for SIGTERM and SIGINT signals.
  - Drains the pool to allow in-flight queries to complete.
  - Logs shutdown events for observability.

- **Health check**: Exports `healthCheck()` function for:
  - Testing connection to PostgreSQL.
  - Used by Express health endpoints (`GET /health`).
  - Returns `{ status: 'ok' }` or throws error.

- **No ORM**: Per project policy, we use raw SQL migrations + typed helpers. This keeps the codebase lean and performance predictable.

## How to run (local)

1. Start Postgres (Docker):

```bash
docker-compose up -d postgres
```

2. Run migrations to create tables:

```bash
pnpm --filter @csv/db run migrate
```

3. Run pool tests:

```bash
pnpm --filter @csv/db test
```

4. Expected output:

```
 PASS  src/index.test.ts (5.123 s)
  Database Pool
    ✓ creates pool and connects to Postgres (125 ms)
    ✓ query<T>() returns multiple rows (95 ms)
    ✓ queryOne<T>() returns single row (88 ms)
    ✓ queryOne<T>() returns null when no rows found (82 ms)
    ✓ healthCheck() verifies connection (75 ms)
    ✓ closePool() drains connections (65 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        5.456 s
```

## Key API

**`getPool(): Pool`**
- Returns singleton PostgreSQL connection pool.
- Creates on first call; subsequent calls return cached instance.
- Example:
```typescript
import { getPool } from '@csv/db';
const pool = getPool();
```

**`query<T>(sql: string, params: any[]): Promise<T[]>`**
- Execute SQL and return all matching rows.
- Returns empty array if no rows found.
- Example:
```typescript
import { query } from '@csv/db';
import { Source } from '@csv/types';

const sources = await query<Source>(
  'SELECT * FROM sources WHERE country = $1 ORDER BY created_at DESC',
  ['PH']
);
```

**`queryOne<T>(sql: string, params: any[]): Promise<T | null>`**
- Execute SQL and return a single row (or null if not found).
- Example:
```typescript
import { queryOne } from '@csv/db';
import { Source } from '@csv/types';

const source = await queryOne<Source>(
  'SELECT * FROM sources WHERE id = $1',
  [sourceId]
);

if (!source) {
  throw new Error('Source not found');
}
```

**`healthCheck(): Promise<{ status: 'ok' }>`**
- Verify connection to PostgreSQL.
- Used by Express health endpoints.
- Throws error if connection fails.
- Example:
```typescript
import { healthCheck } from '@csv/db';

app.get('/health', async (req, res) => {
  try {
    const result = await healthCheck();
    res.json(result);
  } catch (error) {
    res.status(503).json({ status: 'unavailable', error: error.message });
  }
});
```

**`setupGracefulShutdown(): void`**
- Register SIGTERM and SIGINT handlers to drain pool.
- Call once at application startup.
- Example:
```typescript
import { setupGracefulShutdown } from '@csv/db';

setupGracefulShutdown();

const app = express();
app.listen(3001);
```

**`closePool(): Promise<void>`**
- Manually drain and close the connection pool.
- Waits for all in-flight queries to complete.
- Example:
```typescript
import { closePool } from '@csv/db';

await closePool();
process.exit(0);
```

## Files changed

- `packages/db/src/index.ts` — new pool initialization + helper functions (125+ lines)
- `packages/db/src/index.test.ts` — new integration tests (180+ lines, 6 tests)
- `packages/db/jest.config.js` — Jest config with ts-jest preset
- `packages/db/package.json` — added Jest, ts-jest, @types/jest dev dependencies

## Environment variables

The pool reads from:

- `DATABASE_URL` — PostgreSQL connection string (format: `postgres://user:password@host:port/database`)
- `NODE_ENV` — Set to `production` for higher connection limits (20 vs 10)
- Defaults: localhost, port 5432, user `postgres`, password `postgres`, database `csv_crawler`

Example `.env.local`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/csv_crawler
NODE_ENV=development
```

## Known issues / deferred items

- **Connection pooling metrics**: No built-in monitoring for pool health (active connections, queue depth). Consider adding later via:
  - Events: `pool.on('connect')`, `pool.on('acquire')`, `pool.on('error')`
  - Prometheus exporter: Export `active_connections`, `idle_connections`, `waiting_requests`
- **Transaction support**: Not yet implemented; `query()` and `queryOne()` are single-statement helpers. For multi-statement transactions, use `pool.connect()` directly or add a `transaction<T>()` helper later.
- **Connection validation**: Pool does not validate connections on checkout; relies on PostgreSQL to reject stale connections. Consider adding `validationQuery` if stale connection issues arise.

## Next steps

- Story #4 (Sources CRUD API): Use the pool from this story to build REST endpoints for creating, reading, updating, and deleting sources. Will import `query<T>()`, `queryOne<T>()` and use the types from Story #2.
