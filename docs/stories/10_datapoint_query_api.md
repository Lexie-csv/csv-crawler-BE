# Story #10: Data Query API & Time Series Endpoint

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a researcher, I need API endpoints to query structured datapoints by key, date range, and country so that I can build financial models with reliable, versioned regulatory data.

## Acceptance Criteria
- ✅ `GET /api/v1/datapoints?key=solar_fit&country=PH&startDate=2025-01-01&endDate=2025-12-31` → time series
- ✅ `GET /api/v1/datapoints?key=wesm_price&limit=10&offset=0` → paginated results
- ✅ Query supports filters: key (exact), country, sector, dateRange, confidence (min), confidence (min), sourceId
- ✅ Results include: id, key, value, unit, effectiveDate, confidence, documentId, sourceName
- ✅ Sorting: by effectiveDate (DESC default), by confidence, by createdAt
- ✅ CSV export: `GET /api/v1/datapoints/export?key=solar_fit&country=PH&format=csv`
- ✅ Time series aggregation: `GET /api/v1/datapoints/timeseries?key=cpi&country=PH&resolution=monthly|weekly`
- ✅ Validation: reject invalid keys, date format validation

## Tests Required
- Unit test: Query string parsing and validation
- Integration test: Filter by key returns correct datapoints
- Integration test: Filter by country filters correctly
- Integration test: Date range filtering works
- Integration test: Pagination works (limit/offset)
- Integration test: CSV export valid format
- Integration test: Time series aggregation correct
- Error test: 400 on invalid key or date format

## Files to Create/Modify
- `/apps/api/src/routes/datapoints.ts` (new file)
- `/apps/api/src/index.ts` (mount /api/v1/datapoints routes)
- `/apps/api/src/app.test.ts` (add query tests)

## Implementation Notes
- Datapoint keys are predefined enum: SOLAR_FIT, WESM_PRICE, VAT_RATE, CORPORATE_TAX, FX_RATE, CPI, GDP, INFLATION
- SQL queries must use parameterized statements
- CSV generation: use `json2csv` or similar library
- Time series aggregation: group by date, calculate avg/min/max of values
- Add caching headers: ETag, Cache-Control for time series
- Timezone handling: all dates stored UTC, return in requested timezone

## Sample Query
```sql
SELECT id, key, value, unit, effective_date, confidence, source_name, document_id
FROM datapoints
WHERE key = $1 
  AND country = $2 
  AND effective_date >= $3 
  AND effective_date <= $4
  AND confidence >= $5
ORDER BY effective_date DESC
LIMIT $6 OFFSET $7;
```

## Testing Command
```bash
pnpm test -- apps/api --testNamePattern="datapoint|query|timeseries"
```

## Dependencies
- Story #7 (datapoints stored in DB)
- `json2csv` package for CSV export
- `date-fns` or `moment` for aggregation

## Next Story
After completion → Story #11: Error Handling & Observability
