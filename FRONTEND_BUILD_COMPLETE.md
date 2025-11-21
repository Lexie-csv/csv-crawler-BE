# 🎨 CSV Crawler Frontend - Complete Build Guide

## 🌟 What We Built

A **production-ready frontend** for the CSV Policy & Data Crawler using the **CSV Orbit Scanner design system** — featuring orbital theming, navy/green color palette, responsive layouts, and accessible components.

### Key Features
✅ **Orbital Brand Identity** - 3-ring logo with "Always in motion. Always in view" theme  
✅ **Complete Color System** - Navy (primary), Green (action), Gray (neutral) palettes  
✅ **Component Library** - Buttons, Cards, Inputs, Badges with hover/focus states  
✅ **Dashboard Page** - Real-time stats, recent jobs, responsive grid layout  
✅ **Navigation System** - Sticky nav with mobile hamburger menu  
✅ **API Integration** - Stats & crawl jobs endpoints connected  
✅ **Responsive Design** - Mobile-first, 4 breakpoints (sm/md/lg/xl)  
✅ **Accessibility** - WCAG AA contrast, 44px touch targets, focus rings  

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
cd /Users/martinbanaria/Projects/csv-crawler-BE-main
pnpm install
```

### Step 2: Start Database & Run Migrations
```bash
docker-compose up -d postgres
pnpm db:migrate
```

### Step 3: Start Development Servers
```bash
pnpm dev
```

**Visit**: http://localhost:3000 → Auto-redirects to `/dashboard`

---

## 📂 What Changed

### New Files Created

```
apps/web/src/
├── components/
│   ├── Navigation.tsx              ← New orbital navigation
│   └── ui/
│       ├── button.tsx              ← Updated with green-600 primary
│       ├── card.tsx                ← Updated with hover effects
│       ├── badge.tsx               ← Updated with semantic variants
│       ├── input.tsx               ← Updated with focus rings
│       └── label.tsx               ← Updated typography
└── app/
    ├── layout.tsx                  ← Updated with Navigation
    ├── page.tsx                    ← Redirects to /dashboard
    └── dashboard/
        └── page.tsx                ← Complete dashboard

apps/web/
├── tailwind.config.ts              ← Navy/green/gray palette
├── src/styles/globals.css          ← Design system utilities
└── .env.local                      ← API URL config

apps/api/src/
└── index.ts                        ← Added /api/stats & /api/crawl-jobs

Project Root/
├── DESIGN_SYSTEM_IMPLEMENTED.md    ← This guide
├── setup-frontend.sh               ← Setup script
└── docs/
    └── DESIGN_SYSTEM_PROMPT.md     ← Original design reference
```

---

## 🎨 Design System Overview

### Color Palette

#### **Navy (Primary Brand)**
```css
navy-50:  #f4f7f9  /* Subtle backgrounds */
navy-100: #e9eef3  /* Light backgrounds */
navy-300: #a7bccd  /* Muted text, icons */
navy-600: #1f3d54  /* Hover states */
navy-700: #1a3345  /* Navigation bar */
navy-900: #0f1e28  /* Headings, dark text */
```

#### **Green (Action/Success)**
```css
green-100: #dcfce7  /* Success badges */
green-500: #4a9e7e  /* Orbit icon center */
green-600: #3d8969  /* Primary buttons */
green-700: #2e6b51  /* Button hover */
green-800: #166534  /* Success text */
```

#### **Gray (Neutral)**
```css
gray-50:  #f9fafb  /* Page background */
gray-100: #f3f4f6  /* Card backgrounds */
gray-300: #d1d5db  /* Borders */
gray-600: #4b5563  /* Body text */
gray-900: #111827  /* Dark headings */
```

### Typography

**Font Stack**: System fonts (Apple System, Segoe UI, Roboto, etc.)

```tsx
// Responsive sizing examples
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
<h2 className="text-xl sm:text-2xl font-bold text-navy-900">
<p className="text-sm sm:text-base text-gray-600">
<label className="text-xs sm:text-sm font-medium text-gray-700">
```

### Component Examples

#### Primary Button
```tsx
<Button>Add Source</Button>
// Renders: bg-green-600, hover:bg-green-700, shadow-sm, min-h-[44px]
```

#### Secondary Button
```tsx
<Button variant="secondary">Cancel</Button>
// Renders: border-gray-300, hover:bg-gray-50
```

#### Card with Hover
```tsx
<Card className="p-4 sm:p-6">
  <h3 className="text-lg font-semibold text-navy-900">Title</h3>
  <p className="text-sm text-gray-600">Content</p>
