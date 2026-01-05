# CSV Policy & Data Crawler — Senior Architecture Review

**Reviewer:** Senior Staff Engineer, Platform Architecture  
**Date:** December 11, 2025  
**Severity Scale:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🔵 LOW

---

## EXECUTIVE SUMMARY

This codebase is **not production-ready**. It's a prototype with hardcoded UI masquerading as a functional application. The backend exists but the frontend ignores it. There's a dangerous mix of real data structures and fake data living side-by-side, making it impossible to know what's real vs. mock.

**Critical Issues:**
1. **90% of UI is hardcoded** — Pages fetch nothing from the API they're supposed to use
2. **No data layer** — Components make inline API calls or use hardcoded arrays
3. **Type safety is a lie** — Backend returns data the frontend doesn't use
4. **Duplicate truth** — Same data lives in 3+ places with different shapes
5. **Zero error handling** — Silent failures everywhere
6. **Migration chaos** — Database has fields the crawler doesn't populate

**Bottom Line:** This will collapse the moment anyone tries to add real features. It needs a complete data layer rewrite before adding any new UI.

---

## PART 1: HIGH-LEVEL ARCHITECTURE REVIEW

### 🔴 CRITICAL: The Frontend-Backend Contract Is Broken

**Problem:**  
The API serves real data. The UI ignores it and uses hardcoded arrays. There's no shared contract between them.

**Evidence:**
```typescript
// apps/web/src/app/newsletters/page.tsx (Line ~12-50)
const latestNewsletters: Newsletter[] = [
  {
    id: 'power-philippines-2025-12-11',
    title: 'Power Philippines Energy Update',
    // ... 40 lines of hardcoded data
  }
]
```

Meanwhile, the API has:
```typescript
// apps/api/src/routes/digests.ts
router.get('/', async (req, res) => {
  const digests = await query<Digest>('SELECT * FROM crawl_digests...');
  res.json({ digests }); // This is NEVER CALLED by the UI
});
```

**Why This Is Fatal:**
- When the backend changes, the UI won't know
- When the UI changes, the backend doesn't care
- Testing is impossible (what are you testing? fake data?)
- New engineers will assume the API works and waste hours debugging why their changes don't appear

**How to Fix:**
1. **Delete all hardcoded data arrays** from UI components
2. **Create a data layer** (`apps/web/src/lib/data/`) with hooks:
   ```typescript
   // apps/web/src/lib/data/useNewsletters.ts
   export function useNewsletters() {
     const { data, error, isLoading } = useSWR<Newsletter[]>(
       '/api/v1/digests',
       fetcher
     );
     return { newsletters: data?.digests || [], error, isLoading };
   }
   ```
3. **Map API responses** to UI types in one place:
   ```typescript
   // apps/web/src/lib/data/mappers.ts
   export function mapDigestToNewsletter(digest: ApiDigest): Newsletter {
     return {
       id: digest.id,
       title: digest.source_name,
       dateRange: formatDateRange(digest.crawled_at),
       // ...
     };
   }
   ```

---

### 🔴 CRITICAL: No Separation of Concerns

**Problem:**  
Components are doing everything: fetching, transforming, rendering, error handling. This is React 101 failure.

**Example:**
```typescript
// apps/web/src/components/dashboard/RecentSignalsFeed.tsx
export default function RecentSignalsFeed({ sources, loading }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadData() {
      try {
        const result = await documentsApi.list({ days: timeRange });
        setDocuments(result.documents);
      } catch (err) {
        setError('Failed to load signals');
      }
    }
    loadData();
  }, [timeRange, selectedType]);

  // 200+ more lines mixing state, rendering, filtering...
}
```

**Why This Is Bad:**
- Impossible to test the data fetching separately from rendering
- Can't reuse the fetching logic elsewhere
- Error handling is inconsistent across components
- Performance issues (re-fetching on every prop change)

