# Implementation: Story #10 — Datapoint Query API

**Status**: ✅ Complete  
**Date**: 2025-11-14  
**Story**: [10_datapoint_query_api.md](../stories/10_datapoint_query_api.md)

## Summary

Implemented a comprehensive REST API for querying datapoints with flexible filtering, pagination, CSV export, and time series aggregation. The API supports queries by key, country, sector, date ranges, and provides statistical aggregations.

## What Was Built

### 1. DatapointQueryService (`apps/api/src/services/datapoint-query.service.ts`)

Core service with the following capabilities:

- **queryDatapoints()**: Flexible filtering with pagination
  - Filter by: key, country, sector, sourceId, date range, confidence threshold
  - Pagination: configurable limit (1-10000) and offset
  - Sorting: by effective_date, confidence, or created_at (ASC/DESC)
  - Joins with documents and sources tables for enriched results

- **getTimeSeries()**: Time series aggregation
  - Resolutions: daily, weekly, monthly
  - Aggregations: AVG, MIN, MAX, COUNT
  - Filters: country, sector, date range
  - Only processes numeric values using regex validation

- **exportToCSV()**: CSV export functionality
  - Uses same filtering logic as queryDatapoints
  - Properly escaped CSV format
  - Includes source metadata (name, country, sector)
  - Max 10,000 rows per export

### 2. REST API Routes (`apps/api/src/routes/datapoints.ts`)

Three main endpoints:

#### `GET /api/v1/datapoints`
Query datapoints with filtering and pagination.

**Query Parameters:**
- `key` - Filter by datapoint key
- `country` - Filter by country code
- `sector` - Filter by sector
- `sourceId` - Filter by source UUID
- `startDate` - Start of date range (YYYY-MM-DD)
- `endDate` - End of date range (YYYY-MM-DD)
- `minConfidence` - Minimum confidence score (0-1)
- `limit` - Results per page (1-10000, default 50)
- `offset` - Pagination offset (default 0)
- `sortBy` - Sort field: effective_date | confidence | created_at
- `sortOrder` - Sort order: asc | desc (default desc)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "key": "SOLAR_FIT",
      "value": "9.68",
      "unit": "PHP/kWh",
      "effective_date": "2024-01-01",
      "source": "ERC",
      "confidence": 0.95,
      "provenance": "Table 1, Page 3",
      "created_at": "2024-11-14T10:00:00Z",
      "updated_at": "2024-11-14T10:00:00Z",
      "source_name": "Energy Regulatory Commission",
      "source_country": "PH",
      "source_sector": "energy"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

#### `GET /api/v1/datapoints/export`
Export query results as CSV. Accepts same filters as main query endpoint.

**Response:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename=datapoints.csv`
- CSV format with headers: ID, Key, Value, Unit, Effective Date, Source, Source Name, Country, Sector, Confidence, Created At

#### `GET /api/v1/datapoints/timeseries`
Get time series aggregation for a specific datapoint key.

**Query Parameters:**
- `key` (required) - Datapoint key to aggregate
- `country` - Filter by country
- `sector` - Filter by sector
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `resolution` - Aggregation resolution: daily | weekly | monthly (default monthly)

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "value": 9.5,
    "count": 5,
    "min": 9.0,
    "max": 10.0,
    "avg": 9.5
  },
  {
    "date": "2024-02-01",
    "value": 9.8,
    "count": 3,
    "min": 9.5,
    "max": 10.2,
    "avg": 9.8
  }
]
```

### 3. Unit Tests (`apps/api/src/services/datapoint-query.service.test.ts`)

Comprehensive test coverage (12 tests, all passing):

**queryDatapoints tests:**
- ✅ Query with basic filters (key, country)
- ✅ Apply date range filters
- ✅ Validate limit bounds (1-10000)
- ✅ Validate offset (≥0)
- ✅ Calculate pagination correctly (hasMore flag)

**getTimeSeries tests:**
- ✅ Aggregate monthly data
- ✅ Support daily resolution
- ✅ Support weekly resolution
- ✅ Filter by date range

**exportToCSV tests:**
- ✅ Generate valid CSV output
- ✅ Handle empty results
- ✅ Escape CSV values properly

## Design Decisions

### 1. Parameterized SQL Queries
All SQL uses parameterized statements (`$1, $2, ...`) to prevent SQL injection. Dynamic query building adds filters conditionally without concatenating user input.

### 2. Join Strategy
Queries join `datapoints → documents → sources` to enrich results with source metadata. This allows filtering by country/sector without duplicating data in the datapoints table.

### 3. Limit Validation
Max limit of 10,000 prevents memory issues from unbounded queries. For larger exports, users should paginate or use filtered queries.

### 4. Time Series Numeric Validation
Time series only processes values matching numeric regex (`^[0-9]+\.?[0-9]*$`) to avoid casting errors. Non-numeric values are excluded from aggregations.

### 5. CSV Escaping
All CSV values are wrapped in quotes and properly escaped to handle commas, quotes, and newlines in data.

### 6. Sort Order Default
Default sort is `effective_date DESC NULLS LAST` to show most recent datapoints first, with null dates at the end.

## How to Use

### Example Queries

**Get all solar FIT rates in Philippines:**
```bash
curl "http://localhost:3001/api/v1/datapoints?key=SOLAR_FIT&country=PH"
```

