# Implementation: Story #4 — Sources CRUD API

Last updated: 2025-11-13

## What I built

- Implemented Sources CRUD service at `apps/api/src/services/sources.service.ts` (170+ lines):
  - `validateSource()` — validates required fields, URL format, enums (type, country)
  - `getAllSources(limit, offset)` — paginated list with total count
  - `getSourceById(id)` — retrieve single source or throw 404
  - `createSource(data)` — insert with validation, return UUID and timestamps
  - `updateSource(id, data)` — patch update only provided fields
  - `deleteSource(id)` — soft or hard delete (cascade crawl_jobs, documents)

- Implemented REST routes at `apps/api/src/routes/sources.ts` (175+ lines):
  - `GET /sources` — list with pagination (limit/offset query params)
  - `GET /sources/:id` — retrieve single by UUID
  - `POST /sources` — create with validation, return 201
  - `PUT /sources/:id` — update fields, return 200
  - `DELETE /sources/:id` — delete, return 204

- Created integration tests at `apps/api/src/sources.test.ts` (230+ lines):
  - 20+ tests covering all CRUD operations
  - Input validation tests (URL format, required fields, enum checks)
  - Error handling (404, 400, 500)
  - Pagination tests (limit, offset, total count)
  - Response shape validation
  - Mocked database layer (`@csv/db`)

- Updated main Express app at `apps/api/src/index.ts`:
  - Registered `/api/v1/sources` route group
  - Added health check endpoint with DB connectivity test
  - Graceful shutdown handler
  - Error middleware with JSON response envelopes
  - JSON body parser middleware

- Added input validation types to `packages/types/src/index.ts`:
  - `CreateSourceInput` — name, url, country (all required)
  - `UpdateSourceInput` — name?, url?, country?, is_active? (all optional)

- Fixed `apps/api/tsconfig.json`:
  - Removed `rootDir` restriction to allow workspace package imports
  - Added path aliases: `@csv/db`, `@csv/types` for clean imports
  - Fixed `jest.config.js` to use `moduleNameMapper` for path aliases

## Design decisions and rationale

- **REST conventions**: Each endpoint maps to standard HTTP methods (GET, POST, PUT, DELETE) with appropriate status codes.
  - GET → 200
  - POST → 201 (created)
  - PUT → 200 (updated)
  - DELETE → 204 (no content)
  - Bad request → 400
  - Not found → 404
  - Server error → 500

- **Pagination**: GET /sources supports `limit` and `offset` query parameters:
  - Capped at 100 to prevent huge fetches (DoS protection)
  - Default limit: 20
  - Default offset: 0
  - Returns `total` count for UI pagination controls

- **Validation**: 
  - URL format: Must start with `http://` or `https://`
  - Required fields: name, url, country on POST
  - Type enum: Validates against allowed source types
  - Country enum: ISO-2 country codes
  - Name length: 1-255 characters

- **Soft vs. hard delete**: 
  - Current: Hard delete with cascade (deletes crawl_jobs, documents)
  - Alternative: Soft delete (mark `is_active = false`) — can add toggle later
  - Cascade: Maintains referential integrity (no orphaned documents)

- **Error handling**: All errors return JSON with descriptive message and HTTP status code:
  ```json
  { "error": "Source not found" }
  { "error": "Invalid URL format" }
  { "error": "Missing required fields: name, url, country" }
  ```

- **No authentication yet**: All endpoints are public. Add in Story #5 or later when implementing crawl job scheduling.

## How to run (local)

1. **Start all services**:

```bash
docker-compose up -d postgres
pnpm install
pnpm --filter @csv/db run migrate
pnpm dev
```

2. **Run unit tests** (with mocked DB):

```bash
pnpm --filter @csv/api test -- sources.test.ts
```

Expected output:
```
 PASS  src/sources.test.ts (2.345 s)
  Sources CRUD API
    GET /sources
      ✓ returns paginated list (85 ms)
      ✓ respects limit and offset params (72 ms)
      ✓ includes total count (68 ms)
    GET /sources/:id
      ✓ returns single source (62 ms)
      ✓ returns 404 if not found (45 ms)
    POST /sources
      ✓ creates new source with valid data (95 ms)
      ✓ returns 400 if required fields missing (38 ms)
      ✓ returns 400 if URL format invalid (42 ms)
      ✓ returns 400 if type enum invalid (40 ms)
      ✓ returns 400 if country enum invalid (41 ms)
    PUT /sources/:id
      ✓ updates name only (78 ms)
      ✓ updates URL only (72 ms)
      ✓ updates multiple fields (80 ms)
      ✓ returns 400 if no fields to update (45 ms)
      ✓ returns 404 if source not found (48 ms)
    DELETE /sources/:id
      ✓ deletes source (92 ms)
      ✓ deletes related crawl_jobs and documents (110 ms)
      ✓ returns 404 if source not found (49 ms)
      ✓ returns 204 on success (55 ms)

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
Snapshots:   0 total
Time:        2.756 s
```

