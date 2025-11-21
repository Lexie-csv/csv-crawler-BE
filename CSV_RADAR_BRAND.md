# CSV RADAR — Brand & UI System

**CSV Radar** is Climate Smart Ventures' policy and regulatory monitoring tool, designed to track updates across Southeast Asian markets and generate weekly newsletters.

---

## Brand Identity

### Product Family
- **CSV Hub** → Central workspace (internal portal)
- **CSV Orbit** → Funding & opportunity scanner (live)
- **CSV Radar** → Policy/regulatory monitoring + newsletter tool

CSV Radar is a **sibling to CSV Orbit** and a first-class app inside **CSV Hub**.

### Logo & Icon
- **Radar glyph**: Concentric arcs in navy/green with a sweeping "beam"
- Component: `<CsvRadarLogo />`
- Usage: In navigation (8×8), standalone (larger sizes)
- **No text** in the icon when used in app header

---

## Design System

### Colors

```typescript
// Brand Colors
csvNavy   = '#003366'  // Primary navy (navigation, headings, emphasis)
csvGreen  = '#A2D45E'  // Primary green (CTAs, buttons, accents)
radarSky  = '#38BDF8'  // Radar-specific accent (scanning state, live indicators)

// Backgrounds
bgPage    = '#FAFAFA'  // Page background
bgCard    = '#FFFFFF'  // Card/surface background

// Borders
border    = '#E5E7EB'  // Standard borders
borderSub = '#D1D5DB'  // Subtle borders

// Text
textMain  = '#111827'  // Primary text
textSub   = '#6B7280'  // Secondary text
```

### Color Usage Rules
✅ **Do:**
- Use `csvNavy` for navigation bar, logo, and active states
- Use `csvGreen` for primary buttons and CTAs
- Use `radarSky` sparingly for radar-specific features (scanning animation, live status)
- Keep most surfaces white or very light gray (`bgCard`, `bgPage`)

