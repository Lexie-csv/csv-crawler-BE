# Implementation: Story #5 — Crawl Jobs CRUD API

Last updated: 2025-11-13

## What I built

- Implemented Crawl Jobs service at `apps/api/src/services/crawl.service.ts` (250+ lines):
  - `validateCrawlJob()` — validates sourceId (UUID format), returns errors or validated data
  - `createCrawlJob(sourceId)` — insert new job with status='pending', verify source exists, return full job
  - `getCrawlJobById(jobId)` — retrieve single job by UUID or null if not found
  - `listCrawlJobs(options)` — paginated list with filtering by sourceId and status, returns jobs + total count
  - `updateCrawlJob(jobId, updates)` — patch update job fields (status, itemsCrawled, itemsNew, dates, errorMessage)
  - `cancelCrawlJob(jobId, reason)` — soft cancel by marking as 'failed' with reason message

- Implemented REST routes at `apps/api/src/routes/crawl.ts` (180+ lines):
  - `POST /api/v1/crawl/start` — create new crawl job, return 201 with job data
  - `GET /api/v1/crawl/jobs/:jobId` — retrieve job status and progress
  - `GET /api/v1/crawl/jobs` — list jobs with filtering by sourceId, status, and pagination
  - `PUT /api/v1/crawl/jobs/:jobId` — update job status/progress (used by crawler in Story #6)
  - `DELETE /api/v1/crawl/jobs/:jobId` — cancel job if not already done/failed

- Created comprehensive integration tests at `apps/api/src/routes/crawl.test.ts` (300+ lines):
  - 18 tests covering all CRUD operations
  - Input validation tests (UUID format, required fields)
  - Error handling (404, 400, 500)
  - Filtering tests (by sourceId, status)
  - Pagination tests (limit cap at 100)
  - Mocked service layer for unit-level testing

- Updated main Express app at `apps/api/src/index.ts`:
  - Registered `/api/v1/crawl` route group
  - Added console output for crawl API endpoint on startup

## Design decisions and rationale

- **Job status transitions**: Jobs follow lifecycle: `pending` → `running` → (`done`|`failed`)
  - Set to 'pending' on creation; actual crawling happens in Story #6
  - Crawler updates to 'running' when it starts; 'done' or 'failed' when complete
  - Cannot cancel jobs already in 'done' or 'failed' state (idempotent safety)

- **No immediate execution**: Jobs are enqueued only; actual fetching/crawling happens in Story #6 (asynchronous worker)
  - This follows event-driven architecture (decouple creation from processing)
  - Allows UI to show job created before crawl completes

- **Source validation**: POST /start checks source exists before creating job
  - Prevents orphaned jobs for non-existent sources
  - Returns 404 with clear error message

- **UUID validation**: sourceId must be valid UUID format using regex
  - Prevents malformed IDs before DB query
  - Returns 400 with validation errors

- **Pagination**: LIST endpoint supports `limit` and `offset` query params
  - Capped at 100 rows per request (DoS protection)
  - Returns `total` count for UI pagination controls
  - Default limit: 20, default offset: 0

- **Filtering**: Supports filtering by `sourceId` and `status` (query params)
  - Example: `GET /api/v1/crawl/jobs?sourceId={id}&status=running`
  - Both optional; can filter by one, both, or neither

- **Soft cancellation**: DELETE marks job as 'failed' instead of deleting
  - Preserves audit trail and job history
  - Prevents data loss for debugging/reporting
  - Can include reason in errorMessage field

## How to run (local)

1. **Start all services**:

```bash
docker-compose up -d postgres
pnpm install
pnpm --filter @csv/db run migrate
pnpm dev
```

2. **Run unit tests** (with mocked service):

```bash
pnpm --filter @csv/api test -- crawl.test.ts
```

Expected output:
```
 PASS  src/routes/crawl.test.ts (0.771 s)
  Crawl Jobs API
    POST /api/v1/crawl/start
      ✓ should create a new crawl job (13 ms)
      ✓ should return 400 if sourceId is missing (2 ms)
      ✓ should return 400 if sourceId is not a valid UUID (1 ms)
      ✓ should return 404 if source does not exist (1 ms)
      ✓ should return 500 on database error (15 ms)
    GET /api/v1/crawl/jobs/:jobId
      ✓ should return a single crawl job (1 ms)
      ✓ should return 404 if job does not exist (1 ms)
      ✓ should return 500 on database error (1 ms)
    GET /api/v1/crawl/jobs
      ✓ should list all crawl jobs (2 ms)
      ✓ should filter by sourceId (1 ms)
      ✓ should filter by status (1 ms)
      ✓ should respect limit cap of 100 (1 ms)
      ✓ should return 500 on database error (1 ms)
    PUT /api/v1/crawl/jobs/:jobId
      ✓ should update a crawl job (1 ms)
      ✓ should return 404 if job does not exist (1 ms)
    DELETE /api/v1/crawl/jobs/:jobId
      ✓ should cancel a crawl job (1 ms)
      ✓ should return 404 if job does not exist (1 ms)
      ✓ should return 400 if job cannot be cancelled (1 ms)

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
```

3. **Test endpoints manually** (after `pnpm dev`):

```bash
# Create a source first (from Story #4)
SOURCE_ID=$(curl -s -X POST http://localhost:3001/api/v1/sources \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Gov","url":"https://gov.test","country":"PH"}' | jq -r '.data.id')

# Create a crawl job
curl -X POST http://localhost:3001/api/v1/crawl/start \
  -H 'Content-Type: application/json' \
  -d "{\"sourceId\":\"$SOURCE_ID\"}"

# List all jobs
curl http://localhost:3001/api/v1/crawl/jobs

# Get job status (replace {jobId})
curl http://localhost:3001/api/v1/crawl/jobs/{jobId}

# Filter by status
curl http://localhost:3001/api/v1/crawl/jobs?status=pending

# Filter by sourceId
curl "http://localhost:3001/api/v1/crawl/jobs?sourceId=$SOURCE_ID"

# Update job progress (used by Story #6 crawler)
curl -X PUT http://localhost:3001/api/v1/crawl/jobs/{jobId} \
  -H 'Content-Type: application/json' \
  -d '{"status":"running","items_crawled":5,"items_new":3}'

# Cancel a job
curl -X DELETE http://localhost:3001/api/v1/crawl/jobs/{jobId}
```

## API Response Format

**Success (2xx):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "source_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "items_crawled": 0,
    "items_new": 0,
    "started_at": null,
    "completed_at": null,
    "error_message": null,
    "created_at": "2025-11-13T10:30:00Z",
    "updated_at": "2025-11-13T10:30:00Z"
  },
  "message": "Crawl job created",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

