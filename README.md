# CSV Radar — Policy & Data Intelligence Platform

**Production-ready web application for monitoring regulatory and policy updates across Philippine and Southeast Asian markets.** Extract key datapoints, generate automated newsletters, and track policy signals with AI-powered classification.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-green)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://www.postgresql.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.57-orange)](https://playwright.dev/)

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd csv-crawler
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your PostgreSQL credentials

# 3. Start database and run migrations
docker-compose up -d postgres
pnpm db:migrate

# 4. Run development servers
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:3000
```

**First time?** See [Quick Start Guide](QUICKSTART.md) for detailed setup instructions.

---

## ✨ Key Features

### Web Dashboard (Production-Ready)
- 📊 **Signals Dashboard** - Real-time KPIs, document feed, intelligent filtering
- 📰 **Newsletter Management** - Browse, view, and generate automated policy digests
- ♿ **Accessibility First** - WCAG 2.1 AA compliant with full keyboard navigation
- 🎨 **Modern UI** - shadcn/ui components, Tailwind CSS, responsive design
- 🚀 **Performance** - Progressive loading, SWR caching, React.memo optimization

### Backend Crawler (Production-Ready)
- 🤖 **Multi-Page Crawling** - Headless browser support for JS-rendered content
- 🧠 **AI Classification** - GPT-4o powered policy/news/data classification
- 📊 **Structured Extraction** - Datapoints with validation and metadata
- 📧 **Automated Digests** - Weekly newsletters with highlights and analysis
- 🔍 **Full-Text Search** - PostgreSQL GIN indexes for fast document search

### Developer Experience
- ✅ **Type-Safe** - Full TypeScript across monorepo
- ✅ **Tested** - 30+ E2E tests with Playwright, Jest unit tests
- ✅ **Logged** - Structured logging with Pino (JSON in prod, pretty in dev)
- ✅ **Linted** - ESLint + Prettier, 0 errors, 0 warnings
- ✅ **Documented** - Comprehensive guides for all workflows

---

## 🏗️ Architecture

**Monorepo Structure:**
```
csv-crawler/
├── apps/
│   ├── api/              # Express REST API (port 3001)
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── routes/         # API endpoints
│   │   │   └── services/       # Business logic (crawlers, digests)
│   │   └── package.json
│   └── web/              # Next.js 14 app (port 3000)
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # React components
│       │   └── lib/            # Data hooks, API client, utilities
│       └── package.json
├── packages/
│   ├── db/               # PostgreSQL schema + migrations
│   │   ├── migrations/   # SQL migration files
│   │   └── src/          # Migration runner
│   └── types/            # Shared TypeScript types
│       └── src/api.ts    # API contracts
├── turbo.json            # Turbo monorepo config
├── pnpm-workspace.yaml   # pnpm workspaces
└── docker-compose.yml    # PostgreSQL container
```

**Technology Stack:**
- **Database:** PostgreSQL 14+ with SQL migrations
- **API:** Express 5.0 + TypeScript, REST/JSON, Pino logging
- **Web:** Next.js 14 (App Router), React 18, Tailwind CSS, Turbopack
- **Data Fetching:** SWR (stale-while-revalidate) with caching
- **Testing:** Playwright (E2E), Jest + ts-jest (unit), Supertest (API)
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks
- **AI:** OpenAI GPT-4o for classification and extraction
- **Crawling:** Playwright headless browser automation

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ (LTS recommended) - [Download](https://nodejs.org/)
- **pnpm** 8+ - Install: `npm install -g pnpm`
- **PostgreSQL** 14+ - Via Docker (recommended) or [native install](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **OpenAI API Key** - For AI classification (optional for basic usage)

**Operating System:** macOS, Linux, or WSL2 (development tested on macOS with zsh)

---

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd csv-crawler

# Install all dependencies (monorepo)
pnpm install
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your credentials
nano .env.local
```

**Required Variables:**
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/csv_crawler

# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# OpenAI (optional - needed for AI classification)
OPENAI_API_KEY=sk-...

