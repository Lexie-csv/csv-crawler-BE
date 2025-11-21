# 🎯 CSV ACTIVE CONTEXT — Master Index & Story Tracker

**Last Updated**: 2025-11-12  
**Current Phase**: Story Definition & Planning  
**Next Command**: `cd /Users/lexiepelaez/Desktop/csv-crawler && cat docs/ACTIVE_CONTEXT.md`

---

## 📋 Quick Reference

### **Project Summary**
CSV is a full-stack regulatory & policy crawler for Southeast Asia (primarily Philippines) using LLM-based content fetching, deterministic datapoint extraction, and weekly digest delivery. Built with Next.js, Express, PostgreSQL, and TypeScript.

### **Tech Stack**
- **Backend**: Express.js + TypeScript, PostgreSQL 14+, Node.js 20+
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, React 18
- **Monorepo**: pnpm workspaces, Turbo orchestration
- **Testing**: Jest + ts-jest (unit), Supertest (API), Playwright (E2E)
- **Code Quality**: ESLint 9, Prettier, Husky, commitlint
- **LLM Integration**: OpenAI/Anthropic API for content fetching
- **Database**: PostgreSQL 14+, SQL migrations (no ORM for MVP)

### **Design System (CSV Brand)**
- **Font**: Plus Jakarta Sans (Google Fonts)
- **Primary**: #202020 (neutral black)
- **Text**: copy #202020, secondary #727272, captions #A0A0A0
- **Backgrounds**: white, page #FAFAFA, contrast #EFEFEF
- **Borders**: #DCDCDC (1px)
- **Spacing**: 8px baseline (Tailwind defaults)
- **Radii**: md (0.375rem), lg (0.5rem)

### **Folder Structure**
```
csv-crawler/
├── apps/
│   ├── api/                  # Express server
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   └── app.test.ts   # Integration tests
│   │   ├── jest.config.js
│   │   └── package.json
│   └── web/                  # Next.js app
│       ├── src/
│       │   ├── app/          # App Router pages
│       │   ├── components/   # Reusable components
│       │   ├── lib/          # Utilities
│       │   └── styles/       # globals.css + Tailwind
│       ├── playwright.config.ts
│       └── package.json
├── packages/
│   ├── db/                   # Database layer
│   │   ├── migrations/       # SQL files
│   │   ├── src/
│   │   │   ├── index.ts      # Connection pool
│   │   │   └── migrate.ts    # Migration runner
│   │   └── package.json
│   └── types/                # Shared TypeScript types
│       ├── src/index.ts
│       └── package.json
├── docs/
│   ├── stories/              # 📍 Story files (one per story)
│   │   ├── 01_database_schema.md
│   │   ├── 02_typescript_types.md
│   │   ├── 03_database_pool.md
│   │   ├── ... (stories #4-10)
│   │   └── README.md         # Story guide
│   ├── implementations/      # 📍 Implementation docs (created after each story)
│   │   └── README.md         # Completion tracking
│   └── ACTIVE_CONTEXT.md    # 📍 This file
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── .eslintrc.json (outdated, see eslint.config.js)
├── docker-compose.yml
└── README.md
```

---

## 🎭 Story Status & Roadmap

| # | Title | Status | Dependencies | Est. Time |
|---|-------|--------|--------------|-----------|
| 1️⃣ | Database Schema & Migrations | 🔴 Not Started | None | 30m |
| 2️⃣ | TypeScript Types & Data Models | 🔴 Not Started | None | 30m |
| 3️⃣ | Database Connection Pool | 🔴 Not Started | #1, #2 | 30m |
| 4️⃣ | API: Sources CRUD | 🔴 Not Started | #1, #3 | 30m |
| 5️⃣ | API: Crawl Job Queue | 🔴 Not Started | #1, #3, #4 | 30m |
| 6️⃣ | LLM Crawler Service | 🔴 Not Started | #3, #5 | 30m |
| 7️⃣ | Extraction Pipeline | 🔴 Not Started | #3, #6 | 30m |
| 8️⃣ | Web UI Dashboard | 🔴 Not Started | #4, #5, #6, #7 | 30m |
| 9️⃣ | Digest & Email | 🔴 Not Started | #7 | 30m |
| 🔟 | Datapoint Query API | 🔴 Not Started | #7 | 30m |

---

## 🗄️ Database Schema

