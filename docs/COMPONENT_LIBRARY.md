# Component Library Documentation

Comprehensive guide to reusable UI components in CSV Radar.

---

## Overview

The CSV Radar component library provides production-ready, accessible, and type-safe React components built with shadcn/ui and Tailwind CSS.

**Location:** `apps/web/src/components/ui/`

**Design Principles:**
- ♿ **Accessibility First** - WCAG 2.1 AA compliant
- 🎨 **Design System** - Consistent with CSV Radar brand
- 🔒 **Type-Safe** - Full TypeScript support
- ⚡ **Performance** - React.memo optimization where needed
- 🧩 **Composable** - Easy to combine and customize

---

## Core Components

### StatCard

**Purpose:** Display KPI statistics with optional icons and trends.

**Location:** `apps/web/src/components/ui/StatCard.tsx`

**Props:**
```typescript
interface StatCardProps {
  label: string;              // Card label (e.g., "New Signals")
  value: string | number;     // Stat value (e.g., 45)
  icon?: React.ReactNode;     // Optional icon component
  trend?: {
    value: number;            // Trend percentage (e.g., 12)
    isPositive: boolean;      // Up (green) or down (red)
  };
  loading?: boolean;          // Show skeleton state
  onClick?: () => void;       // Optional click handler
  className?: string;         // Additional CSS classes
}
```

**Usage Example:**
```tsx
import { StatCard } from '@/components/ui';
import { FileText } from 'lucide-react';

<StatCard
  label="New Signals"
  value={45}
  icon={<FileText className="h-5 w-5" />}
  trend={{ value: 12, isPositive: true }}
  loading={isLoading}
  onClick={() => router.push('/signals')}
/>
```

**Features:**
- ✅ Automatic number formatting (commas for 1000+)
- ✅ Skeleton loading state
- ✅ Optional click interaction
- ✅ Accessible with `role="region"` and `aria-label`
- ✅ Responsive hover states

**Accessibility:**
- `role="region"` - Identifies card as landmark
- `aria-label` - Descriptive label for screen readers
- `aria-live="polite"` on value - Announces changes
- Keyboard accessible when `onClick` provided

---

### DocumentCard

**Purpose:** Display document/signal summaries with metadata.

**Location:** `apps/web/src/components/ui/DocumentCard.tsx`

**Props:**
```typescript
interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    url: string;
    crawled_at: string;       // ISO 8601 date
    source_name?: string;
    content_type?: string;    // "policy" | "news" | "market" | "data"
    summary?: string;
  };
  maxSummaryLength?: number;  // Default: 200 characters
  className?: string;
}
```

**Usage Example:**
```tsx
import { DocumentCard } from '@/components/ui';

<DocumentCard
  document={{
    id: "123",
    title: "DOE Circular No. 2025-01",
    url: "https://doe.gov.ph/...",
    crawled_at: "2025-12-16T10:00:00Z",
    source_name: "Department of Energy",
    content_type: "policy",
    summary: "New solar feed-in tariff rates announced..."
  }}
  maxSummaryLength={150}
/>
```

**Features:**
- ✅ Type badge with color coding (Policy = blue, News = green, etc.)
- ✅ Relative time display ("2 hours ago")
- ✅ Automatic summary truncation with "Read more"
- ✅ External link indicator
- ✅ Responsive layout

**Accessibility:**
- `article` tag - Semantic HTML
- `aria-labelledby` - Links title to article
- External link `aria-label` - "Read full article (opens in new tab)"
- Keyboard accessible links

**Color Coding:**
- Policy: `bg-blue-100 text-blue-800`
- News: `bg-green-100 text-green-800`
- Market: `bg-purple-100 text-purple-800`
- Data: `bg-orange-100 text-orange-800`

**Performance:**
- React.memo with custom comparison (`arePropsEqual`)
- Only re-renders when document ID or props change
- ~70% reduction in re-renders during pagination

---

### EmptyState

**Purpose:** Display "no data" states with helpful messaging.

**Location:** `apps/web/src/components/ui/EmptyState.tsx`

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;     // Optional icon (default: FileX)
  title: string;              // Main message
  description?: string;       // Supporting text
  action?: {
    label: string;            // Button text
    onClick: () => void;      // Button handler
  };
  className?: string;
}
```

**Usage Example:**
```tsx
import { EmptyState } from '@/components/ui';
import { Inbox } from 'lucide-react';

<EmptyState
  icon={<Inbox className="h-12 w-12 text-gray-400" />}
  title="No documents found"
  description="Try adjusting your filters or check back later for new updates."
  action={{
    label: "Reset filters",
    onClick: handleResetFilters
  }}