**Proper Architecture:**
```
apps/web/src/
├── lib/
│   ├── api/           # API client (axios/fetch wrapper)
│   ├── data/          # Data hooks (useSWR/React Query)
│   └── mappers/       # Transform API → UI types
├── components/
│   ├── ui/            # Presentational (no data fetching)
│   └── features/      # Container components (use hooks)
└── app/               # Pages (orchestrate containers)
```

---

### 🟠 HIGH: The API Exists But Isn't Wired Up

**Problem:**  
You have working API endpoints that return real data. The UI doesn't use them.

**Unused Endpoints:**
1. `GET /api/v1/digests` — ✅ Works, returns real digests
2. `GET /api/v1/documents?is_alert=true` — ✅ Works, returns real alerts
3. `GET /api/v1/sources` — ✅ Works, returns real sources
4. `GET /api/v1/crawl-jobs` — ✅ Works, returns job history

**UI That Should Use Them But Doesn't:**
1. `/newsletters` — Uses `HARDCODED_DOE_NEWSLETTER` array (Line 58-130)
2. `/signals` — Uses `FEATURED_HIGHLIGHTS` array (Line 15-125)
3. `/` — Hardcoded KPI cards (Line 71-150)

**Fix:**
```typescript
// Before: apps/web/src/app/newsletters/page.tsx
const latestNewsletters: Newsletter[] = [ /* 40 lines */ ];

// After:
const { newsletters, isLoading } = useNewsletters();
```

**Implementation:**
```typescript
// apps/web/src/lib/data/useNewsletters.ts
import useSWR from 'swr';
import { digestsApi } from '@/lib/api';

export function useNewsletters() {
  const { data, error } = useSWR('/digests', () => digestsApi.list());
  
  return {
    newsletters: data?.digests.map(mapDigestToNewsletter) || [],
    isLoading: !error && !data,
    error
  };
}
```

---

### 🟠 HIGH: Types Are Shared But Not Used

**Problem:**  
You have a `packages/types` package. The frontend defines its own duplicate types instead of using them.

**Example:**
```typescript
// packages/types/src/index.ts (Backend truth)
export interface Document {
  id: string;
  source_id: string;
  url: string;
  title: string;
  content: string;
  is_alert: boolean;
  created_at: Date;
  // ...15 more fields
}

// apps/web/src/lib/api.ts (Frontend duplicate)
export interface Document {  // ❌ DUPLICATE!
  id: string;
  source_id: string;
  crawl_job_id: string;
  url: string;
  // ...different fields, will drift over time
}
```