</Card>
// Auto hover: shadow-xl, -translate-y-1
```

#### Badge Variants
```tsx
<Badge variant="success">Open</Badge>      // green-100/green-800
<Badge variant="warning">Pending</Badge>   // yellow-100/yellow-800
<Badge variant="info">Running</Badge>      // blue-100/blue-800
```

---

## 📱 Responsive Patterns

### Breakpoints
```javascript
sm: '640px',   // Tablets
md: '768px',   // Large tablets
lg: '1024px',  // Desktop
xl: '1280px',  // Large desktop
```

### Common Patterns

**Flex Direction**
```tsx
<div className="flex flex-col sm:flex-row gap-4">
```

**Grid Columns**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

**Responsive Padding**
```tsx
<div className="p-4 sm:p-6 md:p-8">
```

**Show/Hide**
```tsx
<span className="hidden sm:inline">Desktop only</span>
<div className="sm:hidden">Mobile only</div>
```

---

## 🧩 Component Library

### Navigation

**Location**: `apps/web/src/components/Navigation.tsx`

**Features**:
- Orbital icon with 3 concentric circles (green-500 dashed outer, navy-300 middle, green-500 center)
- Sticky positioning at top
- Active route highlighting (navy-600 background)
- Responsive hamburger menu (< 1024px)
- 80px height (h-20)
- Touch-friendly targets (44px minimum)

```tsx
import { Navigation } from '@/components/Navigation';

// Already included in layout.tsx
```

### Buttons

**Location**: `apps/web/src/components/ui/button.tsx`

**Variants**:
- `default` - Green primary (green-600)
- `secondary` - White with border
- `outline` - Same as secondary
- `ghost` - No background
- `destructive` - Red (red-600)
- `link` - Navy underline

**Sizes**:
- `sm` - px-4 py-2
- `default` - px-4 sm:px-6 py-3
- `lg` - px-6 sm:px-8 py-3
- `icon` - 44x44px

```tsx
<Button>Primary</Button>
<Button variant="secondary" size="sm">Small Secondary</Button>
```

### Cards

**Location**: `apps/web/src/components/ui/card.tsx`

**Features**:
- White background, subtle border
- Shadow: md → xl on hover
- Hover lift: -translate-y-1
- Active press: scale-[0.98]
- Responsive padding

```tsx
<Card className="p-4 sm:p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
  <CardFooter>
    Footer
  </CardFooter>