/>
```

**Features:**
- ✅ Customizable icon (default: FileX from lucide-react)
- ✅ Optional action button
- ✅ Centered layout with padding
- ✅ Gray color scheme (neutral)

**Accessibility:**
- `role="status"` - Announces content changes
- `aria-live="polite"` - Screen reader announces when shown
- Semantic heading hierarchy

---

### LoadingState

**Purpose:** Display loading indicators during data fetching.

**Location:** `apps/web/src/components/ui/LoadingState.tsx`

**Props:**
```typescript
interface LoadingStateProps {
  variant?: 'skeleton' | 'spinner' | 'pulse';  // Default: skeleton
  count?: number;           // Number of skeleton items (default: 3)
  message?: string;         // Optional loading message
  className?: string;
}
```

**Usage Example:**
```tsx
import { LoadingState } from '@/components/ui';

// Skeleton variant (default)
<LoadingState count={5} />

// Spinner variant
<LoadingState variant="spinner" message="Loading documents..." />

// Pulse variant
<LoadingState variant="pulse" count={3} />
```

**Variants:**

**1. Skeleton** (Default)
- Gray animated boxes
- Mimics content structure
- Best for: Lists, cards, tables

**2. Spinner**
- Rotating circle animation
- Optional message below
- Best for: Actions, buttons, initial loads

**3. Pulse**
- Pulsing opacity animation
- Subtle, less distracting
- Best for: Inline content, small updates

**Accessibility:**
- `role="status"` - Identifies as status indicator
- `aria-live="polite"` - Announces to screen readers
- `aria-busy="true"` - Indicates loading state

---

### ErrorBoundary

**Purpose:** Catch and handle React runtime errors gracefully.

**Location:** `apps/web/src/components/ErrorBoundary.tsx`

**Props:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // Custom error UI (optional)
}
```

**Usage Example:**
```tsx
import { ErrorBoundary } from '@/components';

<ErrorBoundary>
  <SignalsPage />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<CustomErrorUI />}>
  <NewsletterDetail />
</ErrorBoundary>
```

**Features:**
- ✅ Catches JavaScript errors in component tree
- ✅ Prevents app crashes
- ✅ Provides recovery options ("Try again", "Go to home")
- ✅ Logs errors to console (ready for Sentry integration)
- ✅ Collapsible stack trace details

**Default Error UI:**
- Red alert icon
- "Something went wrong" heading
- User guidance text
- "Try again" button (resets error state)
- "Go to home" button (navigates to safety)
- Collapsible error details section

**Accessibility:**
- `role="alert"` - Announces errors immediately
- `aria-live="assertive"` - High priority announcement
- Keyboard accessible buttons
- Focus management on error

---

## Filter Components

### TimeRangeFilter

**Purpose:** Filter data by time range (Today, 7 days, 30 days).

**Location:** `apps/web/src/components/ui/TimeRangeFilter.tsx`

**Props:**
```typescript
interface TimeRangeFilterProps {
  value: number;              // Current days value (1, 7, or 30)
  onChange: (days: number) => void;
  className?: string;
}
```

**Usage Example:**
```tsx
import { TimeRangeFilter } from '@/components/ui';

const [days, setDays] = useState(7);

<TimeRangeFilter value={days} onChange={setDays} />
```

**Features:**
- ✅ Three preset options: Today (1), 7 days, 30 days
- ✅ Radio button group
- ✅ Highlighted active state
- ✅ Responsive layout

**Accessibility:**
- `fieldset` with `legend` - Groups related controls
- `role="radiogroup"` - Identifies as radio group
- `aria-labelledby` - Links to label
- Keyboard navigation (arrow keys)

---

### SourceTypeFilter

**Purpose:** Filter documents by type (Policy, Market, News, Data).

**Location:** `apps/web/src/components/ui/SourceTypeFilter.tsx`

**Props:**
```typescript
interface SourceTypeFilterProps {
  value: string;              // "all" | "policy" | "market" | "news" | "data"
  onChange: (type: string) => void;
  className?: string;
}
```

**Usage Example:**
```tsx
import { SourceTypeFilter } from '@/components/ui';

const [contentType, setContentType] = useState('all');

<SourceTypeFilter value={contentType} onChange={setContentType} />
```

---

### SourceFilter

**Purpose:** Filter documents by source (e.g., DOE, ERC, NEA).

**Location:** `apps/web/src/components/ui/SourceFilter.tsx`

**Props:**
```typescript
interface SourceFilterProps {
  value: string;              // Selected source ID or "all"
  onChange: (sourceId: string) => void;
  sources: Source[];          // Array of source objects
  className?: string;
}
```