**Why This Is Dangerous:**
- Backend adds a field → Frontend breaks silently
- Types drift → Runtime errors in production
- Refactoring is impossible (grep won't find both)

**Fix:**
```typescript
// apps/web/src/lib/api.ts
import type { Document, Source, Digest } from '@csv/types';

// Delete all local interface definitions
// Use @csv/types everywhere
```

Then update `apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@csv/types": ["../../packages/types/src"]
    }
  }
}
```

---

### 🟡 MEDIUM: Migration 013 Adds `is_alert` But Crawler Doesn't Set It

**Problem:**  
You added `is_alert` column in migration 013. The crawler was updated to set it. But **old documents** in the DB have `is_alert = false` even if they're policy docs.

**Evidence:**
```sql
-- Migration 013 (Line 18-21)
UPDATE documents d SET is_alert = TRUE
FROM sources s
WHERE d.source_id = s.id AND s.type = 'policy';
```

This only ran once. New crawls after Dec 10 will set it correctly. But:

**Query:**
```sql
SELECT is_alert, COUNT(*) FROM documents GROUP BY is_alert;
```

**Result:**
```
is_alert | count
---------|------
false    | 85
true     | 19
```

**Problem:**
19 alerts total, but only 0 in last 7 days (dashboard shows "New Alerts: 0").

**Why?**
All alerts are >7 days old. The crawler works, but you have no recent policy documents.

**Fix:**
This isn't broken—you just need to crawl DOE more frequently. But add a note in the README:
```markdown
## Running Crawls

Policy sources should be crawled daily:
```bash
curl -X POST http://localhost:3001/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "DOE_SOURCE_ID"}'
```
```

---

### 🔴 CRITICAL: No Loading/Error States

**Problem:**  
Every component that fetches data shows nothing while loading, then crashes if there's an error.

**Example:**
```typescript
// apps/web/src/app/signals/page.tsx (Line 20-50)
useEffect(() => {
  async function loadDashboardData() {
    try {
      const sourcesResult = await sourcesApi.list();
      setSources(sourcesResult.sources || []);
      // ...
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // ❌ No UI indication! User sees blank page.
    } finally {
      setLoading(false);
    }
  }
  loadDashboardData();
}, []);
```

**What Happens:**
1. User visits page
2. API call fails (network error, server down, etc.)
3. Console logs error
4. Page shows blank KPI cards with "—"
5. User thinks it loaded but there's no data

**Fix:**
```typescript
if (error) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-red-600">
          Failed to load dashboard
        </h2>
        <p className="text-gray-600">{error.message}</p>
        <button onClick={retry}>Retry</button>
      </div>
    </div>
  );
}

if (loading) {
  return <Skeleton />; // or spinner
}
```

---

## PART 2: HARDCODED → FUNCTIONAL PLAN

### Page-by-Page Refactor

#### 1️⃣ **Dashboard (`/signals`)**

**Currently Hardcoded:**
- KPI cards (Line 71-150): `newSignals`, `newAlerts`, `sourcesMonitored`
- Latest newsletter card (Line 140): `latestNewsletter` object
- All values are either `0`, `—`, or hardcoded strings

**Real Data Source:**
- `GET /api/v1/documents?days=7&is_alert=false` → Signals count
- `GET /api/v1/documents?days=7&is_alert=true` → Alerts count
- `GET /api/v1/sources` → Sources count
- `GET /api/v1/digests?limit=1&sort=created_at:desc` → Latest newsletter

**Refactor Plan:**

**Step 1:** Create data hooks (30 min)
```typescript
// apps/web/src/lib/data/useDashboardStats.ts
export function useDashboardStats() {
  const { data: signals } = useSWR('/documents?days=7&is_alert=false', fetcher);
  const { data: alerts } = useSWR('/documents?days=7&is_alert=true', fetcher);
  const { data: sources } = useSWR('/sources', fetcher);
  const { data: digests } = useSWR('/digests?limit=1', fetcher);
  
  return {
    newSignals: signals?.documents.length || 0,
    newAlerts: alerts?.documents.length || 0,
    sourcesMonitored: sources?.sources.length || 0,
    latestNewsletter: digests?.digests[0] || null,
    isLoading: !signals || !alerts || !sources || !digests
  };
}
```

**Step 2:** Replace hardcoded values (15 min)
```typescript
// apps/web/src/app/signals/page.tsx
const { newSignals, newAlerts, sourcesMonitored, latestNewsletter, isLoading } = useDashboardStats();

// Delete lines 25-40 (hardcoded stats object)
// Delete useEffect (lines 42-75)
```

**Step 3:** Add loading skeleton (15 min)
```typescript
if (isLoading) {
  return <DashboardSkeleton />;
}
```

---

#### 2️⃣ **Newsletters (`/newsletters`)**

**Currently Hardcoded:**
- `latestNewsletters` array (Line 12-50): 3 hardcoded newsletters
- `archivedNewsletters` array (Line 52-96): 6 hardcoded newsletters
- All IDs, titles, dates, counts are fake

**Real Data Source:**
- `GET /api/v1/digests` → Returns ALL digests from DB

**Current API Response:**
```json
{
  "digests": [
    {
      "id": "aad68e3d-...",
      "source_id": "e78c1efc-...",
      "source_name": "BusinessWorld Online",
      "crawled_at": "2025-12-10T...",
      "highlights_count": 17,
      "datapoints_count": 6
    }
  ]
}
```

**Refactor Plan:**

**Step 1:** Create mapper (20 min)
```typescript
// apps/web/src/lib/mappers/digestMapper.ts
import type { Digest } from '@csv/types';

export interface Newsletter {
  id: string;
  title: string;
  dateRange: string;
  category: string;
  highlights: number;
  datapoints: number;
  lastUpdated: string;
}

export function mapDigestToNewsletter(digest: Digest): Newsletter {
  return {
    id: digest.id,
    title: digest.source_name,
    dateRange: formatDateRange(digest.crawled_at),
    category: getCategoryFromSource(digest.source_name),
    highlights: digest.highlights_count,
    datapoints: digest.datapoints_count,
    lastUpdated: digest.crawled_at
  };
}

function getCategoryFromSource(name: string): string {
  if (name.includes('DOE')) return 'Policy';
  if (name.includes('BusinessWorld')) return 'Business News';
  if (name.includes('Power Philippines')) return 'Energy News';
  return 'General';
}
```

**Step 2:** Create hook (15 min)
```typescript
// apps/web/src/lib/data/useNewsletters.ts
export function useNewsletters() {
  const { data, error } = useSWR('/digests', fetcher);
  
  const newsletters = (data?.digests || []).map(mapDigestToNewsletter);
  
  // Split into latest (most recent per source) and archived
  const bySource = groupBy(newsletters, 'category');
  const latest = Object.values(bySource).map(group => 
    maxBy(group, 'lastUpdated')
  );
  const archived = newsletters.filter(n => !latest.includes(n));
  
  return { latest, archived, isLoading: !data && !error, error };
}
```

**Step 3:** Replace page component (20 min)
```typescript
// apps/web/src/app/newsletters/page.tsx
const { latest, archived, isLoading } = useNewsletters();

// Delete lines 12-96 (all hardcoded arrays)
```

---

#### 3️⃣ **Newsletter Detail (`/newsletters/[id]`)**

**Currently Hardcoded:**
- Entire `newsletters` object (Line 20-130): 3 newsletter detail objects with hardcoded highlights

**Real Data Source:**
- `GET /api/v1/digests/:id` → Should return digest with full content

**Problem:**
The API endpoint exists but returns minimal data:
```typescript
// apps/api/src/routes/digests.ts (Line 25-30)
router.get('/:id', async (req, res) => {
  const digest = await query('SELECT * FROM crawl_digests WHERE id = $1', [id]);
  res.json(digest[0]); // ❌ Doesn't include highlights array!
});
```

**Fix API First:**

**Step 1:** Update backend to return full digest (30 min)
```typescript
// apps/api/src/routes/digests.ts
router.get('/:id', async (req, res) => {
  const [digest] = await query(`
    SELECT 
      cd.*,
      json_agg(
        json_build_object(
          'text', h.text,
          'type', h.type,
          'source_url', h.source_url
        )
      ) as highlights
    FROM crawl_digests cd
    LEFT JOIN digest_highlights h ON h.digest_id = cd.id
    WHERE cd.id = $1
    GROUP BY cd.id
  `, [req.params.id]);
  
  res.json({ digest });
});
```

**Step 2:** Add digest_highlights table migration (20 min)
```sql
-- packages/db/migrations/014_add_digest_highlights.sql
CREATE TABLE digest_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id UUID REFERENCES crawl_digests(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type VARCHAR(50), -- 'policy', 'market', 'news'
  source_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_digest_highlights_digest_id ON digest_highlights(digest_id);
```

**Step 3:** Update digest generation to save highlights (45 min)
```typescript
// apps/api/src/services/digest-orchestration.service.ts
async saveDigest(digestData: DigestData) {
  const [digest] = await query(`
    INSERT INTO crawl_digests (source_id, highlights_count, datapoints_count, content_md)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [sourceId, highlights.length, datapoints.length, contentMd]);
  
  // Save highlights separately
  for (const highlight of highlights) {
    await query(`
      INSERT INTO digest_highlights (digest_id, text, type, source_url)
      VALUES ($1, $2, $3, $4)
    `, [digest.id, highlight.text, highlight.type, highlight.sourceUrl]);
  }
}
```

**Step 4:** Update UI to use real data (20 min)
```typescript
// apps/web/src/app/newsletters/[id]/page.tsx
const { newsletter, isLoading } = useNewsletter(id);

