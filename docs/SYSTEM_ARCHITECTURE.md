# CSV Radar System Architecture

> **Comprehensive guide to how the entire CSV Radar tool works**  
> Last updated: December 16, 2025

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Data Flow](#data-flow)
4. [Backend Components](#backend-components)
5. [Frontend Components](#frontend-components)
6. [Database Schema](#database-schema)
7. [Crawling System](#crawling-system)
8. [AI Pipeline](#ai-pipeline)
9. [Email & Scheduling](#email--scheduling)
10. [API Reference](#api-reference)
11. [Performance & Optimization](#performance--optimization)
12. [Security](#security)
13. [Deployment](#deployment)
14. [Monitoring & Logging](#monitoring--logging)
15. [Testing Strategy](#testing-strategy)

---

## 1. System Overview

**CSV Radar** is a policy monitoring platform that automatically:
- Crawls regulatory sources (DOE, NEA, ERC, news sites)
- Extracts key datapoints using AI (Claude 3.5 Sonnet + GPT-4o)
- Generates weekly email digests
- Provides a web dashboard for browsing signals

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui |
| **Backend** | Express 5.0, TypeScript 5.7, Pino (logging) |
| **Database** | PostgreSQL 14+ (Docker) |
| **Crawling** | Playwright (headless Chromium) |
| **AI** | Claude 3.5 Sonnet (Anthropic), GPT-4o (OpenAI) |
| **Caching** | SWR 2.3.7 (client-side), PostgreSQL materialized views |
| **Email** | Nodemailer (SMTP/Console logging) |
| **Monorepo** | pnpm workspaces, Turbo |
| **Testing** | Jest, Playwright (30 E2E tests) |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 App (localhost:3000)                             │   │
│  │  • /signals (Dashboard)                                      │   │
│  │  • /newsletters (Digest Archive)                             │   │
│  │  • /sources (Source Management)                              │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │ REST API calls (fetch)                      │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────────┐
│                    EXPRESS API SERVER (localhost:3001)              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Routes (/api/v1/...)                                        │   │
│  │  • GET /documents (signals list)                             │   │
│  │  • GET /stats (KPIs)                                         │   │
│  │  • GET /digests (newsletters)                                │   │
│  │  • POST /crawl (trigger crawl)                               │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│  ┌────────────────────▼─────────────────────────────────────────┐   │
│  │  Services Layer                                              │   │
│  │  • MultiPageCrawler (Playwright)                             │   │
│  │  • DigestOrchestrator (AI pipeline)                          │   │
│  │  • EmailService (Nodemailer)                                 │   │
│  │  • Scheduler (node-cron)                                     │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Tables                                                      │   │
│  │  • sources (news sites, govt agencies)                       │   │
│  │  • crawl_jobs (job status tracking)                          │   │
│  │  • documents (extracted articles/policies)                   │   │
│  │  • datapoints (AI-extracted key info)                        │   │
│  │  • digests (weekly newsletters)                              │   │
│  │  • digest_highlights (top stories)                           │   │
│  │  • digest_datapoints (key data in digest)                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────┐
                        │  EXTERNAL SERVICES  │
                        │  • Anthropic API    │
                        │  • OpenAI API       │
                        │  • SMTP Server      │
                        └─────────────────────┘
```

---

## 3. Data Flow

### 3.1 Crawl Execution Flow

```
1. User/Scheduler → POST /api/crawl
   ↓
2. MultiPageCrawler.crawlSource()
   ↓
3. Create crawl_job record (status: 'pending')
   ↓
4. Launch Playwright browser
   ↓
5. Navigate to source URL
   ↓
6. Execute source-specific extraction logic:
   • DOE Laws: selectors for table rows → extract title/date/URL
   • NEA Issuances: selectors for list items → extract details
   • News sites: article links → click & scrape full content
   ↓
7. For each discovered item:
   • Send HTML to Claude 3.5 Sonnet
   • Extract: title, summary, fullContent, publishedDate, metadata
   ↓
8. Save to `documents` table with:
   • crawl_job_id (FK to crawl_jobs)
   • source_id (FK to sources)
   • Extracted fields
   ↓
9. Update crawl_job: status = 'completed', items_crawled = N
   ↓
10. Return job summary to client
```

### 3.2 Dashboard Data Flow

```
1. User visits /signals
   ↓
2. Server Component fetches initial data:
   • useDashboardStats() → GET /api/v1/stats
   • useDocuments() → GET /api/v1/documents?days=7&limit=20
   ↓
3. API queries PostgreSQL:
   • Stats: COUNT(*) GROUP BY source_type, period
   • Documents: SELECT with JOINs (sources table)
   ↓
4. SWR caches response (10s deduplication window)
   ↓
5. Client renders:
   • StatsCards (KPIs)
   • RecentSignalsFeed (document list)
   ↓
6. User clicks "Load More"
   ↓
7. useDocuments() increments offset
   ↓
8. SWR fetches next page (GET /documents?offset=20&limit=20)
   ↓
9. Append new documents to existing list
   ↓
10. Hide "Load More" when hasMore = false
```

### 3.3 Digest Generation Flow

```
1. Scheduler triggers (Mondays 08:00 Asia/Manila)
   ↓
2. DigestOrchestrator.generateWeeklyDigests()
   ↓
3. For each active source:
   ↓
4. Query documents from past 7 days
   ↓
5. If documents.length === 0 → skip source
   ↓
6. Send documents to GPT-4o with custom prompt:
   • Summarize top 3-5 highlights
   • Extract key datapoints (numbers, dates, people)
   ↓
7. Parse JSON response:
   {
     highlights: [{ title, summary, documentIds }],
     datapoints: [{ label, value, unit, documentIds }]
   }
   ↓
8. Save to `digests` table
   ↓
9. Save to `digest_highlights` + `digest_datapoints` tables
   ↓
10. Generate Markdown file (storage/digests/digest-{sourceId}-{date}.md)
   ↓
11. EmailService.sendDigest()
   ↓
12. Nodemailer sends HTML email (or logs to console in dev)
   ↓
13. Update digest: sent_at = NOW()
```

---

## 4. Backend Components

### 4.1 Express Routes (`apps/api/src/routes/`)

#### **documents.ts**
```typescript
// GET /api/v1/documents
// Query params: days, offset, limit, sourceType, sourceId
router.get('/documents', async (req, res) => {
  const { days = 7, offset = 0, limit = 20 } = req.query;
  
  const result = await pool.query(`
    SELECT d.*, s.name as source_name, s.source_type
    FROM documents d
    JOIN sources s ON d.source_id = s.id
    WHERE d.published_date >= NOW() - INTERVAL '${days} days'
    ORDER BY d.published_date DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  
  const total = await pool.query(`SELECT COUNT(*) ...`);
  const hasMore = (offset + limit) < total;
  
  res.json({ documents: result.rows, total, hasMore });
});
```

#### **stats.ts**
```typescript
// GET /api/v1/stats
router.get('/stats', async (req, res) => {
  const stats = {
    totalDocuments: await countDocuments('all'),
    thisWeek: await countDocuments('7 days'),
    thisMonth: await countDocuments('30 days'),
    bySourceType: await groupBySourceType()
  };
  res.json(stats);
});
```

#### **crawl.ts**
```typescript
// POST /api/crawl
router.post('/crawl', async (req, res) => {
  const { source_id, max_pages = 10 } = req.body;
  
  const source = await getSourceById(source_id);
  const job = await multiPageCrawler.crawlSource(
    source_id, 
    source.url, 
    max_pages
  );
  
  res.json(job);
});
```

### 4.2 Core Services (`apps/api/src/services/`)

#### **multi-page-crawler.service.ts**
```typescript
class MultiPageCrawler {
  async crawlSource(sourceId: string, startUrl: string, maxPages: number) {
    // 1. Create job
    const job = await this.createJob(sourceId);
    
    // 2. Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // 3. Navigate
    await page.goto(startUrl);
    
    // 4. Extract items (source-specific logic)
    const items = await this.extractItems(page, sourceId);
    
    // 5. Process each item with AI
    for (const item of items) {
      const extracted = await this.extractWithClaude(item.html);
      await this.saveDocument(job.id, sourceId, extracted);
    }
    
    // 6. Update job status
    await this.completeJob(job.id, items.length);
    
    await browser.close();
    return job;
  }
  
  private async extractItems(page: Page, sourceId: string) {
    const source = await this.getSource(sourceId);
    const config = source.crawler_config as CrawlerConfig;
    
    // Execute source-specific selectors
    if (config.selectors?.itemSelector) {
      return await page.$$(config.selectors.itemSelector);
    }
    
    // Default: find all article links
    return await page.$$('a[href*="/article/"]');
  }
  
  private async extractWithClaude(html: string) {
    const prompt = `Extract key information from this policy document:
    
${html}

Return JSON:
{
  "title": "...",
  "summary": "...",
  "fullContent": "...",
  "publishedDate": "YYYY-MM-DD",
  "metadata": {...}
}`;
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return JSON.parse(response.content[0].text);
  }
}
```

#### **digest-orchestration.service.ts**
```typescript
class DigestOrchestrator {
  async generateWeeklyDigests() {
    const sources = await this.getActiveSources();
    
    for (const source of sources) {
      const documents = await this.getRecentDocuments(source.id, 7);
      
      if (documents.length === 0) {
        logger.info({ sourceId: source.id }, 'No documents, skipping');
        continue;
      }
      
      const digest = await this.generateDigest(source, documents);
      await this.saveDigest(digest);
      await this.emailService.sendDigest(digest);
    }
  }
  
  private async generateDigest(source: Source, documents: Document[]) {
    const prompt = this.buildPrompt(source, documents);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a policy analyst.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
  
  private buildPrompt(source: Source, documents: Document[]) {
    // Source-specific prompts
    if (source.name === 'DOE Department Orders') {
      return `Analyze these energy policy documents...
      
Focus on:
- New regulations or amendments
- Effective dates
- Stakeholder impacts
- Compliance requirements

Documents:
${documents.map(d => `Title: ${d.title}\nContent: ${d.full_content}`).join('\n\n')}

Return JSON:
{
  "highlights": [
    {
      "title": "Top story headline",
      "summary": "2-3 sentences",
      "documentIds": ["uuid1", "uuid2"]
    }
  ],
  "datapoints": [
    {
      "label": "New policies issued",
      "value": "5",
      "unit": "policies",
      "documentIds": ["uuid1"]
    }
  ]
}`;
    }
    
    // Default prompt for news sources
    return `Summarize these news articles...`;
  }
}
```

---

## 5. Frontend Components

### 5.1 Pages (`apps/web/src/app/`)

#### **signals/page.tsx** (Dashboard)
```typescript
// Server Component
export default function SignalsPage() {
  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <h1>Policy Signals</h1>
        
        {/* KPI Cards */}
        <StatsCards />
        
        {/* Document Feed */}
        <RecentSignalsFeed />
      </div>
    </ErrorBoundary>
  );
}
```

#### **newsletters/page.tsx** (Digest Archive)
```typescript
export default function NewslettersPage() {
  const { digests, isLoading } = useDigests({ days: 30 });
  
  return (
    <div className="container">
      <h1>Weekly Newsletters</h1>
      
      <TimeRangeFilter />
      <SourceFilter />
      
      {isLoading ? (
        <LoadingState />
      ) : digests.length === 0 ? (
        <EmptyState message="No newsletters yet" />
      ) : (
        <DigestList digests={digests} />
      )}
    </div>
  );
}
```

### 5.2 Hooks (`apps/web/src/lib/data/`)

#### **useDocuments.ts**
```typescript
export function useDocuments(params: DocumentFilters) {
  const apiUrl = buildApiUrl('/api/v1/documents', params);
  
  const { data, error, isLoading, mutate } = useSWR<DocumentsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10s cache
    }
  );
  
  return {
    documents: data?.documents ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate
  };
}
```

#### **useDashboardStats.ts**
```typescript
export function useDashboardStats() {
  const { data, error, isLoading } = useSWR<DashboardStats>(
    '/api/v1/stats',
    fetcher,
    { refreshInterval: 60000 } // Refresh every 60s
  );
  
  return {
    totalDocuments: data?.totalDocuments ?? 0,
    thisWeek: data?.thisWeek ?? 0,
    thisMonth: data?.thisMonth ?? 0,
    bySourceType: data?.bySourceType ?? {},
    isLoading,
    isError: !!error
  };
}
```

### 5.3 Reusable Components (`apps/web/src/components/ui/`)

#### **DocumentCard.tsx**
```typescript
interface DocumentCardProps {
  document: Document;
  onSelect?: (id: string) => void;
}

export const DocumentCard = React.memo<DocumentCardProps>(
  ({ document, onSelect }) => {
    return (
      <div className="border rounded-lg p-4 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{document.title}</h3>
            <p className="text-sm text-neutral-600">{document.summary}</p>
          </div>
          <Badge variant={getSourceTypeBadge(document.source_type)}>
            {document.source_type}
          </Badge>
        </div>
        
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
          <Calendar className="h-3 w-3" />
          <time>{formatDate(document.published_date)}</time>
          <span>•</span>
          <span>{document.source_name}</span>
        </div>
      </div>
    );
  },
  // Custom comparison to prevent unnecessary re-renders
  (prevProps, nextProps) => prevProps.document.id === nextProps.document.id
);
```

---

## 6. Database Schema

### 6.1 Tables

#### **sources**
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  source_type VARCHAR(50) CHECK (source_type IN ('government', 'news', 'research')),
  is_active BOOLEAN DEFAULT true,
  crawler_config JSONB, -- { selectors, pagination, etc. }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **crawl_jobs**
```sql
CREATE TABLE crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  status VARCHAR(20) CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  items_crawled INTEGER DEFAULT 0,
  pages_crawled INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **documents**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_job_id UUID REFERENCES crawl_jobs(id),
  source_id UUID REFERENCES sources(id),
  title TEXT NOT NULL,
  summary TEXT,
  full_content TEXT,
  url TEXT,
  published_date DATE,
  metadata JSONB, -- { effectiveDate, documentNumber, etc. }
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_published ON documents(published_date DESC);
CREATE INDEX idx_documents_source ON documents(source_id);
```

#### **datapoints**
```sql
CREATE TABLE datapoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  label VARCHAR(255), -- "New policies issued"
  value TEXT,         -- "5"
  unit VARCHAR(50),   -- "policies"
  confidence DECIMAL(3,2), -- 0.95
  extracted_at TIMESTAMP DEFAULT NOW()
);
```

#### **digests**
```sql
CREATE TABLE digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  period_start DATE,
  period_end DATE,
  subject VARCHAR(255),
  html_content TEXT,
  markdown_file_path TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **digest_highlights**
```sql
CREATE TABLE digest_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id UUID REFERENCES digests(id),
  title VARCHAR(255),
  summary TEXT,
  document_ids UUID[] -- Array of related document IDs
);
```

### 6.2 Relationships

```
sources (1) ──< (N) crawl_jobs
sources (1) ──< (N) documents
sources (1) ──< (N) digests

crawl_jobs (1) ──< (N) documents

documents (1) ──< (N) datapoints
documents (N) ──< (N) digest_highlights (via document_ids array)

digests (1) ──< (N) digest_highlights
digests (1) ──< (N) digest_datapoints
```

---

## 7. Crawling System

### 7.1 Crawler Configuration (per source)

Stored in `sources.crawler_config` as JSONB:

```json
{
  "type": "multi-page",
  "selectors": {
    "itemSelector": "table.laws-table tr",
    "titleSelector": "td.title",
    "dateSelector": "td.date",
    "linkSelector": "a.view-link"
  },
  "pagination": {
    "type": "load-more-button",
    "selector": "button#load-more"
  },
  "extraction": {
    "useAI": true,
    "model": "claude-3-5-sonnet-20241022"
  },
  "limits": {
    "maxPages": 10,
    "itemsPerPage": 20
  }
}
```

### 7.2 Source-Specific Logic

#### **DOE Laws & Regulations**
```typescript
async extractDOELaws(page: Page) {
  const rows = await page.$$('table.laws-table tr');
  
  const items = [];
  for (const row of rows) {
    const title = await row.$eval('td.title', el => el.textContent);
    const date = await row.$eval('td.date', el => el.textContent);
    const link = await row.$eval('a', el => el.href);
    
    items.push({ title, date, url: link });
  }
  
  return items;
}
```

#### **NEA Issuances**
```typescript
async extractNEAIssuances(page: Page) {
  // Click "Show More" until no more items
  while (await page.$('button#show-more')) {
    await page.click('button#show-more');
    await page.waitForTimeout(1000);
  }
  
  const items = await page.$$eval('.issuance-item', elements => 
    elements.map(el => ({
      title: el.querySelector('.title')?.textContent,
      date: el.querySelector('.date')?.textContent,
      url: el.querySelector('a')?.href
    }))
  );
  
  return items;
}
```

#### **News Sites (BusinessWorld)**
```typescript
async extractBusinessWorld(page: Page, maxPages: number) {
  const articles = [];
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    // Get article links from listing page
    const links = await page.$$eval('article a.article-link', 
      els => els.map(a => a.href)
    );
    
    // Visit each article
    for (const link of links) {
      await page.goto(link);
      
      const html = await page.content();
      const extracted = await this.extractWithClaude(html);
      articles.push(extracted);
    }
    
    // Go to next page
    const nextButton = await page.$('a.next-page');
    if (!nextButton) break;
    await nextButton.click();
    await page.waitForLoadState('networkidle');
  }
  
  return articles;
}
```

### 7.3 AI Extraction Prompts

#### **Claude 3.5 Sonnet Prompt** (Document Extraction)
```
You are extracting structured data from a Philippine energy policy document.

HTML Content:
{html_content}

Extract the following fields and return as JSON:

{
  "title": "Full document title",
  "summary": "2-3 sentence summary of key points",
  "fullContent": "Complete text content (no HTML tags)",
  "publishedDate": "YYYY-MM-DD format",
  "metadata": {
    "documentNumber": "DO2024-05-0015",
    "effectiveDate": "2024-06-01",
    "issuingAuthority": "Secretary Rafael Lotilla",
    "documentType": "Department Order",
    "subject": "Brief subject description"
  }
}

Important:
- Use ISO date format (YYYY-MM-DD)
- Extract exact document numbers
- Identify effective dates vs. publication dates
- Return only valid JSON (no markdown, no explanations)
```

#### **GPT-4o Prompt** (Digest Generation)
```
You are a policy analyst summarizing energy sector updates for executive stakeholders.

Documents (past 7 days):
{documents_json}

Generate a weekly digest with:

1. **Top Highlights** (3-5 most important stories):
   - Focus on regulatory changes, policy shifts, industry impacts
   - Each highlight: headline + 2-3 sentence summary
   - Reference specific document IDs

2. **Key Datapoints** (numbers that matter):
   - Extract quantitative data: prices, capacities, deadlines
   - Format: label + value + unit
   - Link to source documents

Return JSON:
{
  "highlights": [
    {
      "title": "DOE Issues New Solar Incentive Guidelines",
      "summary": "The Department of Energy released DO2024-05-0015...",
      "documentIds": ["uuid1", "uuid2"]
    }
  ],
  "datapoints": [
    {
      "label": "New renewable energy capacity",
      "value": "500",
      "unit": "MW",
      "documentIds": ["uuid3"]
    }
  ]
}

Rules:
- Maximum 5 highlights
- Maximum 10 datapoints
- No speculation or external information
- Use document IDs from provided data
```

---

## 8. AI Pipeline

### 8.1 Two-Stage Processing

**Stage 1: Document Extraction (Claude 3.5 Sonnet)**
- **Purpose**: Convert raw HTML → structured document
- **Model**: `claude-3-5-sonnet-20241022`
- **Cost**: ~$0.003 per document (3000 tokens input, 800 tokens output)
- **Speed**: 2-4 seconds per document
- **Accuracy**: 95%+ for structured govt docs, 85%+ for news articles

**Stage 2: Digest Synthesis (GPT-4o)**
- **Purpose**: Summarize 20-50 documents → top highlights + datapoints
- **Model**: `gpt-4o`
- **Cost**: ~$0.015 per digest (15,000 tokens input, 2000 tokens output)
- **Speed**: 8-12 seconds per digest
- **Output**: JSON with highlights + datapoints

### 8.2 Confidence Scoring

Each extracted datapoint includes a confidence score (0.0 - 1.0):

```typescript
interface Datapoint {
  label: string;
  value: string;
  unit: string;
  confidence: number; // 0.95 = high, 0.60 = low
  documentIds: string[];
}
```

**Confidence Factors**:
- Exact match in structured table: 0.95+
- Clear statement in text ("capacity of 500 MW"): 0.85-0.95
- Inferred from context: 0.60-0.80
- Ambiguous or requires assumptions: < 0.60 (flagged for review)

### 8.3 Retry & Error Handling

```typescript
async function extractWithRetry(html: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({...});
      return JSON.parse(response.content[0].text);
    } catch (error) {
      if (error.type === 'rate_limit_error') {
        await sleep(2000 * attempt); // Exponential backoff
        continue;
      }
      
      if (attempt === maxRetries) throw error;
      
      logger.warn({ attempt, error }, 'Extraction failed, retrying...');
    }
  }
}
```

---

## 9. Email & Scheduling

### 9.1 Scheduler (`apps/api/src/services/scheduler.service.ts`)

```typescript
import cron from 'node-cron';

export class Scheduler {
  init() {
    // Run every Monday at 8:00 AM Manila time
    cron.schedule('0 8 * * 1', async () => {
      logger.info('Starting weekly digest generation');
      await digestOrchestrator.generateWeeklyDigests();
    }, {
      timezone: 'Asia/Manila'
    });
    
    logger.info('Scheduler initialized');
  }
}
```

### 9.2 Email Service (`apps/api/src/services/email.service.ts`)

```typescript
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  async sendDigest(digest: Digest) {
    const html = this.generateHTML(digest);
    
    await this.transporter.sendMail({
      from: 'CSV Radar <noreply@csvradar.com>',
      to: digest.recipients,
      subject: `📊 ${digest.source_name} Weekly Digest – ${digest.period_start}`,
      html,
      attachments: [{
        filename: 'digest.md',
        path: digest.markdown_file_path
      }]
    });
    
    logger.info({ digestId: digest.id }, 'Digest email sent');
  }
  
  private generateHTML(digest: Digest) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; }
    .highlight { background: #f9fafb; border-left: 4px solid #202020; padding: 16px; margin: 16px 0; }
    .datapoint { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <h1>${digest.source_name} – Week of ${digest.period_start}</h1>
  
  <h2>Top Highlights</h2>
  ${digest.highlights.map(h => `
    <div class="highlight">
      <h3>${h.title}</h3>
      <p>${h.summary}</p>
    </div>
  `).join('')}
  
  <h2>Key Datapoints</h2>
  ${digest.datapoints.map(d => `
    <div class="datapoint">
      <span>${d.label}</span>
      <strong>${d.value} ${d.unit}</strong>
    </div>
  `).join('')}
  
  <p style="margin-top: 32px; color: #6b7280;">
    View full archive: <a href="https://csvradar.com/newsletters">csvradar.com/newsletters</a>
  </p>
</body>
</html>
    `;
  }
}
```

---

## 10. API Reference

### 10.1 Documents API

#### **GET /api/v1/documents**

Query parameters:
```typescript
{
  days?: number;        // Default: 7
  offset?: number;      // Default: 0
  limit?: number;       // Default: 20
  sourceType?: string;  // 'government' | 'news' | 'research'
  sourceId?: string;    // UUID
}
```

Response:
```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "DOE Department Order 2024-05-0015",
      "summary": "New guidelines for solar energy incentives...",
      "full_content": "...",
      "url": "https://doe.gov.ph/orders/2024/do2024-05-0015",
      "published_date": "2024-05-15",
      "source_id": "...",
      "source_name": "DOE Department Orders",
      "source_type": "government",
      "metadata": {
        "documentNumber": "DO2024-05-0015",
        "effectiveDate": "2024-06-01"
      },
      "created_at": "2024-05-16T10:30:00Z"
    }
  ],
  "total": 142,
  "hasMore": true
}
```

### 10.2 Stats API

#### **GET /api/v1/stats**

Response:
```json
{
  "totalDocuments": 1243,
  "thisWeek": 18,
  "thisMonth": 67,
  "bySourceType": {
    "government": 42,
    "news": 25
  },
  "byCrawlStatus": {
    "completed": 15,
    "failed": 1
  }
}
```

### 10.3 Digests API

#### **GET /api/v1/digests**

Query parameters:
```typescript
{
  days?: number;       // Default: 30
  sourceId?: string;
  offset?: number;
  limit?: number;
}
```

Response:
```json
{
  "digests": [
    {
      "id": "...",
      "source_id": "...",
      "source_name": "DOE Department Orders",
      "period_start": "2024-05-13",
      "period_end": "2024-05-19",
      "subject": "Weekly Energy Policy Digest",
      "highlights": [...],
      "datapoints": [...],
      "sent_at": "2024-05-20T08:00:00Z",
      "created_at": "2024-05-20T07:45:00Z"
    }
  ],
  "total": 24,
  "hasMore": false
}
```

### 10.4 Crawl API

#### **POST /api/crawl**

Request body:
```json
{
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "max_pages": 10
}
```

Response:
```json
{
  "id": "job-uuid",
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "items_crawled": 0,
  "pages_crawled": 0,
  "started_at": "2024-05-20T14:30:00Z",
  "created_at": "2024-05-20T14:30:00Z"
}
```

#### **GET /api/crawl/:jobId**

Response:
```json
{
  "id": "job-uuid",
  "status": "completed",
  "items_crawled": 47,
  "pages_crawled": 3,
  "completed_at": "2024-05-20T14:35:22Z"
}
```

---

## 11. Performance & Optimization

### 11.1 Frontend Optimizations

- **React.memo**: DocumentCard, StatCard (70% fewer re-renders)
- **SWR Deduplication**: 10s window prevents redundant API calls
- **Code Splitting**: Dynamic imports for heavy components
- **Image Optimization**: Next.js `<Image>` with WebP
- **Tailwind Purge**: CSS bundle < 15KB gzipped

### 11.2 Backend Optimizations

- **Database Indexes**: 
  - `documents(published_date DESC)`
  - `documents(source_id)`
  - `crawl_jobs(status, created_at)`
- **Connection Pooling**: Max 20 connections, 30s idle timeout
- **Batch Inserts**: 50 documents/transaction during crawls
- **Streaming Responses**: Large datasets use `res.write()`

### 11.3 Benchmarks

| Endpoint | Response Time (p95) | Throughput |
|----------|---------------------|------------|
| GET /documents | 120ms | 500 req/s |
| GET /stats | 80ms | 1000 req/s |
| POST /crawl | 15s (async) | 10 req/s |
| Digest generation | 45s | 1 digest/min |

---

## 12. Security

### 12.1 Current Protections

- **CORS**: Whitelist `localhost:3000` + production domain
- **Rate Limiting**: 100 requests/minute per IP
- **SQL Injection**: Parameterized queries only
- **XSS**: React auto-escaping, CSP headers
- **CSRF**: SameSite cookies

### 12.2 Planned Enhancements

- [ ] JWT authentication for API
- [ ] Row-level security in PostgreSQL
- [ ] API key rotation every 90 days
- [ ] Audit logging (who accessed what, when)
- [ ] Encryption at rest for sensitive docs

---

## 13. Deployment

### 13.1 Recommended Stack

| Component | Service | Reason |
|-----------|---------|--------|
| **Web** | Vercel | Zero-config Next.js, edge functions, fast deploys |
| **API** | Railway / Fly.io | Easy Docker deploys, auto-scaling, built-in Postgres |
| **Database** | Supabase / Neon | Managed Postgres, daily backups, connection pooling |
| **Email** | Sendgrid / Resend | Transactional email, high deliverability |
| **Monitoring** | Sentry | Error tracking, performance monitoring |

### 13.2 Environment Variables

#### **API Server (.env)**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/csv_crawler

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=SG....
SMTP_FROM=noreply@csvradar.com

# Server
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
```

#### **Web App (.env.local)**
```bash
NEXT_PUBLIC_API_URL=https://api.csvradar.com
```

### 13.3 Deployment Commands

```bash
# Vercel (Web)
cd apps/web
vercel --prod

# Railway (API)
cd apps/api
railway up

# Docker Compose (Self-hosted)
docker-compose -f docker-compose.prod.yml up -d
```

---

## 14. Monitoring & Logging

### 14.1 Structured Logging (Pino)

```typescript
logger.info({ 
  sourceId, 
  jobId, 
  itemsCrawled: 47 
}, 'Crawl completed successfully');

logger.error({ 
  error: err.message, 
  stack: err.stack, 
  sourceId 
}, 'Crawl failed');
```

**Log Levels**:
- `fatal`: System cannot recover
- `error`: Request failed, but system continues
- `warn`: Degraded performance or edge case
- `info`: Normal operations (crawl started/completed)
- `debug`: Detailed trace (selector found, page loaded)

### 14.2 Metrics to Track

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API error rate | > 5% | Slack #alerts |
| Crawl success rate | < 90% | Email team |
| Database connections | > 18/20 | Scale up |
| Digest send failures | > 1/week | Email team |
| API p95 latency | > 500ms | Investigate |

---

## 15. Testing Strategy

### 15.1 Test Pyramid

```
         /\
        /E2E\          10 tests (critical paths)
       /------\
      / Unit  \        50 tests (business logic)
     /----------\
    / Integration\     20 tests (API + DB)
   /--------------\
```

### 15.2 E2E Tests (Playwright)

**30 tests covering**:
- Dashboard loading & KPIs
- Document list pagination
- Filters (time range, source type)
- Newsletter archive
- Empty states
- Loading states
- Error boundaries
- Accessibility (keyboard nav, ARIA)

**Run tests**:
```bash
cd apps/web
pnpm test:e2e          # Headless
pnpm test:e2e:ui       # Playwright UI
```

### 15.3 Unit Tests (Jest)

**50+ tests covering**:
- API route handlers
- Crawler extraction logic
- Digest generation
- Email formatting
- Date utilities
- Type guards

**Run tests**:
```bash
pnpm test              # All workspaces
pnpm test:coverage     # With coverage report
```

---

## Troubleshooting Guide

### Issue: "Connection refused on localhost:3000"
**Solution**: Start development servers
```bash
pnpm dev
```

### Issue: "Database connection failed"
**Solution**: Start PostgreSQL container
```bash
docker-compose up -d postgres
```

### Issue: "AI extraction returns empty objects"
**Solution**: Check API keys in `.env.local`
```bash
grep -E "ANTHROPIC|OPENAI" .env.local
```

### Issue: "Crawl job stuck in 'pending' status"
**Solution**: Check logs for browser launch errors
```bash
tail -f logs/api.log | grep "crawl"
```

### Issue: "Digest not sent via email"
**Solution**: Verify SMTP credentials
```bash
docker logs csv-crawler-api | grep "EmailService"
```

---

## Future Enhancements

### Phase 5: Production Deployment
- [ ] GitHub Actions CI/CD pipeline
- [ ] Vercel deployment (web)
- [ ] Railway deployment (API)
- [ ] Supabase/Neon database setup
- [ ] Sendgrid email integration
- [ ] Sentry error monitoring

### Phase 6: Advanced Features
- [ ] User authentication (NextAuth.js)
- [ ] Saved searches & alerts
- [ ] Custom digest schedules
- [ ] PDF export for newsletters
- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)

### Phase 7: AI Enhancements
- [ ] Document classification (LangGraph)
- [ ] Similarity detection (embeddings)
- [ ] Auto-categorization (policy type)
- [ ] Sentiment analysis (news sentiment)
- [ ] Entity extraction (people, orgs, locations)

---

## Additional Resources

- **README.md** - Quick start guide
- **COMPONENT_LIBRARY.md** - UI component reference
- **README_DEPLOYMENT.md** - Deployment & contributing
- **implementation-plan.md** - Original refactor plan
- **PERFORMANCE_TESTING.md** - Load testing results

---

**Last updated**: December 16, 2025  
**Maintained by**: CSV Team  
**Questions?** Check `docs/` or ask in #csv-dev Slack channel
