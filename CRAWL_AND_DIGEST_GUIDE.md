# Complete Crawl & Digest Guide

## Overview
This guide walks you through the complete process:
1. Add a source (like DOE website)
2. Start a crawl job
3. Monitor the crawl progress
4. View the generated digest

---

## Prerequisites

### 1. Check Database is Running
```bash
docker-compose up -d postgres
```

### 2. Run Migrations
```bash
cd packages/db
pnpm migrate
```

### 3. Check Environment Variables
Make sure you have `.env` in the root with:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/csv_crawler

# OpenAI for LLM extraction
OPENAI_API_KEY=your_key_here

# Optional: Email
SENDGRID_API_KEY=your_key_here
```

### 4. Start Both Servers
```bash
# From project root
pnpm dev
```

This starts:
- API Server: http://localhost:3001
- Web Frontend: http://localhost:3000

---

## Step-by-Step: Complete Flow

### Step 1: Add a Source

**Via UI (http://localhost:3000/sources):**
1. Click "Add Source" button
2. Fill in the form:
   - **Name**: `DOE Department Circulars`
   - **URL**: `https://www.doe.gov.ph/department-circulars`
   - **Type**: Select `policy`
   - **Country**: `PH`
   - **Sector**: `energy` (optional)
   - **Active**: ✅ checked
3. Click "Save"

**Via API (cURL):**
```bash
curl -X POST http://localhost:3001/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DOE Department Circulars",
    "url": "https://www.doe.gov.ph/department-circulars",
    "type": "policy",
    "country": "PH",
    "sector": "energy",
    "active": true
  }'
```

**Response:**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "DOE Department Circulars",
    "url": "https://www.doe.gov.ph/department-circulars",
    "type": "policy",
    "country": "PH",
    "sector": "energy",
    "active": true
  }
}
```

Copy the `id` - you'll need it for the next step!

---

### Step 2: Start a Crawl Job

**Via UI (http://localhost:3000/jobs):**
1. Find your source in the "Active Sources" list
2. Click the "Start Crawl" button
3. Configure crawl options in the modal:
   - **Multi-Page Crawling**: ✅ Enable (for comprehensive crawl)
   - **Max Depth**: `2` (crawl linked pages up to 2 levels deep)
   - **Max Pages**: `50` (limit to prevent endless crawling)
   - **Concurrency**: `3` (parallel requests)
4. Click "Start Crawl"

**Via API (cURL):**
```bash
# Replace SOURCE_ID with the ID from Step 1
curl -X POST http://localhost:3001/api/v1/crawl/start \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "123e4567-e89b-12d3-a456-426614174000",
    "useMultiPage": true,
    "maxDepth": 2,
    "maxPages": 50,
    "concurrency": 3
  }'
```

**Response:**
```json
{
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "sourceId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending",
    "itemsCrawled": 0,
    "itemsNew": 0,
    "createdAt": "2025-11-21T10:00:00Z"
  },
  "message": "Crawl job created"
}
```

---

### Step 3: Monitor Crawl Progress

The crawl runs in the background. You can monitor it in real-time:

**Via UI (http://localhost:3000/jobs):**
- The page auto-refreshes every 2 seconds for running jobs
- Watch the status change: `pending` → `running` → `done`
- See live updates of pages crawled

**Via API (cURL):**
```bash
# Replace JOB_ID with the ID from Step 2
curl http://localhost:3001/api/v1/crawl/jobs/456e7890-e89b-12d3-a456-426614174001
```

**Response (while running):**
```json
{
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "sourceId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "running",
    "itemsCrawled": 12,
    "itemsNew": 8,
    "pagesCrawled": 12,
    "pagesNew": 8,
    "pagesFailed": 0,
    "pagesSkipped": 4,
    "startedAt": "2025-11-21T10:00:05Z"
  }
}
```

**What happens during the crawl:**
1. ✅ **Fetches pages** from the source URL
2. ✅ **Follows links** (respecting maxDepth and maxPages)
3. ✅ **Extracts content** using Playwright (handles JavaScript)
4. ✅ **Detects duplicates** using content hashing
5. ✅ **Saves documents** to database
6. ✅ **Processes with LLM** (GPT-4) to extract:
   - Title and summary
   - Key datapoints (dates, amounts, names, etc.)
   - Policy themes and categories
   - Confidence scores
7. ✅ **Generates digest** automatically when done

---

### Step 4: View the Generated Digest

Once the crawl status is `done`, the digest is automatically generated.

**Via UI (http://localhost:3000/digests):**
1. Go to Digests page
2. Find the digest for your job (sorted by newest first)
3. Click "View Digest" to see:
   - Executive summary
   - Highlights (top policy changes)
   - Key datapoints extracted
   - Full document list

**Via API (cURL):**
```bash
# List all digests
curl http://localhost:3001/api/v1/digests

