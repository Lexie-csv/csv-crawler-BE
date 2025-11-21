# Implementation: Story #2 — TypeScript Types & Data Models

**Last updated**: 2025-11-13

## What I built

Completed a comprehensive TypeScript types library in `packages/types/src/index.ts` that defines all domain models for the CSV crawler system:

- **Source**: Regulatory watchlist entry (website, regulator, exchange, etc.)
- **CrawlJob**: Tracking for a crawl execution
- **CrawledDocument**: Raw fetched content from a crawl (pre-extraction)
- **DataPoint**: Extracted structured key-value pairs from documents
- **Digest**: Weekly newsletter or periodic rollup
- **Subscription**: User digest preferences and subscriptions
- **AuditLog**: Immutable record of system actions
- **CrawlConfig**: Settings for LLM-based crawler
- **ApiResponse<T>** / **ApiListResponse<T>**: Generic API response wrappers

Key design decisions:
- All ID fields use `string` type to support UUIDs (from canonical `001_init_schema.sql`)
- All interfaces use `readonly` modifiers to enforce immutability at the type level
- Optional fields are marked with `?` or `| null` to distinguish between optional and nullable values
- All types are interface-based (not type aliases) for ORM compatibility
- Foreign key relationships are documented in JSDoc comments (e.g., `FK to sources.id`)
- Arrays use discriminated unions and simple arrays (e.g., `string[] | null`)

## Tests implemented

Created `packages/types/src/index.test.ts` with 9 Jest test cases:
1. Exports verification (compile-time check)
2. Source instantiation test
3. CrawlJob instantiation test
4. CrawledDocument instantiation test
5. DataPoint instantiation test
6. ApiResponse generic type test
7. ApiListResponse generic type test
8. Optional/nullable fields test
9. CrawlConfig instantiation test

All tests pass ✓

### Setup required

Added Jest to the types package:
- `packages/types/package.json` — added `jest`, `ts-jest`, `@types/jest`
- `packages/types/jest.config.js` — created Jest config with ts-jest preset
- Added test scripts: `test` and `test:watch`

## Validation

✅ `pnpm type-check` — all 4 packages pass (0 errors)  
✅ `pnpm --filter @csv/types test` — all 9 tests pass  
✅ Types align with canonical DB schema (`001_init_schema.sql`)  
✅ No `any` types; strict TypeScript enabled

## Files created/modified

- `packages/types/src/index.ts` — complete type definitions (152 lines)
- `packages/types/src/index.test.ts` — Jest unit tests (9 test cases)
- `packages/types/jest.config.js` — Jest configuration
- `packages/types/package.json` — added Jest dependencies and test scripts

## How to verify

```bash
# Run type-check for entire monorepo
pnpm type-check

# Run just the types package tests
pnpm --filter @csv/types test

# Run tests in watch mode (for development)
pnpm --filter @csv/types test:watch
```

## Design rationale

### UUID vs SERIAL IDs
The canonical database schema (`001_init_schema.sql`) uses UUIDs (UUID-ossp extension), not SERIAL integers. This provides:
- Globally unique IDs across distributed systems
- No ID collision risk
- Better security (unpredictable IDs)
- Easier data migrations and replication

### Readonly modifiers
All properties are marked `readonly` to signal immutability:
- Prevents accidental mutations in application code
- Enforces immutable architecture patterns
- Improves type safety and prevents bugs
- Standard practice in modern TypeScript apps

### Optional vs Nullable
Distinction between optional fields (`?`) and nullable fields (`| null`):
- Optional (`?`) — field may not exist (e.g., `sector?: string`)
- Nullable (`| null`) — field exists but may be null (e.g., `title: string | null`)
- Both combined (`?: ... | null`) — field is optional AND nullable

This clarity helps callers understand what to expect from the API.

## Dependencies

- TypeScript 5.3+ (strict mode)
- Jest 29.7.0 for testing
- ts-jest 29.1.1 for TypeScript support in Jest
- @types/jest 29.5.11 for Jest type definitions

## Next steps

**Story #3: Database Connection Pool** — Implement a connection pool wrapper in `packages/db/src/index.ts` that:
- Exports a configured `Pool` instance
- Provides methods for common query patterns (queryOne, queryMany, etc.)
- Handles connection lifecycle and cleanup
- Includes error handling and logging

See `docs/stories/03_database_pool.md` for full acceptance criteria.

---

**Acceptance Criteria Status**
- ✅ Source type with all properties matching schema
- ✅ CrawlJob type with status enum union
- ✅ CrawledDocument type
- ✅ DataPoint type
- ✅ CrawlConfig type for LLM settings
- ✅ All types exported from `packages/types/src/index.ts`
- ✅ Types match database schema exactly
- ✅ No `any` types; strict TypeScript enabled
- ✅ Unit tests: can import and instantiate all types
- ✅ Compile test: `pnpm type-check` passes with zero errors
- ✅ Validation test: types align with database schema via sample data