if (isLoading) return <Skeleton />;
if (!newsletter) return <NotFound />;

return (
  <div>
    <h1>{newsletter.title}</h1>
    {newsletter.highlights.map(h => <li key={h.id}>{h.text}</li>)}
  </div>
);
```

---

#### 4️⃣ **Recent Signals Feed**

**Currently Hardcoded:**
- `FEATURED_HIGHLIGHTS` array (Line 15-125): 10 hardcoded articles

**Real Data Source:**
- `GET /api/v1/documents?days=7&is_alert=false` → Recent news

**Refactor:**

**Step 1:** Remove hardcoded array (5 min)
```typescript
// Delete lines 15-125
```

**Step 2:** Use real documents (10 min)
```typescript
const { documents, isLoading } = useDocuments({ days: 7, is_alert: false });

return (
  <div>
    {documents.slice(0, 10).map(doc => (
      <ArticleCard key={doc.id} document={doc} />
    ))}
  </div>
);
```

---

## PART 3: TECH DEBT CHECKLIST

### 🔴 CRITICAL

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | **No data layer** | All pages | Create `lib/data/` with SWR hooks |
| 2 | **Hardcoded newsletter data** | `/newsletters` page | Wire to `/api/v1/digests` |
| 3 | **Duplicate types** | `apps/web/src/lib/api.ts` | Delete, use `@csv/types` |
| 4 | **No error boundaries** | All pages | Add React Error Boundary wrapper |
| 5 | **API endpoints unused** | All components | Replace `useState` with `useSWR` calls |

### 🟠 HIGH

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 6 | **No loading states** | All data-fetching components | Add skeleton screens |
| 7 | **Inline API calls** | `RecentSignalsFeed.tsx` | Extract to custom hooks |
| 8 | **Magic strings** | Filter dropdowns | Create enums: `TimeRange`, `SourceType` |
| 9 | **Inconsistent date formatting** | Multiple files | Create `lib/utils/date.ts` with `formatRelativeTime()` |
| 10 | **No API error handling** | `apps/web/src/lib/api.ts` | Wrap `fetch` with try/catch + toast notifications |

### 🟡 MEDIUM

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 11 | **Components too large** | `RecentSignalsFeed.tsx` (300+ lines) | Split into `SignalCard`, `SignalFilters`, `SignalList` |
| 12 | **Prop drilling** | `sources` passed through 3 levels | Use React Context or Zustand |
| 13 | **No pagination** | `/documents` API | Add `limit`/`offset` params, infinite scroll UI |
| 14 | **Unused imports** | Many files | Run ESLint auto-fix |
| 15 | **Inconsistent naming** | `jobId` vs `digestId` vs `id` | Standardize on `digestId` for newsletters |

### 🔵 LOW

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 16 | **Missing alt text** | Image tags | Add descriptive alt attributes |
| 17 | **Console.logs in production** | Multiple files | Use proper logger (`pino`, `winston`) |
| 18 | **Commented-out code** | Various | Delete dead code |
| 19 | **Tailwind duplication** | Button styles repeated | Extract to `@/components/ui/Button` |
| 20 | **No accessibility** | Interactive elements | Add ARIA labels, keyboard nav |

---

## PART 4: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)

**Goal:** Set up proper data layer

1. **Install SWR** (15 min)
   ```bash
   cd apps/web
   pnpm add swr
   ```

2. **Create data hooks directory** (30 min)
   ```bash
   mkdir -p apps/web/src/lib/data
   touch apps/web/src/lib/data/{useNewsletters,useDashboardStats,useDocuments,useSources}.ts
   ```

3. **Create API client** (45 min)
   ```typescript
   // apps/web/src/lib/api/client.ts
   import axios from 'axios';
   
   const api = axios.create({
     baseURL: '/api/v1',
     timeout: 10000
   });
   
   api.interceptors.response.use(
     response => response.data,
     error => {
       toast.error(error.message);
       throw error;
     }
   );
   
   export default api;
   ```

4. **Update tsconfig paths** (10 min)
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"],
         "@csv/types": ["../../packages/types/src"]
       }
     }
   }
   ```