# Get specific digest
curl http://localhost:3001/api/v1/digests/789e0123-e89b-12d3-a456-426614174002
```

**Sample Digest Structure:**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "crawlJobId": "456e7890-e89b-12d3-a456-426614174001",
  "sourceId": "123e4567-e89b-12d3-a456-426614174000",
  "highlights": [
    {
      "title": "Renewable Energy Circular DC2024-11-0033",
      "summary": "New guidelines for solar power plant approvals with streamlined requirements",
      "url": "https://www.doe.gov.ph/dc-2024-11-0033",
      "significance": "high",
      "publishedAt": "2024-11-15T00:00:00Z"
    }
  ],
  "datapoints": [
    {
      "key": "submission_deadline",
      "value": "December 31, 2024",
      "type": "date",
      "source": "DC2024-11-0033",
      "confidence": 0.95
    },
    {
      "key": "minimum_capacity",
      "value": "50 MW",
      "type": "technical",
      "source": "DC2024-11-0033",
      "confidence": 0.92
    }
  ],
  "summaryHtml": "<html>...</html>",
  "summaryMarkdown": "# DOE Department Circulars Digest\n\n...",
  "createdAt": "2025-11-21T10:05:00Z"
}
```

---

## Digest Output Locations

### 1. Database
The digest is stored in the `crawl_digests` table with:
- `summary_html`: Full HTML version
- `summary_markdown`: Markdown version
- `highlights`: JSON array of key updates
- `datapoints`: JSON array of extracted data

### 2. File System
Markdown files are also saved to:
```
storage/digests/
└── digest_<crawl_job_id>_<timestamp>.md
```

**Example:**
```
storage/digests/digest_456e7890-e89b-12d3-a456-426614174001_2025-11-21.md
```

### 3. View in Terminal
```bash
# Find the latest digest file
ls -lt storage/digests/ | head -5

# View the content
cat storage/digests/digest_*.md
```

---

## Example: DOE Circulars Digest Output

```markdown
# DOE Department Circulars - Weekly Digest
*Generated: November 21, 2025 | Source: DOE Department Circulars*

---

## 🎯 Executive Summary
This week's crawl identified 12 new department circulars from the Department of Energy, 
with 8 significant policy updates. Key themes include renewable energy development, 
power plant licensing, and grid connection standards.

---

## 📌 Highlights

### 1. Renewable Energy Circular DC2024-11-0033
**Published:** November 15, 2024  
**Significance:** HIGH  
**URL:** https://www.doe.gov.ph/dc-2024-11-0033

New streamlined guidelines for solar power plant approvals. Reduces processing time 
from 180 days to 90 days. Minimum capacity requirement reduced from 100 MW to 50 MW.

**Key Points:**
- Application deadline: December 31, 2024
- Simplified documentary requirements
- Online submission portal now available
- Priority processing for projects in NGCP priority areas

---

### 2. Grid Connection Standards DC2024-11-0029
**Published:** November 10, 2024  
**Significance:** MEDIUM  
**URL:** https://www.doe.gov.ph/dc-2024-11-0029

Updated technical standards for connecting distributed energy resources to the grid.
Introduces new safety protocols and metering requirements.

---

## 📊 Key Datapoints

| Datapoint | Value | Source | Confidence |
|-----------|-------|--------|------------|
| Submission Deadline | December 31, 2024 | DC2024-11-0033 | 95% |
| Minimum Capacity | 50 MW | DC2024-11-0033 | 92% |
| Processing Time | 90 days | DC2024-11-0033 | 90% |
| Safety Voltage Limit | 69 kV | DC2024-11-0029 | 88% |

---

## 📄 All Documents (12 total)

1. **DC2024-11-0033** - Renewable Energy Plant Guidelines  
   https://www.doe.gov.ph/dc-2024-11-0033

2. **DC2024-11-0029** - Grid Connection Standards  
   https://www.doe.gov.ph/dc-2024-11-0029

[... 10 more documents ...]

---

*Powered by CSV RADAR | Always on watch. Always in sync.*
```

