# Story 6 — LLM Crawler Service

This document describes the minimal implementation of the LLM Crawler background worker.

## Goal / Contract
- Poll `crawl_jobs` table for pending jobs.
- For each job: mark job as running, check `robots.txt`, fetch the target URL, extract text content (via LLM or fallback), compute content hash, skip duplicates, store `crawled_documents`, and mark job done/failed.

Inputs:
- crawl job record: { id, source_id, url }

Outputs:
- Update crawl job status via `crawlService.updateCrawlJob(jobId, updates)`.
- Insert new row into `crawled_documents` for new content.

Error modes:
- Fetch failures, LLM failures, DB errors: mark job as failed with an error message.

## Implementation notes
- File: `apps/api/src/services/llm.crawler.ts` — contains a small loop `runLLMCrawlerLoop()` with a simple sequential processing model.
- Uses `@csv/db` helpers `query` and `queryOne`.
- Uses `robotsParser.isUrlAllowed(url)` to enforce robots.txt rules.
- Extraction currently uses `extractContentWithLLM()` which is a small, easily-replaceable function (strip HTML tags). Replace this with a proper LLM client call when available.

## How to run (development)

### Option 1: Via pnpm script (recommended)

```bash
pnpm --filter @csv/api llm:crawler
```

This runs the worker in polling mode. Set environment variables to control behavior:

```bash
LLM_CRAWLER_POLL_MS=5000 LLM_CRAWLER_BATCH=10 pnpm --filter @csv/api llm:crawler
```

### Option 2: From workspace root

```bash
pnpm --filter @csv/api exec -w tsx node apps/api/src/services/llm.crawler.ts
```

### Option 3: Programmatic (in your API server process)

Import and start the loop:

```ts
import { runLLMCrawlerLoop } from '@/services/llm.crawler';

// In your Express startup or main function:
runLLMCrawlerLoop().catch((err) => {
  console.error('[LLM CRAWLER] Fatal:', err);
  process.exit(1);
});
```

## Environment variables

Control the crawler behavior via environment variables:

- `LLM_CRAWLER_POLL_MS`: Polling interval in milliseconds (default: 5000).
- `LLM_CRAWLER_BATCH`: Max jobs to fetch per poll (default: 5).

## Quick start

1. Ensure PostgreSQL is running and the schema is migrated:
   ```bash
   docker-compose up -d postgres
   pnpm db:migrate
   ```

2. Create a test source and crawl job via the API or CLI.

3. Start the crawler:
   ```bash
   pnpm --filter @csv/api llm:crawler
   ```

4. Watch it poll for pending jobs and process them.
- Add database-level job claiming to avoid double-processing when scaling horizontally.
- Replace the placeholder `extractContentWithLLM` with an actual LLM client integration; make the client injectable for easier testing.
- Add unit tests for `processJob` (mocking `db`, `robotsParser`, `crawlService`) and an integration test that runs the loop against a test DB.