❌ **Don't:**
- Flood entire screens with saturated color
- Use radarSky as a primary color (it's an accent only)
- Mix too many colors in a single component

### Typography

**Font:** Plus Jakarta Sans (Google Fonts)

```css
/* Base */
body: 14px, weight 400

/* Headings */
h1 (page title):      20–24px, weight 600–700
h2 (section title):   16–18px, weight 600
h3 (card title):      14–16px, weight 600

/* Special */
Badge/status labels:  11–12px, semi-bold (600)
```

**Rules:**
- Keep headings short and utilitarian
- No ALL CAPS except tiny status badges
- Use `font-semibold` (600) for most headings, `font-bold` (700) only for page titles

### Shape & Spacing

**Border Radius:**
- Cards, buttons, inputs: `rounded-lg` (0.5rem / 8px)
- Large cards: `rounded-xl` (0.75rem / 12px)
- Badges: `rounded-full`

**Shadows:**
- Cards: `shadow-sm` by default
- Hover: `shadow-md`
- No heavy shadows (no `shadow-xl`)

**Spacing:**
- Tailwind 8-pt scale: `p-4`, `p-6`, `gap-4`, `gap-6`
- Consistent spacing: 16px (p-4) or 24px (p-6) for card padding

**Motion:**
- Duration: 150–200ms
- Easing: `ease-in-out`
- Hover transforms: 
  - Buttons: `scale-[0.98]` on active
  - Cards: `scale-[1.01]` on hover (subtle)
- No excessive animations

---

## Component Library

### Navigation Bar

**Top nav** (full-width navy bar):

```tsx
- Background: csvNavy (#003366)
- Height: 64px (h-16)
- Border: border-b border-white/10
- Logo: <CsvRadarLogo className="h-8 w-8" />
- Wordmark: "CSV RADAR" (text-white, font-semibold)
- Nav items: Signals, Sources, Jobs, Newsletters
- Active state: bg-white/10 text-white border border-white/20
- Hover state: bg-white/5 text-white
```

### Buttons

**Primary button** (green):
```tsx
<Button>Action</Button>
// bg: #A2D45E, text: white, hover: opacity-90
```

**Secondary button:**
```tsx
<Button variant="secondary">Action</Button>
// bg: gray-100, text: textMain, hover: gray-200
```

**Outline button:**
```tsx
<Button variant="outline">Action</Button>
// border: border, bg: transparent, hover: gray-50
```

### Cards

**Standard card:**
```tsx
<Card className="p-6">
  <CardTitle>Title</CardTitle>
  <CardDescription>Description</CardDescription>
  <CardContent>...</CardContent>
</Card>
// bg: bgCard, border: border, rounded-xl, shadow-sm
// hover: shadow-md
```

### Badges (Status Indicators)

**Variants:**
```tsx
<Badge variant="pending">pending</Badge>    // amber-100/amber-800
<Badge variant="running">running</Badge>    // sky-100/sky-800
<Badge variant="completed">completed</Badge> // green-100/green-800
<Badge variant="failed">failed</Badge>      // red-100/red-800
```

**Style:**
- `rounded-full`
- `px-2.5 py-0.5`
- `text-xs font-semibold`

### Icons

**Library:** Lucide React

**Common icons:**
- `Radar` → Radar features, scanning
- `Globe` → Sources, countries
- `PlayCircle` → Active jobs, running processes
- `FileText` → Documents, signals
- `Mail` → Newsletters, digests
- `Settings` → Configuration
- `Bell` → Notifications
- `TrendingUp` → Metrics, growth

---

## Page Layouts

### Dashboard (Signals)

**Structure:**
1. **Page header**
   - Title: "Signals" (text-xl, font-semibold)
   - Subtitle: "Monitor policy and regulatory updates..."

2. **Stats grid** (4 columns, responsive)
   - Total Sources
   - Active Jobs
   - Total Documents
   - This Week

3. **Recent jobs list** (Card)
   - Job ID, source, date, status badge

### Sources Page

**Structure:**
- Filters at top (country, type, status)
- List of source cards:
  - Name
  - URL
  - Country + type chips
  - Last crawl status, next scheduled
  - Button: "Crawl Now" (green)

### Jobs Page (Monitoring)

**Structure:**
- List of crawl jobs:
  - Status badge (pending, running, completed, failed)
  - Started/finished timestamps
  - Error message (if failed)

### Newsletters Page

**Structure:**
- Left: Candidate signals for the week (checkboxes)
- Right: Live preview of newsletter body
- CTA buttons: "Generate Draft", "Copy to Clipboard", "Send Test"

---

## Accessibility

✅ **Requirements:**
- Minimum contrast ratios: 4.5:1 for text
- Tab/keyboard navigation for all interactive elements
- `aria-label` where icons exist without text
- Touch targets: minimum 44×44px (use `min-h-[44px]`)

---

## CSS Radar Utility Classes

Custom classes defined in `globals.css`:

```css
.radar-card
/* bg-bgCard border border-border rounded-xl p-4 shadow-sm */

.radar-badge
/* inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold */

.radar-badge-pending
/* radar-badge + bg-amber-100 text-amber-800 */

.radar-badge-running
/* radar-badge + bg-sky-100 text-sky-800 */

.radar-badge-completed
/* radar-badge + bg-green-100 text-green-800 */

.radar-badge-failed
/* radar-badge + bg-red-100 text-red-800 */
```

---

## Tailwind Config

```typescript
// tailwind.config.ts
colors: {
  csvNavy: '#003366',
  csvGreen: '#A2D45E',
  radarSky: '#38BDF8',
  bgPage: '#FAFAFA',
  bgCard: '#FFFFFF',
  border: '#E5E7EB',
  borderSub: '#D1D5DB',
  textMain: '#111827',
  textSub: '#6B7280',
}
```

---

## Component Checklist

When building new components:

1. ✅ Use shadcn/ui primitives (Card, Button, Badge, etc.)
2. ✅ Apply CSV Radar color tokens (csvNavy, csvGreen, radarSky)
3. ✅ Use Plus Jakarta Sans font
4. ✅ Follow spacing scale (p-4, p-6, gap-4, gap-6)
5. ✅ Use `rounded-lg` or `rounded-xl` for shapes
6. ✅ Apply subtle shadows (`shadow-sm`, `shadow-md`)
7. ✅ Add transitions (150ms ease-in-out)
8. ✅ Ensure 44px minimum touch targets
9. ✅ Test keyboard navigation
10. ✅ Verify WCAG AA contrast ratios

---

## Quick Reference

**Navigation:** Navy bar (#003366), white text, radar logo  
**Buttons:** Green (#A2D45E) for primary  
**Cards:** White bg, border (#E5E7EB), rounded-xl, shadow-sm  
**Badges:** Semantic variants (pending/running/completed/failed)  
**Font:** Plus Jakarta Sans, 14px base, 600 weight for headings  
**Spacing:** 4-unit/6-unit (16px/24px) for padding  
**Motion:** 150ms ease-in-out, subtle scale on hover  

---

## Mock Data Examples

When creating components, use realistic mock data:

```typescript
const MOCK_SIGNALS = [
  {
    id: 1,
    title: 'New Renewable Energy Policy',
    source: 'DOE Philippines',
    country: 'Philippines',
    effectiveDate: '2025-01-15',
    status: 'new',
    tags: ['policy', 'renewable energy'],
    type: 'regulation',
  },
  // ...more
];
```

---

**Last updated:** 2025-01-20  
**Maintained by:** CSV Team / Climate Smart Ventures