**Query with date range and pagination:**
```bash
curl "http://localhost:3001/api/v1/datapoints?sector=energy&startDate=2024-01-01&endDate=2024-12-31&limit=100&offset=0"
```

**Export to CSV:**
```bash
curl "http://localhost:3001/api/v1/datapoints/export?country=PH&minConfidence=0.8" > datapoints.csv
```

**Get monthly time series:**
```bash
curl "http://localhost:3001/api/v1/datapoints/timeseries?key=SOLAR_FIT&country=PH&resolution=monthly"
```

### Integration with Web App

The web dashboard at `/datapoints` can be enhanced to use these endpoints:

```typescript
// Example: Query datapoints in React component
const [datapoints, setDatapoints] = useState([]);
const [pagination, setPagination] = useState({ total: 0, hasMore: false });

const fetchDatapoints = async (filters) => {
  const params = new URLSearchParams(filters);
  const res = await fetch(`/api/v1/datapoints?${params}`);
  const data = await res.json();
  setDatapoints(data.data);
  setPagination({ total: data.total, hasMore: data.hasMore });
};
```

## Testing

Run tests:
```bash
cd apps/api
pnpm jest datapoint-query.service.test.ts
```

**Results:**
```
PASS  src/services/datapoint-query.service.test.ts
  DatapointQueryService
    queryDatapoints
      ✓ should query datapoints with basic filters (2 ms)
      ✓ should apply date range filters
      ✓ should validate limit bounds (6 ms)
      ✓ should validate offset
      ✓ should calculate pagination correctly (1 ms)
    getTimeSeries
      ✓ should aggregate time series data monthly
      ✓ should support daily resolution
      ✓ should support weekly resolution (1 ms)
      ✓ should filter by date range
    exportToCSV
      ✓ should generate valid CSV output
      ✓ should handle empty results (1 ms)
      ✓ should escape CSV values

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

## Performance Considerations

### Database Indexes
The following indexes support fast queries:
- `idx_datapoints_document_id` - For joins
- `idx_datapoints_key` - For key filtering
- `idx_documents_source_id` - For source joins
- `idx_sources_country` - For country filtering

### Query Optimization
- Parameterized queries are prepared once and cached by PostgreSQL
- `LIMIT` reduces result set size
- `NULLS LAST` in sorting avoids index issues with NULL values
- Numeric regex check (`~`) is faster than CAST with error handling

### Scaling Recommendations
For datasets >100K rows:
1. Add composite index on `(key, effective_date DESC)`
2. Consider partitioning datapoints table by date
3. Implement response caching (Redis) for common queries
4. Add read replicas for query load

## Known Limitations

1. **No Full-Text Search**: Current implementation doesn't support text search across value/provenance. Would need PostgreSQL tsvector/GIN indexes.

2. **No Rate Limiting**: Endpoints are unprotected. Should add rate limiting (express-rate-limit) in production.

3. **No Caching**: Every query hits the database. Common queries (e.g., latest datapoints) should be cached.

4. **No Streaming**: CSV export loads all results into memory. For very large exports, implement streaming.

5. **No Authentication**: All endpoints are public. Should add JWT auth for production.

## Files Changed

- ✅ `apps/api/src/services/datapoint-query.service.ts` (new, 364 lines)
- ✅ `apps/api/src/services/datapoint-query.service.test.ts` (new, 280 lines)
- ✅ `apps/api/src/routes/datapoints.ts` (new, 153 lines)
- ✅ `apps/api/src/index.ts` (modified, added datapoints routes)
- ✅ `docs/implementations/10_datapoint_query_api.md` (new, this file)

## Next Steps

Story #10 completes all 10 core stories! 🎉

**Recommended next phases:**

1. **Integration Testing** (Priority: High)
   - Set up Playwright for E2E tests
   - Test full workflow: create source → crawl → extract → query
   - Validate CSV export format
   - Test pagination edge cases

2. **Authentication** (Priority: High)
   - Implement JWT-based auth
   - Protect admin routes (sources, crawl management)
   - Add API key support for external clients
   - Implement role-based access (admin, viewer)

3. **CI/CD Pipeline** (Priority: High)
   - GitHub Actions workflow for automated testing
   - Automated deployment to staging
   - Database migration checks in CI
   - Type checking and linting in pre-merge

4. **Monitoring & Logging** (Priority: Medium)
   - Integrate Sentry for error tracking
   - Add structured logging (Winston/Pino)
   - Set up uptime monitoring (Uptime Robot/Better Uptime)
   - Add performance metrics (response times, query counts)

5. **Performance Optimization** (Priority: Medium)
   - Add Redis caching for frequent queries
   - Implement job queues (BullMQ) for crawler/extraction
   - Add database connection pooling optimization
   - Implement response compression

6. **Deployment** (Priority: Medium)
   - Deploy API to Railway/Fly.io with managed Postgres
   - Deploy web to Vercel
   - Set up environment-specific configs (staging, prod)
   - Configure custom domains and SSL

7. **Documentation** (Priority: Low)
   - Generate OpenAPI/Swagger docs
   - Write user guide for web dashboard
   - Create deployment guide
   - Document API rate limits and quotas

---

**Story #10 Status**: ✅ **COMPLETE**  
**All 10 Stories**: ✅ **COMPLETE**  
**Ready for**: Integration testing, authentication, deployment