---

## Troubleshooting

### Issue: Crawl stays in "pending" status
**Solution:** Check API server logs for errors:
```bash
# View logs (if running via pnpm dev)
# Check terminal output for errors

# Or check individual service
cd apps/api
pnpm dev
```

### Issue: No digest generated
**Reasons:**
1. No documents were crawled (source URL might be blocked or invalid)
2. OpenAI API key not configured
3. LLM extraction failed

**Check:**
```bash
# Check if documents were created
psql postgresql://postgres:postgres@localhost:5432/csv_crawler \
  -c "SELECT COUNT(*) FROM documents WHERE crawl_job_id = 'YOUR_JOB_ID';"

# Check digest generation errors in API logs
```

### Issue: "Source not found" error
**Solution:** Make sure you're using the correct source UUID from Step 1.

### Issue: Database connection error
**Solution:**
```bash
# Restart PostgreSQL
docker-compose down
docker-compose up -d postgres

# Wait a few seconds, then run migrations
cd packages/db
pnpm migrate
```

---

## Advanced: Custom Crawl Configurations

You can add custom crawl configurations when creating a source:

```bash
curl -X POST http://localhost:3001/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DOE Circulars",
    "url": "https://www.doe.gov.ph/department-circulars",
    "type": "policy",
    "country": "PH",
    "active": true,
    "crawlConfig": {
      "pdfSelectors": [
        "a[href$=\".pdf\"]",
        "a.pdf-link"
      ],
      "followPatterns": [
        "/department-circulars/",
        "/dc-20"
      ],
      "excludePatterns": [
        "/archive/",
        "/old/"
      ]
    }
  }'
```

---

## Quick Test Command

Run everything in one go (requires `jq` for JSON parsing):

```bash
# 1. Create source
SOURCE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test DOE Source",
    "url": "https://www.doe.gov.ph/department-circulars",
    "type": "policy",
    "country": "PH",
    "active": true
  }')

SOURCE_ID=$(echo $SOURCE_RESPONSE | jq -r '.data.id')
echo "✓ Source created: $SOURCE_ID"

# 2. Start crawl
JOB_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/crawl/start \
  -H "Content-Type: application/json" \
  -d "{
    \"sourceId\": \"$SOURCE_ID\",
    \"useMultiPage\": true,
    \"maxDepth\": 2,
    \"maxPages\": 10
  }")

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.data.id')
echo "✓ Crawl job started: $JOB_ID"

# 3. Monitor status
echo "⏳ Monitoring crawl progress..."
while true; do
  STATUS=$(curl -s http://localhost:3001/api/v1/crawl/jobs/$JOB_ID | jq -r '.data.status')
  echo "   Status: $STATUS"
  
  if [ "$STATUS" = "done" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  
  sleep 5
done

echo "✓ Crawl completed with status: $STATUS"

# 4. Get digest
echo "📄 Fetching digest..."
curl -s http://localhost:3001/api/v1/digests | jq '.data[] | select(.crawlJobId == "'$JOB_ID'")'
```

---

## Summary

**Complete Flow:**
1. ✅ Add Source → Get Source ID
2. ✅ Start Crawl → Get Job ID  
3. ✅ Monitor Job → Wait for "done"
4. ✅ View Digest → See highlights, datapoints, summary

**Total Time:** 2-10 minutes depending on:
- Number of pages to crawl
- Network speed
- LLM API response time

**Output:** Professional digest with:
- Executive summary
- Policy highlights
- Extracted datapoints
- Full document list

**Access:**
- UI: http://localhost:3000/digests
- API: http://localhost:3001/api/v1/digests
- Files: `storage/digests/`

---

*Ready to crawl and digest! 🚀*
