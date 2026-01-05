# CSV Radar: Implementation Plan
## Systematic Refactor from Hardcoded Prototype to Production-Ready Application

**Created:** December 11, 2025  
**Lead Architect:** Senior Solutions Designer  
**Source:** ARCHITECTURE_REVIEW.md  
**Duration:** 2-3 weeks  
**Status:** ACTIVE

---

## SECTION 1: PROBLEM SUMMARY

Based on the comprehensive architecture review, the following critical issues have been identified:

### 1.1 UI Hardcoding Issues

**Problem:** 90% of UI displays hardcoded data instead of calling the backend API.

**Evidence:**
- `/newsletters` page: `latestNewsletters` and `archivedNewsletters` arrays (40+ lines each)
- `/signals` page: `FEATURED_HIGHLIGHTS` array with 10 hardcoded articles
- `/newsletters/[id]` page: Entire `newsletters` object with fake highlights
- Dashboard components: `AVAILABLE_NEWSLETTERS`, `RECENT_NEWSLETTER_HIGHLIGHTS` arrays
- KPI cards: Hardcoded values (`0`, `—`, static strings)

**Impact:**
- Backend changes are invisible to users
- Cannot add real data without code changes
- Testing is impossible (what's being tested?)
- New engineers waste time debugging "why API changes don't work"

### 1.2 Type/Contract Inconsistencies

**Problem:** Shared type package exists but isn't used; types are duplicated between frontend and backend.

**Evidence:**
- `packages/types/src/index.ts` defines `Document` interface
- `apps/web/src/lib/api.ts` defines different `Document` interface
- Both have overlapping but different fields
- No single source of truth

**Impact:**
- Types will drift over time
- Backend adds field → Frontend breaks silently
- Refactoring requires finding duplicates across codebase
- TypeScript safety is an illusion

### 1.3 Data-Fetching Gaps

**Problem:** No unified data layer; components make inline API calls or use hardcoded arrays.

**Evidence:**
- Components use `useEffect` + `useState` + `fetch` directly
- No caching, deduplication, or request management
- Error handling is inconsistent (some log, some ignore)
- Loading states are manual and often missing

**Impact:**
- Same data fetched multiple times
- No optimistic updates or mutations
- Poor UX (no loading indicators, silent failures)
- Performance issues (unnecessary re-renders, network waste)

### 1.4 Component Architecture Problems

**Problem:** Components are "god components" doing too much; no separation of concerns.

**Evidence:**
- `RecentSignalsFeed.tsx`: 300+ lines mixing data fetching, filtering, state, rendering
- `SignalsPage.tsx`: Inline stats calculation, hardcoded newsletter object
- `NewslettersPage.tsx`: Hardcoded data, no hooks, no separation

**Impact:**
- Impossible to test logic separately from UI
- Cannot reuse fetching logic across components
- Difficult to maintain (change one thing, break three things)
- Prop drilling and context pollution

### 1.5 Backend Route Gaps

**Problem:** Backend has working endpoints that frontend doesn't use.

**Unused Endpoints:**
- `GET /api/v1/digests` — Returns real digests, ignored by UI
- `GET /api/v1/documents?is_alert=true` — Returns real alerts, ignored
- `GET /api/v1/sources` — Returns real sources, ignored
- `GET /api/v1/crawl-jobs` — Returns job history, never called

**Partially Working Endpoints:**
- `GET /api/v1/digests/:id` — Exists but doesn't return highlights array (needs DB schema fix)

**Impact:**
- Wasted backend work
- Frontend-backend contract is broken
- Cannot leverage real data without major refactor

---

## SECTION 2: PRIORITIZED FIXES

### P0: CRITICAL (Must Fix Immediately)

| ID | Issue | Location | Estimated Time |
|----|-------|----------|----------------|
| P0-1 | Remove hardcoded newsletters data | `/newsletters` page | 2 hours |
| P0-2 | Remove hardcoded signals/highlights | `/signals` page, `RecentSignalsFeed` | 2 hours |
| P0-3 | Fix `GET /digests/:id` endpoint | Backend + migration | 3 hours |
| P0-4 | Unify types in `packages/types` | All files importing types | 2 hours |
| P0-5 | Wire `RecentSignalsFeed` to real data | Dashboard component | 1.5 hours |
| P0-6 | Add loading/error states | All pages | 3 hours |
| P0-7 | Introduce SWR data layer | New `lib/data/` directory | 4 hours |
| P0-8 | Create data-fetching hooks | `useNewsletters`, `useDocuments`, etc. | 3 hours |

**Total P0 Effort:** ~20 hours (2.5 days)

### P1: HIGH (Critical for Production)

| ID | Issue | Location | Estimated Time |
|----|-------|----------|----------------|
| P1-1 | Refactor Signals page into components | `/signals/page.tsx` | 3 hours |
| P1-2 | Refactor Newsletters list page | `/newsletters/page.tsx` | 2 hours |
| P1-3 | Refactor Newsletter detail page | `/newsletters/[id]/page.tsx` | 3 hours |
| P1-4 | Create reusable UI components | `StatCard`, `DocumentCard`, etc. | 4 hours |
| P1-5 | Add digest highlights table | Migration 014 | 2 hours |
| P1-6 | Update digest generation service | Save highlights to DB | 3 hours |
| P1-7 | Implement proper error handling | API client with interceptors | 2 hours |
| P1-8 | Add pagination to documents API | Backend + frontend | 3 hours |

**Total P1 Effort:** ~22 hours (2.75 days)

### P2: MEDIUM/LOW (Nice to Have)

| ID | Issue | Location | Estimated Time |
|----|-------|----------|----------------|
| P2-1 | Add infinite scroll | Documents list | 2 hours |
| P2-2 | Extract reusable filters | Time range, source type | 1.5 hours |
| P2-3 | Fix prop drilling | Use Context or Zustand | 2 hours |
| P2-4 | Clean up unused imports | ESLint auto-fix | 0.5 hours |
| P2-5 | Add accessibility features | ARIA labels, keyboard nav | 3 hours |
| P2-6 | Remove console.logs | Replace with logger | 1 hour |
| P2-7 | Add E2E tests | Playwright setup | 4 hours |
| P2-8 | Icon cleanup | Document what each icon means | 1 hour |

**Total P2 Effort:** ~15 hours (2 days)

---

## SECTION 3: WORK PHASES

### Phase 1: Data Contracts + Hooks + Signals Wiring (Week 1, Days 1-3)

**Goal:** Establish the foundation—unified types, data layer, one working example.

**Tasks:**

1. **Unify Types (2 hours)**
   - Move all interfaces to `packages/types/src/api.ts`
   - Delete duplicates from `apps/web/src/lib/api.ts`
   - Update `tsconfig.json` paths
   - Verify no TypeScript errors

2. **Install & Configure SWR (1 hour)**
   - `cd apps/web && pnpm add swr`
   - Create `lib/api/client.ts` with axios/fetch wrapper
   - Add error interceptors and toast notifications

3. **Create Data Hooks (4 hours)**
   - `lib/data/useDocuments.ts` — Fetch documents with filters
   - `lib/data/useDigests.ts` — Fetch all digests
   - `lib/data/useDigest.ts` — Fetch single digest by ID
   - `lib/data/useSources.ts` — Fetch sources
   - `lib/data/useSignalsStats.ts` — Fetch dashboard KPIs

4. **Wire Signals Page (3 hours)**
   - Replace hardcoded stats with `useSignalsStats()`
   - Replace hardcoded latest newsletter with `useDigests({ limit: 1 })`
   - Add loading skeleton
   - Add error boundary

5. **Wire RecentSignalsFeed Component (2 hours)**
   - Delete `FEATURED_HIGHLIGHTS` array
   - Use `useDocuments({ days: 7, is_alert: false })`
   - Add loading state
   - Handle empty state

**Deliverables:**
- ✅ Single source of truth for types
- ✅ SWR installed and configured
- ✅ 5 data hooks created and tested
- ✅ Signals page fully wired to real data
- ✅ RecentSignalsFeed showing real documents

**Validation:**
```bash
pnpm type-check  # No errors
pnpm lint        # No warnings
pnpm dev         # Visit /signals, see real data
```

---

### Phase 2: Newsletters List + Detail Wiring (Week 1, Days 4-5)

**Goal:** Wire newsletters pages to real API, remove all hardcoded newsletter data.

**Tasks:**

1. **Create Digest-to-Newsletter Mapper (1 hour)**
   - `lib/mappers/digestMapper.ts`
   - Map API `Digest` type to UI `Newsletter` type
   - Handle date formatting, categorization

2. **Refactor Newsletters Listing (2 hours)**
   - Delete `latestNewsletters` and `archivedNewsletters` arrays
   - Use `useDigests()` hook
   - Group by source, split into latest/archived
   - Add loading and error states

3. **Fix Backend Digest Detail Endpoint (3 hours)**
   - Create migration 014: `digest_highlights` table
   - Update `GET /api/v1/digests/:id` to join highlights
   - Update digest generation service to save highlights

4. **Refactor Newsletter Detail Page (2 hours)**
   - Delete `HARDCODED_NEWSLETTERS` object (130+ lines)
   - Use `useDigest(id)` hook
   - Render highlights and datapoints from real data
   - Add 404 handling for invalid IDs

**Deliverables:**
- ✅ Newsletters listing shows real digests
- ✅ Newsletter detail page shows real highlights
- ✅ Database schema supports highlights
- ✅ No hardcoded newsletter data remains

**Validation:**
```bash
curl http://localhost:3001/api/v1/digests | jq
curl http://localhost:3001/api/v1/digests/[id] | jq
# Visit /newsletters, click any newsletter, see real data
```

---

### Phase 3: Component Cleanup + Remaining Tech Debt (Week 2)

**Goal:** Refactor god components, create reusable UI primitives, polish UX.

**Tasks:**

1. **Create Reusable UI Components (4 hours)**
   - `components/ui/StatCard.tsx` — KPI card with icon, label, value
   - `components/ui/DocumentCard.tsx` — Signals/alerts card
   - `components/ui/NewsletterCard.tsx` — Newsletter preview
   - `components/ui/EmptyState.tsx` — No data placeholder
   - `components/ui/LoadingState.tsx` — Skeleton screens

2. **Refactor Signals Page Components (3 hours)**
   - Split into: `StatsCards`, `RecentSignalsFeed`, `LatestNewslettersPanel`, `SourcesOverviewGrid`
   - Each component uses appropriate hook
   - Remove god component pattern

3. **Refactor LatestNewslettersPanel (1 hour)**
   - Delete `AVAILABLE_NEWSLETTERS` array
   - Use `useDigests({ limit: 3 })` hook
   - Handle empty state

4. **Add Consistent Error Boundaries (2 hours)**
   - Create `components/ErrorBoundary.tsx`
   - Wrap all pages in `<ErrorBoundary>`
   - Show user-friendly error messages

5. **Add Pagination (3 hours)**
   - Backend: Add `limit` and `offset` to `/documents` endpoint
   - Frontend: Implement "Load More" or infinite scroll
   - Update `useDocuments` hook to support pagination

6. **Clean Up Tech Debt (2 hours)**
   - Remove unused imports (ESLint auto-fix)
   - Remove console.logs
   - Fix TypeScript `any` types
   - Standardize naming conventions

**Deliverables:**
- ✅ 5 reusable UI components
- ✅ All pages use small, focused components
- ✅ Error boundaries on all pages
- ✅ Pagination working
- ✅ ESLint/TypeScript clean

**Validation:**
```bash
pnpm lint        # 0 warnings
pnpm type-check  # 0 errors
pnpm test        # All tests pass
```

---

## SECTION 4: TASK QUEUE

### Week 1, Day 1: Types & Foundation (6 hours)

- [ ] **T1.1** (2h): Audit all type definitions in `apps/web/src/lib/api.ts` and `packages/types/src/index.ts`
  - Files: `packages/types/src/api.ts` (new), `apps/web/src/lib/api.ts`
  - Action: Move `Document`, `Digest`, `Source`, `CrawlJob` to `packages/types/src/api.ts`
  - Action: Delete duplicates from `apps/web/src/lib/api.ts`
  - Action: Add `ApiResponse<T>` generic type

- [ ] **T1.2** (1h): Update TypeScript configuration
  - Files: `apps/web/tsconfig.json`, `apps/api/tsconfig.json`
  - Action: Add path alias `@csv/types` → `packages/types/src`
  - Action: Ensure both apps can import from `@csv/types`

- [ ] **T1.3** (1h): Install and configure SWR
  - Files: `apps/web/package.json`, `apps/web/src/lib/api/client.ts` (new)
  - Action: `cd apps/web && pnpm add swr axios`
  - Action: Create axios instance with base URL, interceptors

- [ ] **T1.4** (2h): Create base data hooks infrastructure
  - Files: `apps/web/src/lib/data/index.ts` (new)
  - Action: Create SWR fetcher function
  - Action: Create hook return type interface (`DataHookResult<T>`)
  - Action: Set up error handling and toast notifications

### Week 1, Day 2: Core Data Hooks (6 hours)

- [ ] **T2.1** (1.5h): Create `useDocuments` hook
  - Files: `apps/web/src/lib/data/useDocuments.ts`
  - Endpoint: `GET /api/v1/documents?days={days}&is_alert={bool}&limit={n}`
  - Returns: `{ documents: Document[], isLoading, error, refresh }`

- [ ] **T2.2** (1h): Create `useDigests` hook
  - Files: `apps/web/src/lib/data/useDigests.ts`
  - Endpoint: `GET /api/v1/digests?limit={n}&sort={field}:{order}`
  - Returns: `{ digests: Digest[], isLoading, error, refresh }`

- [ ] **T2.3** (1h): Create `useDigest` hook (single)
  - Files: `apps/web/src/lib/data/useDigest.ts`
  - Endpoint: `GET /api/v1/digests/:id`
  - Returns: `{ digest: Digest | null, isLoading, error, refresh }`

- [ ] **T2.4** (1h): Create `useSources` hook
  - Files: `apps/web/src/lib/data/useSources.ts`
  - Endpoint: `GET /api/v1/sources`
  - Returns: `{ sources: Source[], isLoading, error, refresh }`

- [ ] **T2.5** (1.5h): Create `useSignalsStats` hook
  - Files: `apps/web/src/lib/data/useSignalsStats.ts`
  - Endpoints: Parallel fetch of `/documents?days=7&is_alert=false`, `is_alert=true`, `/sources`
  - Returns: `{ newSignals, newAlerts, sourcesMonitored, isLoading, error }`

### Week 1, Day 3: Wire Signals Page (6 hours)

- [ ] **T3.1** (2h): Refactor Signals page main component
  - Files: `apps/web/src/app/signals/page.tsx`
  - Action: Delete hardcoded `latestNewsletter` object (lines ~140)
  - Action: Delete hardcoded stats calculation (lines ~25-40)
  - Action: Use `useSignalsStats()` and `useDigests({ limit: 1 })`
  - Action: Add loading skeleton

- [ ] **T3.2** (2h): Refactor `RecentSignalsFeed` component
  - Files: `apps/web/src/components/dashboard/RecentSignalsFeed.tsx`
  - Action: Delete `RECENT_NEWSLETTER_HIGHLIGHTS` array (130+ lines)
  - Action: Use `useDocuments({ days: 7, is_alert: false, limit: 10 })`
  - Action: Add loading/empty states

- [ ] **T3.3** (1h): Refactor `LatestNewslettersPanel` component
  - Files: `apps/web/src/components/dashboard/LatestNewslettersPanel.tsx`
  - Action: Delete `AVAILABLE_NEWSLETTERS` array
  - Action: Use `useDigests({ limit: 3 })`
  - Action: Handle empty state

- [ ] **T3.4** (1h): Add error boundary to Signals page
  - Files: `apps/web/src/components/ErrorBoundary.tsx` (new), `apps/web/src/app/signals/page.tsx`
  - Action: Create error boundary component
  - Action: Wrap Signals page content

### Week 1, Day 4: Backend Digest Detail Fix (6 hours)

- [ ] **T4.1** (1h): Create digest highlights migration
  - Files: `packages/db/migrations/014_add_digest_highlights.sql`
  - Action: Create `digest_highlights` table with `digest_id` FK
  - Action: Add indexes on `digest_id`
  - Action: Run migration: `pnpm db:migrate`

- [ ] **T4.2** (2h): Update digest generation service
  - Files: `apps/api/src/services/digest-orchestration.service.ts`
  - Action: After creating digest, insert highlights into `digest_highlights` table
  - Action: Save text, type, source_url for each highlight

- [ ] **T4.3** (2h): Fix `GET /api/v1/digests/:id` endpoint
  - Files: `apps/api/src/routes/digests.ts`
  - Action: Update query to LEFT JOIN `digest_highlights`
  - Action: Aggregate highlights as JSON array
  - Action: Return `{ digest: { ...digestFields, highlights: [...] } }`

- [ ] **T4.4** (1h): Test digest detail endpoint
  - Action: Generate new digest with highlights
  - Action: Verify `curl http://localhost:3001/api/v1/digests/:id` returns highlights
  - Action: Verify frontend can fetch and display

### Week 1, Day 5: Newsletters Pages (6 hours)

- [ ] **T5.1** (1h): Create digest-to-newsletter mapper
  - Files: `apps/web/src/lib/mappers/digestMapper.ts`
  - Action: Define `Newsletter` interface
  - Action: Create `mapDigestToNewsletter(digest: Digest): Newsletter`
  - Action: Handle date formatting, category derivation

- [ ] **T5.2** (2h): Refactor newsletters listing page
  - Files: `apps/web/src/app/newsletters/page.tsx`
  - Action: Delete `latestNewsletters` and `archivedNewsletters` arrays (100+ lines)
  - Action: Use `useDigests()` hook
  - Action: Map digests using `mapDigestToNewsletter`
  - Action: Group by source, split latest/archived
  - Action: Add loading/error states

- [ ] **T5.3** (2h): Refactor newsletter detail page
  - Files: `apps/web/src/app/newsletters/[id]/page.tsx`
  - Action: Delete `newsletters` object (130+ lines)
  - Action: Use `useDigest(id)` hook
  - Action: Render title, summary, highlights, datapoints from real digest
  - Action: Add 404 handling

- [ ] **T5.4** (1h): Manual testing
  - Action: Visit `/newsletters`, verify shows real digests
  - Action: Click newsletter, verify detail page shows highlights
  - Action: Test loading states (throttle network)
  - Action: Test error states (stop API server)

### Week 2, Day 1: Reusable UI Components (6 hours)

- [ ] **T6.1** (1h): Create `StatCard` component
  - Files: `apps/web/src/components/ui/StatCard.tsx`
  - Props: `label`, `value`, `icon`, `trend`, `isLoading`
  - Action: Extract from existing KPI card markup

- [ ] **T6.2** (1h): Create `DocumentCard` component
  - Files: `apps/web/src/components/ui/DocumentCard.tsx`
  - Props: `document`, `showSource`, `showDate`
  - Action: Extract from `RecentSignalsFeed` item markup

- [ ] **T6.3** (1h): Create `NewsletterCard` component
  - Files: `apps/web/src/components/ui/NewsletterCard.tsx`
  - Props: `newsletter`, `variant` (latest|archived)
  - Action: Extract from newsletters listing markup

- [ ] **T6.4** (1h): Create `EmptyState` component
  - Files: `apps/web/src/components/ui/EmptyState.tsx`
  - Props: `title`, `message`, `action?`
  - Action: Reusable "no data" placeholder

- [ ] **T6.5** (1h): Create `LoadingState` component
  - Files: `apps/web/src/components/ui/LoadingState.tsx`
  - Variants: `skeleton`, `spinner`, `pulse`
  - Action: Reusable loading indicators

- [ ] **T6.6** (1h): Update existing components to use new UI components
  - Files: All pages and dashboard components
  - Action: Replace inline markup with `<StatCard>`, `<DocumentCard>`, etc.

### Week 2, Day 2: Component Architecture Cleanup (6 hours)

- [ ] **T7.1** (2h): Split Signals page into focused components
  - Files: `apps/web/src/app/signals/page.tsx`, `components/signals/` (new dir)
  - Action: Create `StatsCards.tsx` — Uses `useSignalsStats()`
  - Action: Create `SourcesOverviewGrid.tsx` — Uses `useSources()`
  - Action: Update page to compose these components

- [ ] **T7.2** (1h): Refactor RecentSignalsFeed into smaller components
  - Files: `apps/web/src/components/dashboard/RecentSignalsFeed.tsx`
  - Action: Extract `SignalFilters.tsx` (time range, source type dropdowns)
  - Action: Extract `SignalList.tsx` (list rendering)
  - Action: Keep parent as orchestrator

- [ ] **T7.3** (2h): Add React Error Boundary
  - Files: `apps/web/src/components/ErrorBoundary.tsx`, all page files
  - Action: Create error boundary with user-friendly message
  - Action: Wrap all pages in `<ErrorBoundary>`
  - Action: Add retry mechanism

- [ ] **T7.4** (1h): Clean up prop drilling
  - Files: Components passing `sources` through multiple levels
  - Action: Consider React Context or Zustand for shared state
  - Action: Refactor to avoid 3+ level prop passing

### Week 2, Day 3: Pagination & Performance (6 hours)

- [ ] **T8.1** (2h): Add pagination to documents API
  - Files: `apps/api/src/routes/documents.ts`
  - Action: Add `limit` and `offset` query params
  - Action: Add `total` count to response metadata
  - Action: Update `ApiResponse<T>` to include `meta: { total, limit, offset }`

- [ ] **T8.2** (2h): Implement infinite scroll in frontend
  - Files: `apps/web/src/components/dashboard/RecentSignalsFeed.tsx`
  - Action: Update `useDocuments` to support pagination
  - Action: Add "Load More" button or intersection observer
  - Action: Append new documents to existing list

- [ ] **T8.3** (1h): Add request deduplication
  - Files: SWR configuration
  - Action: Configure SWR global options (dedupingInterval, revalidation)
  - Action: Test multiple components fetching same data don't cause duplicate requests

- [ ] **T8.4** (1h): Performance testing
  - Action: Use React DevTools Profiler
  - Action: Identify unnecessary re-renders
  - Action: Add `useMemo`/`useCallback` where needed

### Week 2, Day 4-5: Polish & Testing (12 hours)

- [ ] **T9.1** (2h): ESLint/TypeScript cleanup
  - Action: Run `pnpm lint --fix` across all apps
  - Action: Fix remaining TypeScript `any` types
  - Action: Remove unused imports
  - Action: Ensure 0 warnings, 0 errors

- [ ] **T9.2** (2h): Remove console.logs, add proper logging
  - Files: All files with `console.log`/`console.error`
  - Action: Replace with structured logger (pino or winston)
  - Action: Add log levels (debug, info, warn, error)

- [ ] **T9.3** (3h): Add accessibility features
  - Files: All interactive components
  - Action: Add ARIA labels to buttons, links
  - Action: Ensure keyboard navigation works
  - Action: Test with screen reader
  - Action: Add focus indicators

- [ ] **T9.4** (3h): Write E2E tests
  - Files: `apps/web/tests/e2e/` (new)
  - Action: Set up Playwright
  - Action: Test: Navigate to /signals, see real data
  - Action: Test: Navigate to /newsletters, click newsletter, see detail
  - Action: Test: Error states (mock API failure)

- [ ] **T9.5** (2h): Documentation updates
  - Files: `README.md`, `docs/` directory
  - Action: Update README with new architecture
  - Action: Document data hooks usage
  - Action: Add API endpoint documentation
  - Action: Update copilot instructions

---

## COMPLETION CRITERIA

### P0 Done When:
- ✅ No hardcoded `latestNewsletters`, `archivedNewsletters`, `FEATURED_HIGHLIGHTS`, `AVAILABLE_NEWSLETTERS` arrays
- ✅ All pages use data hooks (`useNewsletters`, `useDocuments`, `useDigests`, `useDigest`)
- ✅ `GET /api/v1/digests/:id` returns full digest with highlights array
- ✅ Single source of truth for types in `packages/types/src/api.ts`
- ✅ Loading and error states on all pages
- ✅ `pnpm type-check` passes with 0 errors

### P1 Done When:
- ✅ All pages decomposed into focused components (<150 lines each)
- ✅ 5 reusable UI components (`StatCard`, `DocumentCard`, `NewsletterCard`, `EmptyState`, `LoadingState`)
- ✅ Digest highlights saved to DB and returned by API
- ✅ Error boundaries on all pages
- ✅ Pagination working on documents endpoint
- ✅ `pnpm lint` passes with 0 warnings

### P2 Done When:
- ✅ Infinite scroll or "Load More" implemented
- ✅ ESLint/TypeScript fully clean
- ✅ Accessibility audit passed (axe DevTools)
- ✅ E2E tests cover critical flows
- ✅ Documentation updated

---

## RISK MITIGATION

**Risk 1: SWR Configuration Complexity**
- Mitigation: Start with default config, optimize later
- Fallback: Use simple `fetch` + `useState` if SWR causes issues

**Risk 2: Database Schema Changes Break Existing Data**
- Mitigation: Test migrations on local DB first
- Fallback: Add migration rollback scripts

**Risk 3: Too Many Changes at Once**
- Mitigation: Work in phases, commit after each task
- Fallback: Use feature flags to enable/disable new data layer

**Risk 4: API Changes Break Frontend**
- Mitigation: Add API versioning (`/api/v1`)
- Fallback: Keep old endpoints until frontend migrated

---

## NEXT STEPS

1. **Review this plan** with team, get approval
2. **Create GitHub issues** for each task (link to this doc)
3. **Start with T1.1** (unify types)
4. **Work sequentially** through task queue
5. **Log progress** in `implementation-log.md` after each task
6. **Daily standup** to track blockers

**Let's build this right.** 🚀
