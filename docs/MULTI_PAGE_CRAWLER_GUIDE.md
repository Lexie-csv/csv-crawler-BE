# Multi-Page Crawler & LLM Digest System - User Guide

## Quick Start

### Prerequisites
1. **OpenAI API Key** (required for LLM extraction)
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

2. **Running Services**
   ```bash
   # Terminal 1: Start PostgreSQL
   docker-compose up -d postgres
   
   # Terminal 2: Start API & Web
   pnpm dev
   ```

### Basic Usage

#### 1. Single-Page Crawl (Legacy Mode)
```bash
curl -X POST http://localhost:3001/api/crawl/start \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "your-source-uuid",
    "useMultiPage": false
  }'
```

#### 2. Multi-Page Crawl with Pagination
```bash
curl -X POST http://localhost:3001/api/crawl/start \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "your-source-uuid",
    "useMultiPage": true,
    "maxDepth": 2,
    "maxPages": 50,
    "concurrency": 3
  }'
```

**Parameters:**
- `useMultiPage` - Enable multi-page crawling (default: false)
- `maxDepth` - Maximum link depth to follow (default: 2)
- `maxPages` - Maximum total pages to crawl (default: 50)
- `concurrency` - Simultaneous HTTP requests (default: 3)

## Architecture

### Crawl Flow
```
User triggers crawl
    ↓
Create crawl_job (status: pending)
    ↓
Return job immediately to user
    ↓
[Background Process]
    ↓
Multi-page crawler starts
    ↓
For each page:
  - Check robots.txt
  - Fetch HTML
  - Extract links
  - Detect pagination
  - Queue new pages
  - Deduplicate by content hash
    ↓
LLM Classification
  - Classify each document (relevant/irrelevant)
  - Categories: circular, ppa, price_change, energy_mix, policy, other
    ↓
LLM Extraction (only relevant docs)
  - Extract events (title, summary, effective date)
  - Extract datapoints (indicator code, value, unit, date)
    ↓
Generate Digest
  - Validate & normalize datapoints
  - Generate Markdown summary (1-2 pages)
  - Save to /storage/digests/
  - Insert into crawl_digests table
    ↓
Update job (status: done)
```

### Database Schema

#### crawl_jobs (extended)
```sql
id                  UUID
source_id           UUID
status              TEXT (pending, running, done, failed)
pages_crawled       INTEGER (new)
pages_new           INTEGER (new)
pages_failed        INTEGER (new)
pages_skipped       INTEGER (new)
max_depth           INTEGER (new)
max_pages           INTEGER (new)
crawl_config        JSONB (new)
started_at          TIMESTAMP
completed_at        TIMESTAMP
error_message       TEXT
```

#### crawl_digests (new)
```sql
id                      UUID
crawl_job_id            UUID
source_id               UUID
period_start            TIMESTAMP
period_end              TIMESTAMP
summary_markdown        TEXT
summary_markdown_path   VARCHAR(500)
highlights              JSONB (array of DigestHighlight)
datapoints              JSONB (array of DigestDatapoint)
metadata                JSONB
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

## LLM Extraction

### Document Classification
```typescript
{
  isRelevant: boolean,
  category: 'circular' | 'ppa' | 'price_change' | 'energy_mix' | 'policy' | 'other' | 'irrelevant',
  confidence: number (0-1),
  reasoning?: string
}
```

### Extracted Datapoint Structure
```typescript
{
  indicatorCode: string,      // e.g., "DOE_CIRCULAR", "WESM_AVG_PRICE"
  description: string,
  value: string | number,
  unit?: string,              // e.g., "PHP/kWh", "percent", "MW"
  effectiveDate?: string,     // ISO date
  country?: string,           // e.g., "PH", "SG"
  metadata?: object,
  sourceDocumentId: string,
  sourceUrl: string,
  confidence?: number
}
```

### Common Indicator Codes
- `DOE_CIRCULAR` - DOE circular numbers
- `PPA_SIGNED` - Power Purchase Agreement signings
- `WESM_AVG_PRICE` - WESM average prices
- `ENERGY_MIX_COAL` - Coal generation share
- `ENERGY_MIX_SOLAR` - Solar generation share
- `ENERGY_MIX_WIND` - Wind generation share
- `FIT_RATE` - Feed-in tariff rates
- `RETAIL_TARIFF` - Retail electricity tariffs

## API Endpoints

### Crawl Management

#### POST /api/crawl/start
Create a new crawl job with optional multi-page settings.

**Request:**
```json
{
  "sourceId": "uuid",
  "useMultiPage": true,
  "maxDepth": 2,
  "maxPages": 50,
  "concurrency": 3
}
```

**Response:**
```json
{
  "data": {
    "id": "job-uuid",
    "sourceId": "source-uuid",
    "status": "pending",
    "maxDepth": 2,
    "maxPages": 50,
    "pagesCrawled": 0,
    "pagesNew": 0,
    ...
  }
}
```

#### GET /api/crawl/jobs/:jobId
Get crawl job status and metrics.

**Response:**
```json
{
  "data": {
    "id": "job-uuid",
    "status": "done",
    "pagesCrawled": 23,
    "pagesNew": 18,
    "pagesFailed": 2,
    "pagesSkipped": 3,
    ...
  }
}
```

#### GET /api/crawl/:jobId/digest
Get the LLM-generated digest for a crawl job.

**Response:**
```json
{
  "data": {
    "id": "digest-uuid",
    "crawlJobId": "job-uuid",
    "highlights": [...],
    "datapoints": [...],
    "summaryMarkdown": "# DOE Philippines - Policy & Data Digest\n\n...",
    "summaryMarkdownPath": "/storage/digests/..."
  }
}
```

### Digest Listing

#### GET /api/digests
List all digests with pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)
- `sourceId` - Filter by source UUID (optional)

**Example:**
```bash
curl "http://localhost:3001/api/digests?sourceId=xxx&page=1&pageSize=10"
```

**Response:**
```json
{
  "items": [...],
  "page": 1,
  "pageSize": 10,
  "totalItems": 45,
  "totalPages": 5
}
```

## Configuration

### Source Crawl Config
Configure per-source crawl behavior by adding `crawl_config` JSONB:

```sql
UPDATE sources
SET crawl_config = '{
  "baseUrl": "https://www.doe.gov.ph",
  "maxDepth": 3,
  "maxPages": 100,
  "concurrency": 5,
  "allowedPathPatterns": ["/circulars/", "/issuances/"],
  "blockedPathPatterns": ["/downloads/", "/archive/"],
  "paginationSelectors": ["a.next-page", "a[rel=next]"],
  "followExternalLinks": false
}'
WHERE id = 'source-uuid';
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
OPENAI_MODEL=gpt-4o-mini              # Default model
DIGEST_STORAGE_PATH=/path/to/digests  # Digest file storage
DATABASE_URL=postgresql://...          # Database connection
PORT=3001                              # API port
WEB_URL=http://localhost:3000         # CORS origin
```

## Real-World Examples

### DOE Philippines Circulars
```bash
# Create source
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DOE Philippines - Circulars",
    "url": "https://www.doe.gov.ph/circulars",
    "type": "policy",
    "country": "PH",
    "sector": "energy",
    "active": true
  }'

