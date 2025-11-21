# Story #4: API Endpoints for Source CRUD Operations

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As an API consumer, I need CRUD endpoints for managing regulatory sources so that I can register new URLs, list sources, update metadata, and mark sources as inactive without touching the database directly.

## Acceptance Criteria
- ✅ `GET /api/v1/sources` → list all active sources with pagination (limit=50, offset=0)
- ✅ `GET /api/v1/sources/:id` → fetch single source with full metadata
- ✅ `POST /api/v1/sources` → create new source (validate name, url, type, country)
- ✅ `PUT /api/v1/sources/:id` → update source (name, sector, active status)
- ✅ `DELETE /api/v1/sources/:id` → soft delete (mark inactive)
- ✅ Validation: reject invalid URLs, types not in enum, missing required fields
- ✅ Errors: 404 on not found, 400 on bad input, 500 on server error
- ✅ All responses use consistent JSON envelope: `{ data, message, error?, timestamp }`
- ✅ No mock data; reads/writes to PostgreSQL

## Tests Required
- Unit test: Input validation (invalid URL, bad type, missing fields)
- Integration test: POST creates row in sources table
- Integration test: GET returns same data
- Integration test: PUT updates fields correctly
- Integration test: DELETE soft deletes (active=false)
- Integration test: GET /sources excludes inactive
- Error test: 404 on non-existent ID
- Error test: 400 on validation failure

## Files to Create/Modify
- `/apps/api/src/routes/sources.ts` (new file with endpoints)
- `/apps/api/src/index.ts` (mount routes)
- `/apps/api/src/app.test.ts` (add integration tests)

## Implementation Notes
- Use Express request/response types strictly
- Implement input validation middleware (name length, URL format, type enum)
- SQL queries must use parameterized queries (no string concatenation)
- Return full Source object on POST/PUT
- Pagination uses LIMIT/OFFSET (not cursor-based for MVP)
- Timestamps in ISO 8601 format

## Testing Command
```bash
pnpm test -- apps/api --testNamePattern="sources|CRUD"
```

## Dependencies
- Story #1 (database schema)
- Story #3 (connection pool)
- pg library

## Next Story
After completion → Story #5: Crawl Job Queue & Status Tracking