---

### Phase 2: Wire Up Pages (Week 2)

**Goal:** Replace all hardcoded data

**Day 1-2: Newsletters**
- Implement `useNewsletters()` hook
- Map API response to UI types
- Replace hardcoded arrays
- Add loading skeleton

**Day 3-4: Dashboard**
- Implement `useDashboardStats()` hook
- Wire KPI cards to real counts
- Fix "Latest Newsletter" card
- Add error states

**Day 5: Signals Feed**
- Delete `FEATURED_HIGHLIGHTS`
- Wire to `useDocuments()` hook
- Add filters (time range, source type)
- Implement infinite scroll

---

### Phase 3: Backend Enhancements (Week 3)

**Goal:** Fill data gaps

1. **Add digest highlights table** (migration 014)
2. **Update digest generation** to save highlights
3. **Fix `GET /digests/:id`** to return full data
4. **Add pagination** to `/documents` endpoint
5. **Populate `published_at`** field in crawler

---

### Phase 4: Polish (Week 4)

**Goal:** Production-ready

1. **Add error boundaries**
2. **Add loading skeletons** everywhere
3. **Extract reusable components** (Button, Card, Skeleton)
4. **Add E2E tests** (Playwright)
5. **Performance audit** (React DevTools Profiler)
6. **Accessibility audit** (axe DevTools)