**List with pagination:**
```json
{
  "data": [
    { "id": "...", "source_id": "...", "status": "pending", ... },
    { "id": "...", "source_id": "...", "status": "running", ... }
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
  "error": "Source not found",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

**Validation Error:**
```json
{
  "error": "Validation failed",
  "errors": {
    "sourceId": "sourceId must be a valid UUID"
  },
  "timestamp": "2025-11-13T10:30:00Z"
}
```

## Files changed

- `apps/api/src/services/crawl.service.ts` — new Crawl Jobs business logic service
- `apps/api/src/routes/crawl.ts` — new Crawl Jobs REST routes
- `apps/api/src/routes/crawl.test.ts` — new integration tests (18 tests)
- `apps/api/src/index.ts` — registered crawl routes, added startup logging

## Validation Rules

### CREATE (POST /api/v1/crawl/start)

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| sourceId | string | ✓ | Must be valid UUID |

### UPDATE (PUT /api/v1/crawl/jobs/:jobId)

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| status | string | ✗ | Enum: running, done, failed |
| items_crawled | number | ✗ | Non-negative integer |
| items_new | number | ✗ | Non-negative integer |
| started_at | ISO8601 timestamp | ✗ | When crawl started |
| completed_at | ISO8601 timestamp | ✗ | When crawl finished |
| error_message | string | ✗ | Reason for failure (if status=failed) |

## Known issues / deferred items

- **No timestamp support**: Job start/end times are stored but crawler (Story #6) responsible for setting them
- **Audit logging**: No who/what logged; consider adding user_id FK and change logging later
- **Concurrency limits**: No max jobs per source or global concurrency control; consider adding in Story #6 worker
- **Job retry logic**: Failed jobs cannot be retried; design retry mechanism for Story #6
- **Notifications**: No webhooks or notifications when jobs complete; add in Story #9 (digest service)

## Endpoints Summary

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/v1/crawl/start` | Create new crawl job | 201/400/404/500 |
| GET | `/api/v1/crawl/jobs` | List jobs (paginated, filterable) | 200/500 |
| GET | `/api/v1/crawl/jobs/:jobId` | Get job details | 200/404/500 |
| PUT | `/api/v1/crawl/jobs/:jobId` | Update job status/progress | 200/404/500 |
| DELETE | `/api/v1/crawl/jobs/:jobId` | Cancel job | 204/400/404/500 |

## Next steps

- Story #6 (LLM-Based Crawler Service): Implement background worker that:
  - Polls for jobs with status='pending'
  - Updates to 'running' when starting crawl
  - Fetches URL content
  - Sends to LLM for content extraction
  - Updates job with itemsCrawled, itemsNew, completedAt
  - Sets status to 'done' or 'failed' based on result
  - Stores crawled content in crawled_documents table