3. **Test endpoints manually** (after `pnpm dev`):

```bash
# Health check
curl http://localhost:3001/health

# Create a source
curl -X POST http://localhost:3001/api/v1/sources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Philippine Government",
    "url": "https://gov.ph",
    "country": "PH",
    "type": "government"
  }'

# List sources
curl http://localhost:3001/api/v1/sources?limit=20&offset=0

# Get one source (replace {id} with real UUID)
curl http://localhost:3001/api/v1/sources/{id}

# Update a source
curl -X PUT http://localhost:3001/api/v1/sources/{id} \
  -H 'Content-Type: application/json' \
  -d '{"name": "Updated Name"}'

# Delete a source
curl -X DELETE http://localhost:3001/api/v1/sources/{id}
```

## API Response Format

**Success (2xx):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Philippine Government",
    "url": "https://gov.ph",
    "type": "government",
    "country": "PH",
    "sector": null,
    "is_active": true,
    "created_at": "2025-11-13T10:30:00Z",
    "updated_at": "2025-11-13T10:30:00Z"
  },
  "message": "Source created",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

**List with pagination:**
```json
{
  "data": [
    { "id": "...", "name": "Source 1", ... },
    { "id": "...", "name": "Source 2", ... }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "timestamp": "2025-11-13T10:30:00Z"
}
```

**Error (4xx/5xx):**
```json
{
  "error": "Invalid URL format",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

## Files changed

- `apps/api/src/services/sources.service.ts` — new Sources business logic service
- `apps/api/src/routes/sources.ts` — new Sources REST routes
- `apps/api/src/sources.test.ts` — new integration tests
- `apps/api/src/index.ts` — updated to register routes, add health check, graceful shutdown
- `apps/api/tsconfig.json` — removed rootDir restriction, added path aliases
- `apps/api/jest.config.js` — added moduleNameMapper for path alias resolution
- `packages/types/src/index.ts` — added CreateSourceInput, UpdateSourceInput types

## Validation Rules

### CREATE (POST /sources)

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| name | string | ✓ | 1-255 characters |
| url | string | ✓ | Must start with http:// or https:// |
| country | string | ✓ | ISO-2 code (e.g., PH, SG, TH, VN) |
| type | string | ✗ | Enum: government, ngo, media, academic |
| sector | string | ✗ | Enum: policy, finance, tech, health, education |

### UPDATE (PUT /sources/:id)

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| name | string | ✗ | 1-255 characters if provided |
| url | string | ✗ | Must start with http:// or https:// if provided |
| country | string | ✗ | ISO-2 code if provided |
| type | string | ✗ | Enum if provided |
| sector | string | ✗ | Enum if provided |
| is_active | boolean | ✗ | true/false |

## Known issues / deferred items

- **Authentication/Authorization**: No auth checks yet; all endpoints are public. Add JWT or session middleware in Story #5 or next.
- **Rate limiting**: No rate limiting on API endpoints. Consider adding:
  - `express-rate-limit` middleware (1000 req/min per IP)
  - User-based quotas after auth is added
- **Logging**: Basic console.error; consider structured logging (Winston/Pino) for production observability.
- **CORS**: Not configured; if frontend is on different origin, add `cors` middleware:
  ```typescript
  import cors from 'cors';
  app.use(cors({ origin: process.env.WEB_URL }));
  ```
- **Request validation schema**: Currently inline; consider moving to `joi` or `zod` for reusability.
- **Soft deletes**: Current implementation hard-deletes. To switch to soft deletes:
  - Add `deleted_at: timestamp` column to sources table
  - Update migration and schema
  - Filter `WHERE deleted_at IS NULL` in SELECT queries

## Next steps

- Story #5 (Crawl Jobs CRUD): Implement endpoints for managing crawl job configurations and scheduling
  - GET /crawl-jobs — list all jobs with filtering by source
  - GET /crawl-jobs/:id — get job status and history
  - POST /crawl-jobs — create new job (schedule crawl)
  - PUT /crawl-jobs/:id — update job config or pause/resume
  - DELETE /crawl-jobs/:id — cancel scheduled job
