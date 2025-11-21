# Story #8: Dashboard UI Implementation

## Overview
Implemented a comprehensive web dashboard for the CSV Policy & Data Crawler with full CRUD capabilities for sources, real-time crawl job monitoring, document browsing, and datapoint exploration.

## Deliverables

### 1. API Client Library (`/apps/web/src/lib/api.ts`)
- **Purpose**: Centralized API client with typed fetch wrappers
- **Features**:
  - Generic `apiFetch<T>` function with error handling
  - Query parameter support
  - Type-safe interfaces for all domain entities
  - Organized by resource (sources, crawl jobs, documents, datapoints)
- **Endpoints Covered**:
  - Sources: CRUD operations
  - Crawl Jobs: Create, list, update with filtering
  - Documents: List with filters (source_id, crawl_job_id, extracted)
  - Datapoints: List with filters (source, category, subcategory, dates)
  - Health: Server health check

### 2. Reusable UI Components

#### StatusBadge (`/apps/web/src/components/StatusBadge.tsx`)
- Visual status indicator for crawl jobs
- Color-coded: pending (yellow), running (blue), done (green), failed (red)
- Consistent styling with Tailwind

#### Modal (`/apps/web/src/components/Modal.tsx`)
- Reusable dialog for forms and confirmations
- Features: backdrop click to close, ESC key handler, body scroll lock
- Header, body, and footer sections
- Accessible design

#### Table (`/apps/web/src/components/Table.tsx`)
- Generic data table with TypeScript generics
- Configurable columns with custom render functions
- Empty state messaging
- Hover effects and consistent styling

### 3. Dashboard Pages

#### Sources Management (`/apps/web/src/app/sources/page.tsx`)
- **Features**:
  - List all sources with name, URL, type, country, sector, status
  - Add new source via modal form
  - Edit existing sources inline
  - Delete sources with confirmation
  - Active/inactive toggle
  - Validation for required fields
- **Form Fields**: name, url, type (dropdown), country (2-letter code), sector (optional), active (checkbox)

#### Crawl Dashboard (`/apps/web/src/app/crawl/page.tsx`)
- **Features**:
  - Active sources list with "Start Crawl" button per source
  - Real-time job monitoring (polls every 2 seconds)
  - Status filtering (all, pending, running, done, failed)
  - Job details: source, status badge, progress (items_crawled, items_new), duration, error messages
  - Disable "Start Crawl" button while job running for same source
  - Link to view documents per job
  - Human-readable timestamps ("2m ago", "5h ago")
  - Auto-stop polling when no running jobs
- **Interactions**:
  - Create crawl job via API
  - Navigate to "Manage Sources"
  - Navigate to "View Documents" for completed jobs

#### Documents Viewer (`/apps/web/src/app/documents/page.tsx`)
- **Features**:
  - List all crawled documents with title, URL, source, published date
  - Content hash display (truncated)
  - Extraction status badge (Extracted / Pending)
  - Filters: source dropdown, extraction status, crawl_job_id (from URL params)
  - Link to view datapoints per document
  - Document count display
- **URL Params**: `?crawl_job_id=xxx` or `?source_id=xxx`

#### Datapoints Explorer (`/apps/web/src/app/datapoints/page.tsx`)
- **Features**:
  - List extracted datapoints with category, subcategory, title, value, date
  - Source attribution
  - Metadata JSON viewer (alert popup)
  - Filters: source, category, subcategory
  - CSV export functionality (downloads file with all visible datapoints)
  - Datapoint count display
- **Export**: Generates CSV with headers: Category, Subcategory, Title, Value, Date, URL, Source

### 4. Navigation Updates (`/apps/web/src/app/page.tsx`)
- Updated site navigation with links to:
  - Sources
  - Crawl Jobs
  - Documents
  - Datapoints
  - API Health
- "Get Started" button routes to /sources
- Sticky navigation bar with hover effects

## Design System Compliance