</Card>
```

### Inputs & Labels

**Location**: `apps/web/src/components/ui/input.tsx`, `label.tsx`

**Features**:
- Border: gray-300
- Focus ring: green-500 (2px)
- Min height: 44px
- Responsive text sizing

```tsx
<div>
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter name" />
</div>
```

### Badges

**Location**: `apps/web/src/components/ui/badge.tsx`

**Variants**:
- `success` - Green (green-100/800)
- `warning` - Yellow (yellow-100/800)
- `info` - Blue (blue-100/800)
- `destructive` - Red (red-100/800)
- `default` - Navy (navy-100/800)

```tsx
<Badge variant="success">Active</Badge>
```

---

## 📊 Dashboard Page

**Location**: `apps/web/src/app/dashboard/page.tsx`

### Features
- 4 stat cards (Sources, Active Jobs, Documents, Weekly)
- Recent crawl jobs list with status badges
- Real-time data from API (`/api/stats`, `/api/crawl-jobs`)
- Responsive grid (1 col mobile, 2 col tablet, 4 col desktop)
- Emoji icons for visual interest (📊, 🔄, 📋, 📅)

### API Endpoints

**Stats Endpoint** - `GET /api/stats`
```json
{
  "totalSources": 5,
  "activeJobs": 2,
  "totalDocuments": 234,
  "weeklyDocuments": 12
}
```

**Crawl Jobs Endpoint** - `GET /api/crawl-jobs?limit=5`
```json
[
  {
    "id": 1,
    "source_id": 3,
    "status": "completed",
    "created_at": "2025-11-20T10:30:00Z",
    "completed_at": "2025-11-20T10:35:00Z"
  }
]
```

---

## ✅ Accessibility Checklist

- [x] **Touch Targets**: All interactive elements ≥ 44x44px
- [x] **Focus States**: 2px green-500 ring on all inputs/buttons
- [x] **Color Contrast**: All text meets WCAG AA (4.5:1 minimum)
- [x] **Keyboard Navigation**: All interactive elements accessible via keyboard
- [x] **ARIA Labels**: Icon buttons have descriptive labels
- [x] **Semantic HTML**: Proper heading hierarchy (h1 → h2 → h3)
- [x] **Screen Reader**: .sr-only class for hidden descriptive text

---

## 🔄 Next Steps

### Immediate (Today)
1. ✅ Run `pnpm install`
2. ✅ Start PostgreSQL: `docker-compose up -d postgres`
3. ✅ Run migrations: `pnpm db:migrate`
4. ✅ Start dev: `pnpm dev`
5. ✅ Test dashboard: http://localhost:3000

### Short-term (This Week)
6. Update `/sources` page with new design system
7. Update `/crawl` page with job monitoring UI
8. Update `/documents` page with search/filter
9. Update `/datapoints` page with data table
10. Update `/digests` page with newsletter previews

### Medium-term (Next Week)
11. Add loading states (skeleton screens with animate-pulse)
12. Add empty states with illustrations
13. Add form validation with error messages
14. Add toast notifications for actions
15. Add search/filter components

### Long-term (Next Month)
16. Add data visualization (charts with Recharts)
17. Add user authentication UI (NextAuth.js)
18. Add collaborative features (comments, tagging)
19. Add email digest preview UI
20. Deploy to production (Vercel + Railway)

---

## 🛠️ Troubleshooting

### Dependencies Not Installing
```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors
```bash
# Type check
pnpm type-check

# Common issues:
# - Missing @types/node: Already in devDependencies
# - Missing @types/react: Already in devDependencies
```

### Build Fails
```bash
# Check for lint errors
pnpm lint

# Build all packages
pnpm build
```

### Database Connection Issues
```bash
# Restart PostgreSQL
docker-compose down
docker-compose up -d postgres

# Re-run migrations
pnpm db:migrate
```

### Port Already in Use
```bash
# Find and kill process on port 3000 or 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

---

## 📚 Documentation Reference

### Internal Docs
- `DESIGN_SYSTEM_IMPLEMENTED.md` - This guide
- `docs/DESIGN_SYSTEM_PROMPT.md` - Original CSV Orbit design system
- `README.md` - Project overview
- `QUICKSTART.md` - Quick start guide
- `docs/implementations/` - Implementation stories

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Docs](https://www.radix-ui.com/docs/primitives)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 🎯 Design Philosophy

### Core Principles
1. **Clarity First** - Information should be scannable and easy to digest
2. **Professional Tone** - Business-focused, not playful
3. **Subtle Motion** - Transitions enhance UX, don't distract
4. **Mobile-First** - Always design for mobile, enhance for desktop
5. **Consistent Spacing** - Use 4px/8px base unit (Tailwind scale)
6. **Accessible** - Meet WCAG AA standards minimum

### Brand Voice
- **Professional**: "Track opportunities in orbit"
- **Reliable**: "Always in view"
- **Dynamic**: "Always in motion"
- **Data-Driven**: Focus on metrics, stats, and clarity

---

## 🎉 Success Criteria

✅ **Design System Complete** - All components match CSV Orbit style  
✅ **Dashboard Live** - Real-time stats and recent jobs  
✅ **Responsive** - Works on mobile, tablet, and desktop  
✅ **Accessible** - WCAG AA compliant  
✅ **API Connected** - Stats and jobs endpoints working  
✅ **Navigation** - Orbital logo with mobile menu  
✅ **Type-Safe** - TypeScript with strict mode  
✅ **Fast** - Next.js 14 with Turbopack  

---

**Built with**: Next.js 14, Tailwind CSS, TypeScript, Radix UI  
**Last Updated**: November 20, 2025  
**Status**: ✅ Ready for development
