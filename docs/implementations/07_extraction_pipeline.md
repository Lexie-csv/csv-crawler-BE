# Story 7 — Extraction Pipeline

This document describes the Extraction Pipeline service, which processes crawled documents and extracts structured datapoints.

## Goal / Contract

Extract structured key-value pairs (datapoints) from crawled document content:

**Inputs:**
- Unprocessed `documents` rows (where `processed_at IS NULL`)
- Content text from each document
- Extractor function (mockable for testing; replaceable with a real LLM)

**Process:**
1. Query unprocessed documents (batch configurable)
2. Call extractor to parse content → extract datapoints
3. Validate extracted data (filter out incomplete/invalid entries)
4. Store datapoints in `datapoints` table
5. Update document metadata (classification, country, sector, themes, confidence, verified)
6. Mark document as processed (set `processed_at = NOW()`)

**Outputs:**
- Rows inserted into `datapoints` table with:
  - `key` (string): field name, e.g., "deadline", "percentage", "agency_name"
  - `value` (string): extracted value
  - `unit` (optional): measurement unit (e.g., "%", "days")
  - `effective_date` (optional): date when the datapoint becomes effective
  - `source` (optional): where the datapoint was found
  - `confidence` (0-1): confidence score for this extraction

## Implementation notes

**File:** `apps/api/src/services/extraction.service.ts`

**Key functions:**
- `processDocument(doc, extractor)` — Process a single document; mockable for testing
- `runExtractionLoop(stopSignal, extractor)` — Main polling loop
- `defaultExtractor(content)` — Placeholder extractor (simple regex-based heuristic)
- Helper functions: `getUnprocessedDocuments`, `insertDataPoints`, `markDocumentProcessed`, `updateDocumentMetadata`

**Extractor interface:**
```typescript
async function extractor(content: string): Promise<ExtractionResult> {
  return {
    datapoints: [
      { key: "deadline", value: "2025-03-31", confidence: 0.9 },
      { key: "requirement", value: "100% renewable", unit: "%", confidence: 0.8 },
    ],
    classification: "regulation",
    country: "SG",
    sector: "Energy",
    themes: ["sustainability", "emissions"],
    confidence: 0.85,
    verified: false,
  };
}
```

The extractor is injected so tests can pass a deterministic stub, and production can plug in a real LLM client (OpenAI, Anthropic, etc.).

## How to run (development)

### Via pnpm script

```bash
pnpm --filter @csv/api extraction:run
```

### With custom polling intervals

```bash
EXTRACTION_POLL_MS=10000 EXTRACTION_BATCH=20 pnpm --filter @csv/api extraction:run
```

### Programmatically (in your Express server)

```ts
import { runExtractionLoop } from '@/services/extraction.service';

runExtractionLoop().catch((err) => {
  console.error('[EXTRACTION] Fatal:', err);
  process.exit(1);
});
```

## Environment variables

- `EXTRACTION_POLL_MS`: Polling interval in milliseconds (default: 5000)
- `EXTRACTION_BATCH`: Max documents to process per batch (default: 5)

## Next steps

1. **Real LLM integration**: Replace `defaultExtractor` with an actual LLM client (keep it injectable for testability).
2. **Advanced extraction**: Use structured prompts and LLM function-calling to extract specific datapoints per document type.
3. **Confidence scoring**: Implement cross-validation to increase confidence scores where multiple extractions agree.
4. **Enrichment**: Link datapoints to reference data (e.g., official agency lists, historical rates).
5. **Integration tests**: Add end-to-end tests against a test database.
6. **Performance tuning**: Parallelize document processing; add caching for repeated patterns.
7. **Monitoring**: Add metrics for extraction latency, success rate, confidence distribution.

## Quick start

1. Ensure the LLM crawler has populated the `documents` table with unprocessed content.

2. Start the extraction worker:
   ```bash
   pnpm --filter @csv/api extraction:run
   ```

3. Watch it process documents and populate the `datapoints` table.

4. Query the results:
   ```sql
   SELECT key, value, confidence FROM datapoints ORDER BY created_at DESC LIMIT 10;
   ```

## Testing

Run unit tests:

```bash
pnpm --filter @csv/api test -- extraction.service.test.ts
```

Expected output: All tests PASS. The tests cover:
- Successful extraction and storage
- Handling of documents without content
- Filtering of invalid datapoints
- Metadata updates
- Error handling

