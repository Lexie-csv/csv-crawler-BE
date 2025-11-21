# Story #2: TypeScript Types & Data Models

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a developer, I need strong TypeScript types for all domain models so that the system has compile-time safety and clear contracts for API responses, database records, and crawler operations.

## Acceptance Criteria
- ✅ `Source` type with properties: id, name, url, type, country, sector, active, createdAt, updatedAt
- ✅ `CrawlJob` type with properties: id, sourceId, status (pending|running|done|failed), startedAt, completedAt, itemsCrawled, itemsNew, errorMessage, createdAt
- ✅ `CrawledDocument` type with properties: id, sourceId, crawlJobId, url, contentHash, title, content, extractedAt, createdAt
- ✅ `DataPoint` type with properties: id, documentId, key, value, unit, effectiveDate, confidence, extractor, createdAt
- ✅ `CrawlConfig` type for LLM crawler settings: apiKey, model, temperature, maxTokens, systemPrompt
- ✅ All types exported from `packages/types/src/index.ts`
- ✅ Types match database schema exactly
- ✅ No `any` types; strict TypeScript enabled

## Tests Required
- Unit test: Can import and instantiate all types
- Compile test: `pnpm type-check` passes with zero errors
- Validation test: Types align with database schema via sample data

## Files to Create/Modify
- `/packages/types/src/index.ts` (create complete type definitions)

## Implementation Notes
- Use strict interfaces, not types for ORM compatibility
- Add readonly modifiers where appropriate
- Use discriminated unions for status enum
- Export both individual types and a unified Database namespace
- Do NOT export mock factories; real types only

## Dependencies
- TypeScript 5.3+
- Strict mode enabled in tsconfig

## Next Story
After completion → Story #3: Database Integration & Connection Pool
