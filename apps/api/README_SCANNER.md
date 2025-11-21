# Policy & Market Scanner - Backend Alpha

## Overview

A headless browser-powered policy & market scanner that tracks policy moves, rate changes, guidelines, and advisories across Philippine and Southeast Asian regulatory sources.

**Core Questions Answered:**
- Is there a new/revised rule or signal?
- What does it change?
- From when (effective date)?
- Who is impacted?

**Key Features:**
- ✅ **Headless browser support** - Crawls JS-rendered content (tables, accordions, widgets)
- ✅ **Improved relevance filtering** - Domain-specific LLM prompts for policy content
- ✅ **Executive digests** - 1-2 page summaries with "What changed, So what, What to watch"
- ✅ **Multi-format export** - CSV, JSON, and PostgreSQL database
- ✅ **Signal extraction** - Circulars, rate changes, regulatory timelines, energy policy headlines

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env.local

# Add your OpenAI API key (optional, but recommended)
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

### 2. Install Dependencies

```bash
cd apps/api
pnpm install
npx playwright install chromium
```

### 3. Start PostgreSQL

```bash
docker-compose up -d postgres
pnpm db:migrate
```

### 4. Run Your First Scan

```bash
# Scan a single URL
pnpm scanner scan --url https://www.sec.gov.ph/circulars/

# Scan multiple URLs from a file
pnpm scanner scan --file example-urls.txt

# Force headless browser for all URLs
pnpm scanner scan --file example-urls.txt --headless
```

## CLI Commands

### Scan URLs

```bash
# Single URL
pnpm scanner scan --url <url>

# Multiple URLs from file
pnpm scanner scan --file urls.txt

# Options:
#   --headless          Force headless browser
#   --timeout <ms>      Page load timeout (default: 30000)
#   --export <formats>  Export formats: csv,json,db (default: json)
#   --output <dir>      Output directory (default: ./storage/exports)
```

**Example:**
```bash
pnpm scanner scan \
  --file example-urls.txt \
  --headless \
  --export csv,json,db \
  --output ./my-exports
```

### Generate Executive Digest

```bash
pnpm scanner digest \
  --input ./storage/exports/scan_results_2025-11-19.json \
  --period "November 15-19, 2025" \
  --export md,json,db \
  --output ./storage/digests
```

Output: `digest_2025-11-19.md` with:
- **Executive Summary**: High-level overview
- **What Changed**: Categorized policy changes (circulars, rate changes, etc.)
- **So What**: Impact analysis with affected parties
- **What to Watch**: Upcoming deadlines and areas needing clarification
- **Key Datapoints**: Structured data table

### Export Datapoints

```bash
pnpm scanner export \
  --input ./storage/exports/digest_2025-11-19.json \
  --format csv \
  --output ./analytics
```

### List Exports

```bash
pnpm scanner list --output ./storage/exports
```

## Output Formats

### 1. CSV - Analyst-Friendly

**scan_results.csv:**
```csv
url,title,is_relevant,relevance_score,relevance_reason,signals_count,content_length,method,has_javascript,scraped_at
https://sec.gov.ph/...,SEC Circular 2025-01,Yes,95,Contains new circular with compliance deadline,3,5240,headless,Yes,2025-11-19T10:30:00Z
```

**datapoints.csv:**
```csv
category,key,old_value,new_value,effective_date,source,impact
Rate Change,Corporate Tax Rate,30%,25%,2025-12-01,BIR Circular 2025-10,high
Energy Policy,Solar FIT,6.5 PHP/kWh,7.0 PHP/kWh,2025-11-01,ERC Order 2025-12,high
```

### 2. JSON - Structured Data

```json
{
  "generatedAt": "2025-11-19T10:30:00Z",
  "totalResults": 10,
  "relevantResults": 7,
  "results": [
    {
      "url": "https://sec.gov.ph/...",
      "title": "SEC Circular 2025-01",
      "isRelevant": true,
      "relevanceScore": 95,
      "relevanceReason": "Contains new circular with compliance deadline",
      "signals": [
        {
          "type": "circular",
          "title": "SEC Circular 2025-01",
          "description": "New reporting requirements for publicly listed companies",
          "effectiveDate": "2025-12-01T00:00:00Z",
          "impactedParties": ["publicly listed companies", "corporate secretaries"],
          "confidence": 0.95
        }
      ],
      "metadata": {
        "scrapedAt": "2025-11-19T10:30:00Z",
        "method": "headless",
        "hasJavaScript": true,
        "contentLength": 5240
      }
    }
  ]
}
```

### 3. Database - PostgreSQL Tables

**crawled_documents table:**
```sql
SELECT url, title, is_relevant, relevance_score, 
       array_length(signals, 1) as signal_count
FROM crawled_documents
WHERE is_relevant = true
ORDER BY extracted_at DESC;
```