**Usage Example:**
```tsx
import { SourceFilter } from '@/components/ui';
import { useSources } from '@/lib/data/useSources';

const { sources } = useSources();
const [sourceId, setSourceId] = useState('all');

<SourceFilter
  value={sourceId}
  onChange={setSourceId}
  sources={sources}
/>
```

---

## Signal-Specific Components

### StatsCards

**Purpose:** Display dashboard KPI cards (Signals, Alerts, Sources, Newsletter).

**Location:** `apps/web/src/components/signals/StatsCards.tsx`

**Props:**
```typescript
interface StatsCardsProps {
  stats: {
    newSignals: number;
    newAlerts: number;
    sourcesMonitored: number;
    latestDigest?: {
      id: string;
      source_name: string;
      generated_at: string;
    };
  };
  isLoading?: boolean;
}
```

**Usage Example:**
```tsx
import { StatsCards } from '@/components/signals';
import { useDashboardStats } from '@/lib/data/useDashboardStats';

const { stats, isLoading } = useDashboardStats({ days: 7 });

<StatsCards stats={stats} isLoading={isLoading} />
```

**Features:**
- ✅ 4 pre-configured stat cards
- ✅ Icons from lucide-react
- ✅ Newsletter card clickable (navigates to detail)
- ✅ Loading states for all cards

---

### SignalFilters

**Purpose:** Composed filter controls for signals page.

**Location:** `apps/web/src/components/signals/SignalFilters.tsx`

**Props:**
```typescript
interface SignalFiltersProps {
  days: number;
  onDaysChange: (days: number) => void;
  contentType: string;
  onContentTypeChange: (type: string) => void;
  sourceId: string;
  onSourceIdChange: (id: string) => void;
}
```

**Features:**
- ✅ Combines TimeRangeFilter, SourceTypeFilter, SourceFilter
- ✅ Fetches sources internally (no prop drilling)
- ✅ Responsive grid layout

---

### SignalList

**Purpose:** Display list of documents with Load More pagination.

**Location:** `apps/web/src/components/signals/SignalList.tsx`

**Props:**
```typescript
interface SignalListProps {
  documents: Document[];
  total: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  onLoadMore: () => void;
}
```

**Features:**
- ✅ DocumentCard grid layout
- ✅ "Load More" button with progress indicator
- ✅ "View all documents" link when complete
- ✅ Empty state when no documents
- ✅ Error state with helpful message
- ✅ Loading skeleton

---

## Best Practices

### Importing Components

**Prefer barrel imports:**
```tsx
// ✅ Good
import { StatCard, DocumentCard, EmptyState } from '@/components/ui';

// ❌ Avoid
import StatCard from '@/components/ui/StatCard';
import DocumentCard from '@/components/ui/DocumentCard';
```

### Accessibility

**Always provide descriptive labels:**
```tsx
// ✅ Good
<StatCard label="New Signals" value={45} />
<DocumentCard document={doc} />

// ❌ Avoid
<div>45</div>
<a href={doc.url}>Link</a>
```

### Performance

**Use React.memo for list items:**
```tsx
// DocumentCard is already memoized
{documents.map(doc => (
  <DocumentCard key={doc.id} document={doc} />
))}
```

### Styling

**Use Tailwind utilities, avoid inline styles:**
```tsx
// ✅ Good
<div className="p-4 bg-white rounded-lg shadow">

// ❌ Avoid
<div style={{ padding: '16px', background: 'white' }}>
```

### Error Handling

**Wrap pages in ErrorBoundary:**
```tsx
// ✅ Good
<ErrorBoundary>
  <SignalsPage />
</ErrorBoundary>

// ❌ Avoid
<SignalsPage /> // No error handling
```

---

## Testing Components

### Accessibility Testing

```bash
# Run E2E tests with accessibility checks
pnpm e2e

# Test specific component
pnpm e2e -- --grep "StatCard"
```

### Manual Testing Checklist

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces all content
- [ ] Focus indicators visible
- [ ] Loading states display correctly
- [ ] Empty states are helpful
- [ ] Error states provide recovery options
- [ ] Mobile responsive (test at 320px, 768px, 1024px)
- [ ] Dark mode support (if enabled)

---

## Future Components

### Planned Additions

- [ ] **PaginationControls** - Traditional page-based pagination
- [ ] **SearchInput** - Full-text search with autocomplete
- [ ] **FilterChips** - Active filter display with removal
- [ ] **SortControls** - Column sorting for tables
- [ ] **ExportButton** - CSV/JSON/PDF export
- [ ] **DateRangePicker** - Custom date range selection
- [ ] **NotificationBadge** - Unread count indicators
- [ ] **Tooltip** - Contextual help text
- [ ] **Modal** - Dialog overlays
- [ ] **Toast** - Temporary notifications

---

**Last Updated:** December 16, 2025  
**Maintained By:** CSV Team
