# Story #6: LLM-Based Crawler Service with Content Deduplication

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a crawler operator, I need a service that fetches URLs via LLM API (Claude/OpenAI), deduplicates content by hash, stores raw documents, and updates job status so that crawled data is stored reliably without duplicates.

## Acceptance Criteria
- ✅ `CrawlerService` class with method: `crawlSource(sourceId: number, jobId: number): Promise<void>`
- ✅ Fetches URL content using LLM API (OpenAI/Anthropic with system prompt)
- ✅ Computes SHA-256 hash of content
- ✅ Checks for duplicate: `SELECT * FROM crawled_documents WHERE content_hash = ?`
- ✅ If duplicate: skip storage, log as duplicate, increment itemsCrawled only
- ✅ If new: insert into crawled_documents, set extractedAt
- ✅ Updates crawl_jobs: itemsCrawled, itemsNew, startedAt, completedAt, status
- ✅ On error: set status=failed, populate errorMessage
- ✅ Respects robots.txt (parse and check URL path)
- ✅ Rate limiting: 1 request per source per second (no concurrent crawls same source)
- ✅ No mock data; real LLM API calls (with API key from env)

## Tests Required
- Unit test: Hash computation consistent for same content
- Unit test: Duplicate detection works
- Unit test: robots.txt parsing and enforcement
- Integration test: Crawl new URL stores in crawled_documents
- Integration test: Crawl duplicate URL skipped
- Integration test: Job status updated after crawl
- Integration test: Failed crawl sets error message
- Mock test: LLM API error handled gracefully

## Files to Create/Modify
- `/apps/api/src/services/crawler.service.ts` (new file)
- `/apps/api/src/services/robots.parser.ts` (parse/enforce robots.txt)
- `/apps/api/src/index.ts` (instantiate and use CrawlerService)
- `/apps/api/src/app.test.ts` (add crawler tests)
- `/apps/api/.env.example` (add LLM_API_KEY, LLM_MODEL)

## Implementation Notes
- Use `node-fetch` or `axios` to fetch URLs
- LLM system prompt: "Extract and summarize regulatory policy content from this HTML"
- Rate limiting: use in-memory Map<sourceId, timestamp> or Redis
- robots.txt parsing: use `robots-parser` package
- SHA-256 via `crypto.createHash('sha256')`
- Wrap LLM calls in try-catch; on error set job status=failed
- Update job atomically: transaction not required, but ensure consistency

## Testing Command
```bash
# Mock LLM API for tests (do not call real API in tests)
pnpm test -- apps/api --testNamePattern="crawler|dedup|robots"
```

## Dependencies
- Story #3 (connection pool)
- Story #5 (crawl job queue)
- LLM API key configured (OpenAI/Anthropic)
- `node-fetch`, `robots-parser` packages

## Next Story
After completion → Story #7: Deterministic Extraction Pipeline
