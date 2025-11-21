# Story #7: Deterministic Extraction Pipeline for Datapoints

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a data analyst, I need a system that extracts structured datapoints (rates, dates, percentages, indices) from crawled content using regex + schema validators so that the raw HTML becomes queryable, normalized data.

## Acceptance Criteria
- ✅ `ExtractionService` class with method: `extractDataPoints(documentId: number, content: string): Promise<DataPoint[]>`
- ✅ Supports extractors for: FIT rates, WESM prices, VAT rate, corporate tax rate, FX rate, CPI, GDP, inflation rate
- ✅ Each extractor has: regex pattern, unit, expected format, confidence threshold
- ✅ Returns `DataPoint[]` with: key, value, unit, effectiveDate (parsed from content), confidence (0-1 score)
- ✅ Validates data: type checking, range bounds, date parsing
- ✅ Stores datapoints in datapoints table linked to documentId
- ✅ On extraction failure: log as low confidence (0.0-0.3), do NOT throw
- ✅ No LLM calls; deterministic regex only (LLM is fallback, not primary)

## Tests Required
- Unit test: FIT rate extraction (e.g., "6.5 PHP/kWh")
- Unit test: WESM price extraction (e.g., "₱3,450/MWh")
- Unit test: Tax rate extraction (e.g., "30% corporate tax")
- Unit test: Date parsing (e.g., "Effective 2025-11-12")
- Unit test: Invalid data returns low confidence
- Unit test: Regex non-match returns empty array
- Integration test: Extracted datapoints stored in DB
- Integration test: Confidence scores accurate

## Files to Create/Modify
- `/apps/api/src/services/extraction.service.ts` (new file)
- `/packages/db/migrations/003_datapoints_table.sql` (create datapoints table)
- `/apps/api/src/app.test.ts` (add extraction tests)

## Implementation Notes
- Create regex patterns for each datapoint type (stored in constants or config file)
- Use `Date.parse()` and `moment` for date normalization (store as ISO 8601)
- Confidence score: 1.0 if all validators pass, 0.5 if date missing, 0.0 if parse fails
- Do NOT call LLM here; only regex + schema validation
- Store extraction timestamps for audit trail
- Return structured result even on partial failure

## Regex Examples
```
FIT Rate: /(\d+(?:\.\d+)?)\s*(?:PHP|₱)?\s*\/\s*(?:kWh|MWh)/i
VAT: /(?:value-added tax|VAT|vat)\s*(?:rate|rate of)?\s*:?\s*(\d+(?:\.\d+)?)\s*%/i
WESM Price: /(?:average\s+)?(?:WESM|wesm).*?(?:price|rate)\s*:?\s*(?:₱|PHP)?\s*([0-9,]+(?:\.\d+)?)/i
```

## Testing Command
```bash
pnpm test -- apps/api --testNamePattern="extraction|datapoint"
```

## Dependencies
- Story #3 (connection pool)
- Story #6 (crawled documents stored)
- `moment` or `date-fns` for date parsing

## Next Story
After completion → Story #8: Web UI Crawl Dashboard Integration