# Environment
NODE_ENV=development
```

### 3. Database Setup

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait 5 seconds for DB to be ready
sleep 5

# Run migrations
pnpm db:migrate

# Verify migration
docker exec csv-crawler-db psql -U postgres -d csv_crawler -c "\dt"
# Should show: sources, crawl_jobs, documents, crawl_digests, etc.
```

### 4. Start Development Servers

```bash
# Option A: Start both API and Web servers
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:3000

# Option B: Start individually
pnpm dev:api   # API only (port 3001)
pnpm dev:web   # Web only (port 3000)
```

**Verify API:** `curl http://localhost:3001/health`  
**Verify Web:** Open `http://localhost:3000` in browser

---

## 🎨 User Guide

### Dashboard (`/signals`)

**Real-time policy monitoring with intelligent filtering:**

1. **KPI Cards** - View summary statistics:
   - New Signals (last 7 days)
   - New Alerts (policy documents)
   - Sources Monitored
   - Latest Newsletter

2. **Document Feed** - Browse recent policy updates:
   - Filter by time range (Today / 7 days / 30 days)
   - Filter by type (Policy / Market / News / Data)
   - Filter by source (DOE, ERC, NEA, etc.)
   - Load more documents progressively (20 at a time)

3. **Keyboard Navigation:**
   - `Tab` - Navigate between filters and documents
   - `Enter` or `Space` - Activate buttons and links
   - `Shift+Tab` - Navigate backwards

### Newsletters (`/newsletters`)

**Browse and generate automated policy digests:**

1. **List View** - Paginated table of all newsletters:
   - Source name, generation date, highlights count, datapoints count
   - Click "View" to see full digest

2. **Detail View** - Full newsletter content:
   - Executive summary with key highlights
   - Structured datapoints with context
   - Print/download functionality
   - Back navigation to list

3. **Generation** - Create new digest:
   ```bash
   cd apps/api
   pnpm tsx generate-news-digest.ts
   ```

### Sources Management (`/sources`)

**Monitor watchlist of official sites and regulators:**

- View all tracked sources
- Filter by country, type, status
- See last crawl date and statistics

---

## 🔧 Development Workflows

### Running Tests

```bash
# E2E tests with Playwright
pnpm e2e              # Headless mode
pnpm e2e:ui           # UI mode (recommended for debugging)
pnpm e2e -- --headed  # Headed mode (see browser)

# Unit tests with Jest
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test -- --coverage  # With coverage report

# Type checking
pnpm type-check       # Check all TypeScript files
```

**Test Coverage:**
- ✅ 30 E2E tests covering critical user flows
- ✅ Signals dashboard (8 tests)
- ✅ Newsletters list and detail (14 tests)
- ✅ Pagination and Load More (8 tests)

### Code Quality

```bash
# Linting
pnpm lint             # Check all files
pnpm lint:fix         # Auto-fix issues

# Formatting
pnpm format           # Format all files
pnpm format:check     # Check formatting only

# Pre-commit hooks (automatic)
git commit -m "feat(api): add endpoint"
# → Runs lint-staged + commitlint
```

**Current Status:**
- ✅ 0 ESLint errors
- ✅ 0 ESLint warnings
- ✅ All files formatted with Prettier
- ✅ Conventional commits enforced

### Building for Production

```bash
# Build all packages
pnpm build

# Build specific packages
pnpm build:api        # Backend only
pnpm build:web        # Frontend only

# Test production build
pnpm start:api        # Run built API (port 3001)
pnpm start:web        # Run built Next.js (port 3000)
```

### Database Migrations

```bash
# Create new migration
cd packages/db/migrations
# Create file: NNN_description.sql (e.g., 015_add_user_table.sql)

# Run migrations
pnpm db:migrate

# Rollback last migration
pnpm db:rollback

# View migration status
docker exec csv-crawler-db psql -U postgres -d csv_crawler -c "SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 5;"
```

---

## 📡 API Reference

### Base URL
- **Development:** `http://localhost:3001`
- **Production:** TBD

### Authentication
Currently no authentication (add JWT/API keys before production deployment).

### Endpoints

#### Documents

**List Documents**
```http
GET /api/v1/documents
```