### Tables to Create (Story #1)
```sql
-- sources: regulatory watchlist
CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(512) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('policy','exchange','gazette','ifi','portal','news')),
  country VARCHAR(10) NOT NULL,
  sector VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- crawl_jobs: job tracking
CREATE TABLE crawl_jobs (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  items_crawled INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- crawled_documents: raw fetched content
CREATE TABLE crawled_documents (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  crawl_job_id INTEGER REFERENCES crawl_jobs(id) ON DELETE SET NULL,
  url VARCHAR(512) NOT NULL,
  title VARCHAR(512),
  content TEXT,
  content_hash VARCHAR(64) NOT NULL UNIQUE,
  extracted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- datapoints: extracted structured data (Story #7)
CREATE TABLE datapoints (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES crawled_documents(id) ON DELETE CASCADE,
  key VARCHAR(50) NOT NULL,
  value VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  effective_date DATE,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  extractor VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- subscribers: digest recipients (Story #9)
CREATE TABLE subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  country VARCHAR(10),
  sector VARCHAR(50),
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes to Create
```sql
CREATE INDEX idx_sources_active ON sources(active);
CREATE INDEX idx_crawl_jobs_source ON crawl_jobs(source_id);
CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX idx_crawled_documents_source ON crawled_documents(source_id);
CREATE INDEX idx_crawled_documents_hash ON crawled_documents(content_hash);
CREATE INDEX idx_datapoints_document ON datapoints(document_id);
CREATE INDEX idx_datapoints_key ON datapoints(key);
CREATE INDEX idx_datapoints_date ON datapoints(effective_date);
```

---

## 📡 API Endpoints (Stories #4-10)

### Sources Management (Story #4)
```
GET  /api/v1/sources                    → List active sources (paginated)
GET  /api/v1/sources/:id                → Fetch single source
POST /api/v1/sources                    → Create new source
PUT  /api/v1/sources/:id                → Update source
DELETE /api/v1/sources/:id              → Soft delete source
```

### Crawl Jobs (Story #5)
```
POST /api/v1/crawl/start                → Create new crawl job (enqueue)
GET  /api/v1/crawl/jobs                 → List jobs (filterable)
GET  /api/v1/crawl/jobs/:jobId          → Fetch job status
```

### Datapoints (Story #10)
```
GET  /api/v1/datapoints                 → Query datapoints (filters, pagination)
GET  /api/v1/datapoints/export          → Export as CSV
GET  /api/v1/datapoints/timeseries      → Time series aggregation
```

### Digest & Email (Story #9)
```
POST /api/v1/digest/subscribe           → Subscribe to digest
POST /api/v1/digest/unsubscribe         → Unsubscribe
POST /api/v1/digest/send                → Trigger digest (admin only)
```

---

## 🚀 How to Run

### Prerequisites
```bash
# Install
pnpm install

# Environment
cp .env.example .env.local
# Fill in: DATABASE_URL, LLM_API_KEY, LLM_MODEL, SMTP credentials

