# Story #5: Crawl Job Queue & Status Tracking

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a system operator, I need to enqueue crawl jobs, track their status, and query results so that I can monitor crawler progress and see what was fetched without polling external services.

## Acceptance Criteria
- ✅ `POST /api/v1/crawl/start` → create new crawl_job (status=pending), return jobId
- ✅ `GET /api/v1/crawl/jobs/:jobId` → fetch job status, progress, error message
- ✅ `GET /api/v1/crawl/jobs?sourceId=X&status=running` → list jobs with filtering
- ✅ Job status transitions: pending → running → done/failed
- ✅ Job records include: itemsCrawled, itemsNew, startedAt, completedAt, errorMessage
- ✅ Validation: reject invalid sourceId, return 404 if source doesn't exist
- ✅ No mock data; all reads/writes to crawl_jobs table
- ✅ Jobs do NOT execute immediately; enqueue only

## Tests Required
- Unit test: Job creation with valid sourceId
- Unit test: Job creation rejects invalid/missing sourceId
- Integration test: POST creates row in crawl_jobs (status=pending)
- Integration test: GET returns created job
- Integration test: GET /jobs filters by sourceId and status
- Integration test: 404 on non-existent jobId
- Error test: 404 if source not found

## Files to Create/Modify
- `/apps/api/src/routes/crawl.ts` (new file with job endpoints)
- `/apps/api/src/index.ts` (mount /api/v1/crawl routes)
- `/apps/api/src/app.test.ts` (add job tests)

## Implementation Notes
- Job creation is synchronous; actual crawling happens separately (Story #6)
- Use default CURRENT_TIMESTAMP for createdAt
- Status column uses CHECK constraint (pending|running|done|failed)
- itemsCrawled and itemsNew default to 0
- errorMessage is nullable; only populated on failure
- Return full job object on POST

## Testing Command
```bash
pnpm test -- apps/api --testNamePattern="crawl|job"
```

## Dependencies
- Story #1 (schema with crawl_jobs table)
- Story #3 (connection pool)
- Story #4 (source existence validation)

## Next Story
After completion → Story #6: LLM-Based Crawler Service & Worker