**datapoints table:**
```sql
SELECT category, subcategory, key, value, 
       effective_date, confidence
FROM datapoints
WHERE category = 'policy_signal'
  AND confidence >= 0.7
ORDER BY effective_date DESC;
```

### 4. Markdown - Executive Digest

```markdown
# Policy & Market Scanner Digest — November 15-19, 2025

## Executive Summary
This digest covers 12 policy and market changes, including 4 high-priority 
updates. 3 key datapoints with significant market impact have been identified...

## 📋 What Changed

### New Circulars & Memoranda
**Priority**: HIGH

• **SEC Circular 2025-01**: New reporting requirements for publicly listed companies
  (Effective: Dec 1, 2025)
  *Impacted*: publicly listed companies, corporate secretaries

...
```

## Integration Examples

### Python Analytics Script

```python
import pandas as pd

# Load scan results
df = pd.read_csv('storage/exports/scan_results_2025-11-19.csv')

# Filter relevant high-confidence results
relevant = df[(df['is_relevant'] == 'Yes') & (df['relevance_score'] >= 80)]

# Analyze by method
print(relevant.groupby('method')['signals_count'].describe())

# Export for Tableau/PowerBI
relevant.to_excel('relevant_policies.xlsx', index=False)
```

### SQL Analysis

```sql
-- Top signal sources
SELECT 
    source_id,
    COUNT(*) as signal_count,
    AVG(confidence) as avg_confidence
FROM datapoints
WHERE category = 'policy_signal'
GROUP BY source_id
ORDER BY signal_count DESC;

-- Upcoming effective dates
SELECT 
    key,
    value,
    effective_date,
    EXTRACT(DAY FROM effective_date - CURRENT_DATE) as days_until
FROM datapoints
WHERE effective_date > CURRENT_DATE
ORDER BY effective_date ASC
LIMIT 10;
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLI Interface                     │
│           (scanner scan/digest/export)              │
└────────────────┬────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
┌─────────────┐      ┌──────────────┐
│   Scanner   │      │   Digest     │
│   Service   │──────│  Generator   │
│             │      │              │
│ • Playwright│      │ • LLM        │
│ • Relevance │      │   Analysis   │
│ • Signals   │      │ • Markdown   │
└─────┬───────┘      └──────┬───────┘
      │                     │
      └──────────┬──────────┘
                 ▼
        ┌────────────────┐
        │ Export Service │
        │                │
        │ • CSV          │
        │ • JSON         │
        │ • PostgreSQL   │
        └────────────────┘
```

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/csvdata

# Optional (enables LLM features)
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini  # or gpt-4o, gpt-3.5-turbo

# Scanner settings
LLM_CRAWLER_POLL_MS=5000
LLM_CRAWLER_BATCH=5
```

### URL File Format

```txt
# Comment lines start with #
https://www.sec.gov.ph/circulars/
https://www.bsp.gov.ph/Regulations/Issuances.aspx

# Blank lines are ignored

https://www.doe.gov.ph/department-circulars
```

## Troubleshooting

### Issue: "Playwright browser not found"

```bash
cd apps/api
npx playwright install chromium
```

### Issue: "OPENAI_API_KEY not found" (LLM features disabled)

The scanner will fall back to keyword-based relevance filtering. For better results:

```bash
echo "OPENAI_API_KEY=sk-your-key" >> .env.local
```

### Issue: "Database connection failed"

```bash
# Check PostgreSQL is running
docker-compose ps

# Start if needed
docker-compose up -d postgres

# Run migrations
cd ../../
pnpm db:migrate
```

### Issue: Page load timeout

Increase timeout for slow sites:

```bash
pnpm scanner scan --url <url> --timeout 60000
```

## Performance Tips

1. **Use headless selectively** - Let the scanner auto-detect JS-heavy sites
2. **Batch processing** - Scan 10-20 URLs at a time for optimal performance
3. **Rate limiting** - Add delays between scans if hitting rate limits
4. **Caching** - The system deduplicates by content hash automatically

## Roadmap

- [ ] Scheduled scanning (cron jobs)
- [ ] Email digest delivery
- [ ] Dashboard UI for results
- [ ] Multi-language support (Tagalog, Bahasa, Thai)
- [ ] PDF document parsing
- [ ] Historical trend analysis
- [ ] API endpoints for programmatic access

## Support

For issues or questions:
- Check [PRACTICAL_WORKFLOWS.md](../../docs/PRACTICAL_WORKFLOWS.md)
- Review [BACKEND_BUILD_GUIDE.md](../../docs/BACKEND_BUILD_GUIDE.md)
- Examine logs in `storage/exports/` directory

---

**CSV Policy & Market Scanner** - Backend Alpha v1.0.0