**Query Parameters:**
- `days` (number) - Filter by days ago (default: 7)
- `limit` (number) - Results per page (default: 20, max: 100)
- `offset` (number) - Pagination offset (default: 0)
- `is_alert` (boolean) - Filter policy documents only
- `source_id` (UUID) - Filter by source
- `type` (string) - Filter by document type

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "DOE Circular No. 2025-01",
      "url": "https://www.doe.gov.ph/...",
      "crawled_at": "2025-12-16T10:00:00Z",
      "source_id": "uuid",
      "source_name": "Department of Energy",
      "content_type": "policy",
      "is_alert": true,
      "summary": "New solar feed-in tariff rates..."
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true,
  "timestamp": "2025-12-16T10:05:00Z"
}
```

**Get Single Document**
```http
GET /api/v1/documents/:id
```

#### Digests (Newsletters)

**List Digests**
```http
GET /api/v1/digests
```

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `pageSize` (number) - Results per page (default: 10)
- `sourceId` (UUID) - Filter by source

**Get Digest by ID**
```http
GET /api/v1/digests/:id
```

**Response:**
```json
{
  "id": "uuid",
  "crawl_job_id": "uuid",
  "source_id": "uuid",
  "source_name": "Combined News Sources",
  "generated_at": "2025-12-16T08:00:00Z",
  "highlights_count": 15,
  "datapoints_count": 8,
  "highlights": [
    {
      "text": "New solar FiT rate: PHP 5.90/kWh",
      "type": "policy_change",
      "category": "renewable_energy"
    }
  ],
  "datapoints": [
    {
      "field": "solar_fit_rate",
      "value": "5.90",
      "unit": "PHP/kWh",
      "effective_date": "2025-01-01"
    }
  ]
}
```

#### Sources

**List Sources**
```http
GET /api/v1/sources
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Department of Energy",
      "url": "https://www.doe.gov.ph",
      "country": "PH",
      "source_type": "government",
      "is_active": true,
      "last_crawled_at": "2025-12-16T09:00:00Z"
    }
  ]
}
```

#### Dashboard Stats

**Get Dashboard Statistics**
```http
GET /api/v1/dashboard/stats?days=7
```

**Response:**
```json
{
  "stats": {
    "newSignals": 45,
    "newAlerts": 12,
    "sourcesMonitored": 8,
    "latestDigest": {
      "id": "uuid",
      "source_name": "Combined News",
      "generated_at": "2025-12-16T08:00:00Z"
    }
  },
  "timestamp": "2025-12-16T10:00:00Z"
}
```

---

## 🎨 Design System

### Brand Guidelines
- **Name:** CSV Radar
- **Tagline:** Policy & Data Intelligence Platform
- **Style:** Clean, neutral, professional

### Typography
- **Font Family:** Plus Jakarta Sans (Google Fonts)
- **Weights:** 400 (Regular), 700 (Bold)
- **Usage:** All UI text and headings

### Color Palette

**Primary:**
- `#202020` - Brand neutral (text, icons)

**Text:**
- Copy: `#202020`
- Secondary: `#727272`
- Captions: `#A0A0A0`

**Backgrounds:**
- White: `#FFFFFF`
- Page: `#FAFAFA`
- Contrast: `#EFEFEF`

**Borders:**
- Default: `#DCDCDC` (1px)

**Semantic:**
- Success: `#22C55E` (green-500)
- Error: `#EF4444` (red-500)
- Warning: `#F59E0B` (amber-500)
- Info: `#3B82F6` (blue-500)

### Components

**UI Library:** shadcn/ui + Tailwind CSS

**Reusable Components:**
- `StatCard` - KPI display cards
- `DocumentCard` - Document/signal cards
- `EmptyState` - No data states
- `LoadingState` - Loading indicators
- `ErrorBoundary` - Error handling

**Spacing:** 8px baseline (Tailwind defaults: `space-1` = 4px, `space-2` = 8px, etc.)

**Border Radius:**
- `rounded-md` - 0.375rem (default)
- `rounded-lg` - 0.5rem (cards, modals)

---