# Database
docker-compose up -d postgres
pnpm db:migrate
```

### Development
```bash
pnpm dev          # Start all (web on :3000, API on :3001)
pnpm test         # Run all tests
pnpm lint         # Check code quality
pnpm format       # Auto-format
pnpm type-check   # TypeScript validation
```

### Smoke Tests
```bash
curl http://localhost:3001/health                       # API health
curl http://localhost:3001/api/v1/sources               # Sources list
open http://localhost:3000                               # Web UI
open http://localhost:3000/crawl                         # Crawl dashboard
```

---

## 🧪 Testing Strategy (TDD-First)

### Levels
1. **Unit Tests**: Service logic, utilities, validators (Jest)
2. **Integration Tests**: API routes, database queries, external API mocks (Supertest)
3. **E2E Tests**: User workflows, crawl → extract → display (Playwright)

### Key Principles
- ✅ No mocks unless testing error cases
- ✅ Real PostgreSQL (Docker) for integration tests
- ✅ Fail-fast: break early, clear error messages
- ✅ Test file location: `**/*.test.ts` or `**/*.spec.ts`
- ✅ Coverage target: ≥70% per module

### Run Tests
```bash
pnpm test                               # All tests
pnpm test -- --watch                    # Watch mode
pnpm test -- apps/api                   # API tests only
pnpm test -- --coverage                 # With coverage report
```

---

## 📝 TypeScript Types (Story #2)

All domain types exported from `packages/types/src/index.ts`:

```typescript
export interface Source {
  id: number;
  name: string;
  url: string;
  type: 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news';
  country: string;
  sector: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlJob {
  id: number;
  sourceId: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  itemsCrawled: number;
  itemsNew: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface CrawledDocument {
  id: number;
  sourceId: number;
  crawlJobId: number | null;
  url: string;
  title: string | null;
  content: string;
  contentHash: string;
  extractedAt: string | null;
  createdAt: string;
}

export interface DataPoint {
  id: number;
  documentId: number;
  key: string;
  value: string;
  unit: string | null;
  effectiveDate: string | null;
  confidence: number;
  extractor: string | null;
  createdAt: string;
}
```

---

## 🔑 Environment Variables

### `.env.local` Template
```bash
# Database
DATABASE_URL="postgres://user:pass@localhost:5432/csv"

# LLM API
LLM_API_KEY="sk-..."              # OpenAI or Anthropic API key
LLM_MODEL="gpt-4-turbo"           # or claude-3-opus

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="SG.xxxx"
# OR
SENDGRID_API_KEY="SG.xxxx"

# App Config
NODE_ENV="development"
LOG_LEVEL="debug"
CRAWL_RATE_LIMIT_MS="1000"        # 1 request per source per second
```

---

## 🎯 Next Steps (What to Do Now)

1. **Review this context file** to understand the full architecture
2. **Read each story** in order from `docs/stories/01_*.md` to `docs/stories/10_*.md`
3. **Start with Story #1**: Database schema
   ```bash
   cat docs/stories/01_database_schema.md
   ```
4. **When ready to implement**, run:
   ```bash
   # Copilot will implement the story
   # Follow the acceptance criteria and tests
   ```
5. **After implementation**, create `docs/implementations/01_database_schema.md` documenting:
   - What was built
   - Test coverage & passing tests
   - How to verify (curl commands, queries)
   - Any deviations or notes

---

## 📚 Story Files Location

```
docs/stories/
├── 01_database_schema.md          ← Start here
├── 02_typescript_types.md
├── 03_database_pool.md
├── 04_sources_crud.md
├── 05_crawl_job_queue.md
├── 06_llm_crawler.md
├── 07_extraction_pipeline.md
├── 08_dashboard_ui.md
├── 09_digest_email.md
└── 10_datapoint_query_api.md
```

---

## ✅ Completion Checklist

- [ ] Story #1: Database schema
- [ ] Story #2: TypeScript types
- [ ] Story #3: Connection pool
- [ ] Story #4: Sources CRUD API
- [ ] Story #5: Crawl job queue
- [ ] Story #6: LLM crawler service
- [ ] Story #7: Extraction pipeline
- [ ] Story #8: Dashboard UI
- [ ] Story #9: Digest & email
- [ ] Story #10: Query API

---

## 🛠️ Commands Cheat Sheet

```bash
# Development
pnpm dev                          # Start all services
pnpm test                         # Run all tests
pnpm lint                         # Check code quality
pnpm format                       # Auto-format code
pnpm type-check                   # TypeScript validation

# Database
docker-compose up -d postgres     # Start PostgreSQL
docker-compose down               # Stop PostgreSQL
pnpm db:migrate                   # Run migrations

# Git
git status                        # See changes
git add .                         # Stage changes
git commit -m "feat: ..."        # Commit (conventional commits)
git push origin main              # Push to GitHub

# Testing
pnpm test -- --watch             # Watch mode
pnpm test -- apps/api            # API tests only
pnpm test -- --coverage          # Coverage report
```

---

## 🎭 Key Principles Recap

1. **Content-First**: UI minimal, data is the focus
2. **Deterministic**: Regex + schema validation primary; LLM assist only
3. **Fail-Fast**: No silent failures; throw errors, log clearly
4. **Auditable**: Timestamp + track all actions (crawl, extract, send)
5. **Type-Safe**: Strict TypeScript, no `any`
6. **Testable**: TDD-first, ≥70% coverage, real data (no mocks)
7. **Privacy**: Respect robots.txt, rate-limit, ethical crawling

---

## 📞 Support & References

- **Design System**: See colors/fonts above; use Tailwind + shadcn/ui
- **Database**: PostgreSQL docs at postgres.org; SQL migrations in `/packages/db/migrations/`
- **LLM API**: OpenAI (openai.com) or Anthropic (anthropic.com)
- **Testing**: Jest docs, Supertest for API, Playwright for E2E
- **Next.js**: nextjs.org/docs; use App Router (no Pages Router)
- **Express**: expressjs.com; keep routes clean, logic in services

---

**📌 Bookmark this file. Return here after each story to track progress and plan next steps.**