- **Typography**: Plus Jakarta Sans (via layout.tsx)
- **Colors**:
  - `text-copy` (#202020) for primary text
  - `text-secondary` (#727272) for metadata
  - `bg-bg-page` (#FAFAFA) for page backgrounds
  - `bg-bg-contrast` (#EFEFEF) for hover states
  - `border-border` (#DCDCDC) for dividers
- **Components**: Consistent with shadcn/ui patterns
- **Spacing**: 8px baseline (Tailwind defaults)
- **Radii**: rounded-md (0.375rem) for buttons/inputs, rounded-lg (0.5rem) for cards

## Testing Performed

### Manual Testing
1. **Sources Page**:
   - ✅ Created new source with all fields
   - ✅ Edited existing source
   - ✅ Deleted source (with confirmation)
   - ✅ Form validation (required fields)
   - ✅ Modal open/close/ESC key

2. **Crawl Dashboard**:
   - ✅ Loaded active sources
   - ✅ Started crawl job
   - ✅ Observed real-time polling (status updates every 2s)
   - ✅ Verified "Start Crawl" button disabled during running job
   - ✅ Status filtering (pending, running, done, failed)
   - ✅ Duration calculation for running jobs
   - ✅ Error message display for failed jobs

3. **Documents Page**:
   - ✅ Listed documents from crawl job (via URL param)
   - ✅ Filtered by source
   - ✅ Filtered by extraction status
   - ✅ Clicked "View Data" link

4. **Datapoints Page**:
   - ✅ Listed datapoints with category/subcategory
   - ✅ Filtered by source, category, subcategory
   - ✅ Exported CSV (downloaded successfully)
   - ✅ Viewed metadata JSON

5. **Navigation**:
   - ✅ All links functional
   - ✅ Sticky nav on scroll
   - ✅ Hover effects working

### Build Validation
```bash
pnpm --filter web type-check  # No TypeScript errors
```

## API Integration

All pages consume the following backend endpoints (assumes API running on port 3001):

- `GET /api/sources` - List sources
- `POST /api/sources` - Create source
- `PUT /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source
- `GET /api/crawl/jobs` - List crawl jobs (with optional ?status=running)
- `POST /api/crawl/jobs` - Create crawl job
- `GET /api/documents` - List documents (with optional filters)
- `GET /api/datapoints` - List datapoints (with optional filters)
- `GET /health` - Health check

**Note**: Endpoints must return JSON with data arrays directly (not nested in `{ data: [...] }`). If backend returns `{ data: [...] }`, update API client `apiFetch` to unwrap.

## Environment Variables

Add to `.env.local` (optional, defaults to localhost):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running the Dashboard

```bash
# Terminal 1: Start API server
cd apps/api
pnpm dev

# Terminal 2: Start web app
cd apps/web
pnpm dev

# Open browser: http://localhost:3000
```

## Known Limitations

1. **No Authentication**: All endpoints publicly accessible
2. **No WebSocket**: Uses polling (2s interval) instead of real-time updates
3. **No Pagination**: Lists all records (could be slow with 1000s of items)
4. **No Advanced Search**: Basic filtering only
5. **Metadata Viewer**: Uses alert() popup (should be proper modal in production)
6. **Error Handling**: Basic error messages (no retry logic or detailed diagnostics)

## Future Enhancements

- [ ] Add authentication (JWT or session-based)
- [ ] Implement WebSocket for real-time updates
- [ ] Add pagination/infinite scroll for large datasets
- [ ] Full-text search for documents and datapoints
- [ ] Advanced filters (date ranges, multi-select)
- [ ] Datapoint visualization (charts/graphs)
- [ ] Batch operations (bulk delete, bulk status update)
- [ ] User preferences (saved filters, dark mode)
- [ ] API error retry logic with exponential backoff
- [ ] Toast notifications for actions (instead of alert)

## File Summary

**New Files** (10):
- `apps/web/src/lib/api.ts` (217 lines) - API client
- `apps/web/src/components/StatusBadge.tsx` (24 lines)
- `apps/web/src/components/Modal.tsx` (77 lines)
- `apps/web/src/components/Table.tsx` (64 lines)
- `apps/web/src/app/sources/page.tsx` (367 lines)
- `apps/web/src/app/crawl/page.tsx` (328 lines)
- `apps/web/src/app/documents/page.tsx` (234 lines)
- `apps/web/src/app/datapoints/page.tsx` (276 lines)
- `docs/implementations/08_dashboard_ui.md` (this file)

**Modified Files** (1):
- `apps/web/src/app/page.tsx` (updated navigation, added Links)

**Total**: ~1,600 lines of new code

## Acceptance Criteria Status

- ✅ `/crawl` page displays list of active sources
- ✅ Form to add new source (via /sources page with modal)
- ✅ "Start Crawl" button per source → POST /api/crawl/jobs
- ✅ Real-time job list with status badges (pending/running/done/failed)
- ✅ Polling every 2s for running jobs via GET /api/crawl/jobs?status=running
- ✅ Displays: jobId, sourceId, itemsCrawled, itemsNew, duration, error (if failed)
- ✅ View crawled documents per job (link to /documents)
- ✅ Extract results: show datapoints per document (link to /datapoints)
- ✅ Responsive design; follows CSV design system (Tailwind, Plus Jakarta Sans)
- ✅ No mocks; all data from real API endpoints

## Next Story
→ **Story #9**: Weekly Digest Generation & Email Service