---

## FINAL VERDICT

**Current State:** 3/10 (Prototype)  
**Needed for Production:** 8/10  
**Estimated Effort:** 3-4 weeks (1 senior engineer)

**Biggest Risks:**
1. **Data layer doesn't exist** → App is unusable without hardcoded data
2. **No error handling** → Silent failures in production
3. **Types are duplicated** → Will drift and cause bugs
4. **API is ignored** → Wasted backend work

**What I'd Do First (If I Were Tech Lead):**

1. **Stop adding UI** until data layer exists
2. **Delete all hardcoded data** (force team to use API)
3. **Set up SWR + mappers** (2 days)
4. **Wire one page end-to-end** as example (1 day)
5. **Code review + refactor remaining pages** (1 week)

**This is fixable**, but it requires discipline: **No new features until the foundation is solid.**

---

## Questions for PM/Team

1. Do we have design specs for loading/error states?
2. What's the pagination strategy? (Infinite scroll? Page numbers?)
3. Are we tracking analytics? (Need event logging)
4. What's the refresh cadence? (SWR default is 3s—too aggressive?)
5. Do we need offline support? (Service worker? IndexedDB cache?)

---

## Next Steps

**Immediate Actions:**

1. Review this document with the team
2. Prioritize which phase to tackle first (recommend Phase 1: Foundation)
3. Create tickets for each refactor task
4. Set up a feature freeze while foundation is built
5. Schedule code review sessions to ensure quality

**Long-term Goals:**

- Establish architectural patterns for all future features
- Document API contracts (OpenAPI/Swagger)
- Set up CI/CD with type checking and tests
- Create component library documentation (Storybook)
- Implement monitoring and error tracking (Sentry)

Let me know which phase you want to implement first.
