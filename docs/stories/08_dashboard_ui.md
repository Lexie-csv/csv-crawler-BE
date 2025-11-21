# Story #8: Web UI Crawl Dashboard Integration

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a user, I need a web UI to manage sources, trigger crawls, and view live job progress so that I can monitor regulatory updates without using curl.

## Acceptance Criteria
- ✅ `/crawl` page displays list of active sources
- ✅ Form to add new source (name, url, type, country, sector)
- ✅ "Start Crawl" button per source → POST /api/v1/crawl/start
- ✅ Real-time job list with status badges (pending/running/done/failed)
- ✅ Polling every 2s for running jobs via GET /api/v1/crawl/jobs?status=running
- ✅ Displays: jobId, sourceId, itemsCrawled, itemsNew, duration, error (if failed)
- ✅ View crawled documents per job (list with title, URL, hash)
- ✅ Extract results: show top datapoints per document
- ✅ Responsive design; follows CSV design system (Tailwind, Plus Jakarta Sans)
- ✅ No mocks; all data from real API endpoints

## Tests Required
- Component test: Add source form submits correctly
- Component test: Start Crawl button calls API
- Component test: Job status updates on poll
- E2E test: Full workflow (add source → start crawl → view results)
- E2E test: Error message displayed on failed crawl

## Files to Create/Modify
- `/apps/web/src/app/crawl/page.tsx` (update with real API integration)
- `/apps/web/src/app/crawl/layout.tsx` (add navigation back to home)
- `/apps/web/src/lib/api.ts` (new file with API client utilities)
- `/apps/web/playwright.config.ts` (configure E2E tests)
- `/apps/web/e2e/crawl.spec.ts` (new E2E test file)

## Implementation Notes
- Use `useFetch` hook or similar for API calls (consider `swr` or `react-query`)
- Polling: stop automatically when all jobs complete
- Error boundaries to catch API failures
- Format timestamps as human-readable (e.g., "2 minutes ago")
- Show loading states and spinners
- Disable "Start Crawl" button while job running for same source

## Testing Command
```bash
# Unit/component tests
pnpm test -- apps/web --testNamePattern="crawl"

# E2E tests (requires both servers running)
pnpm dev &
pnpm exec playwright test --project=chromium
```

## Dependencies
- Story #4 (sources API)
- Story #5 (crawl jobs API)
- Story #6 (crawler working)
- Story #7 (extraction working)

## Next Story
After completion → Story #9: Weekly Digest Generation & Email