# Start multi-page crawl
curl -X POST http://localhost:3001/api/crawl/start \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "<source-uuid>",
    "useMultiPage": true,
    "maxDepth": 2,
    "maxPages": 50
  }'
```

### ERC Issuances
```bash
# Start crawl with custom settings
curl -X POST http://localhost:3001/api/crawl/start \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "<erc-source-uuid>",
    "useMultiPage": true,
    "maxDepth": 3,
    "maxPages": 100,
    "concurrency": 2
  }'
```

## Monitoring & Debugging

### Check API Logs
```bash
# API logs show detailed crawl progress
[MultiPageCrawler] Starting crawl for source...
[MultiPageCrawler] Crawling https://... (depth: 0)
[MultiPageCrawler] Found 15 new links at depth 0
[LLM] Classification for doc-xxx: { isRelevant: true, category: 'circular' }
[LLM] Extracted 4 events and 7 datapoints from doc-xxx
[DigestOrchestration] Digest saved with ID digest-xxx
```

### Check Database
```bash
# View recent crawl jobs
docker exec csv-crawler-db psql -U postgres -d csv_crawler -c \
  "SELECT id, status, pages_crawled, pages_new, pages_failed 
   FROM crawl_jobs 
   ORDER BY created_at DESC 
   LIMIT 5;"

# View recent digests
docker exec csv-crawler-db psql -U postgres -d csv_crawler -c \
  "SELECT id, source_id, 
   jsonb_array_length(highlights) as highlights_count,
   jsonb_array_length(datapoints) as datapoints_count
   FROM crawl_digests 
   ORDER BY created_at DESC 
   LIMIT 5;"
```

### View Generated Markdown
```bash
ls -lh storage/digests/
cat storage/digests/digest-<source-uuid>-2025-11-17.md
```

## Troubleshooting

### Issue: "OPENAI_API_KEY environment variable is required"
**Solution:** Set your OpenAI API key
```bash
export OPENAI_API_KEY="sk-..."
pnpm dev  # Restart servers
```

### Issue: No digest generated
**Possible causes:**
1. No relevant documents found (all classified as irrelevant)
2. LLM extraction failed
3. OPENAI_API_KEY not set

**Check logs:**
```bash
grep "DigestOrchestration" ~/.pm2/logs/csv-api-*.log
```

### Issue: Crawl gets stuck at "running"
**Possible causes:**
1. Network timeout
2. Robots.txt blocking
3. Invalid URLs

**Check job details:**
```bash
curl http://localhost:3001/api/crawl/jobs/<job-uuid>
```

### Issue: Too many pages crawled
**Solution:** Adjust `maxPages` or add `blockedPathPatterns`:
```json
{
  "maxPages": 20,
  "blockedPathPatterns": ["/archive/", "/old/", "\\.pdf$"]
}
```

## Performance Tuning

### Crawl Speed
- Increase `concurrency` (2-5 recommended)
- Decrease `maxDepth` for shallow crawls
- Use `allowedPathPatterns` to focus on relevant sections

### LLM Cost Optimization
- Use `gpt-4o-mini` (default, ~$0.15 per 1M tokens)
- Add aggressive `blockedPathPatterns` to skip irrelevant pages
- Set lower `maxPages` limit

### Memory Usage
- Default settings: ~50-100MB per 100 pages
- For large sites (1000+ pages), consider batching or scheduling

## Next Steps

1. **Frontend Integration** - Build UI for:
   - Multi-page crawl settings form
   - Digest listing with pagination
   - Digest detail page with rendered Markdown

2. **Testing** - Add integration tests for:
   - Multi-page crawl flow
   - LLM extraction pipeline
   - Digest generation

3. **Enhancements**:
   - PDF/Excel parsing support
   - JavaScript rendering (Puppeteer)
   - Retry logic for failed pages
   - Email delivery of digests

---

**Need help?** Check the main [MULTI_PAGE_CRAWLER_SUMMARY.md](../MULTI_PAGE_CRAWLER_SUMMARY.md) for implementation details.
