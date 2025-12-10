# 🚀 Quick Start: Add Source → Crawl → Get Digest

## TL;DR
1. Go to http://localhost:3000/sources
2. Click "Add Source", enter DOE URL
3. Go to http://localhost:3000/jobs
4. Click "Start Crawl"
5. Wait for completion
6. Go to http://localhost:3000/digests
7. View your digest!

---

## Prerequisites Check

✅ **Servers Running:**
```bash
cd "/Users/lexiepelaez/Desktop/csv-crawler BE"
pnpm dev
```

✅ **Database Running:**
```bash
docker ps | grep postgres
# Should show: csv-crawler-db (Up, healthy)
```

✅ **OpenAI API Key Set:**
```bash
# Check .env file has:
OPENAI_API_KEY=sk-...
```

---

## Step 1: Add DOE Source (2 minutes)

**Go to:** http://localhost:3000/sources

**Click:** "Add Source" button

**Fill in:**
- Name: `DOE Department Circulars`
- URL: `https://www.doe.gov.ph/department-circulars`
- Type: `policy`
- Country: `PH`
- Sector: `energy`
- Active: ✅

**Click:** "Save"

**Result:** You'll see the source appear in the table with an ID

---

## Step 2: Start Crawl (1 minute)

**Go to:** http://localhost:3000/jobs

**Find:** Your "DOE Department Circulars" source

**Click:** "Start Crawl" button

**Configure Modal:**
- Multi-Page Crawling: ✅ **Enable**
- Max Depth: `2`
- Max Pages: `20` (start small for testing)
- Concurrency: `3`

**Click:** "Start Crawl"

**Result:** Job appears with status "pending" → "running"

---

## Step 3: Monitor Progress (5-10 minutes)

The page auto-refreshes every 2 seconds.

**Watch for:**
- Status: `pending` → `running` → `done`
- Pages Crawled: Incrementing (e.g., 1, 2, 3...)
- Items New: New documents found

**What's Happening:**
1. 🔍 Crawling DOE website
2. 📄 Downloading HTML pages
3. 🧠 Extracting content with Playwright
4. 🤖 Processing with GPT-4 (LLM extraction)
5. 💾 Saving to database
6. ✨ Generating digest automatically

**API Logs** (in terminal):
```
[CrawlService] === Starting crawl job abc-123 ===
[MultiPageCrawler] Discovered 15 URLs to crawl
[LLMExtractor] Processing document 1/15...
[DigestOrchestration] === Starting digest generation ===
[DigestOrchestration] ✓✓✓ Digest generated successfully ✓✓✓
```

---

## Step 4: View Digest (instant)

**Go to:** http://localhost:3000/digests

**Find:** Your most recent digest (top of list)

**Click:** "View Digest"

**You'll see:**

### 📊 Digest Overview
- Executive summary
- Total documents processed
- Highlights count
- Datapoints extracted

### 🎯 Highlights Section
- Top policy updates
- Significance level (HIGH/MEDIUM/LOW)
- Brief summaries
- Links to original documents

### 📈 Key Datapoints Table
- Extracted dates, amounts, requirements
- Source document reference
- Confidence scores

### 📄 Full Document List
- All crawled documents
- Titles and URLs
- Publication dates

---

## File System Output

The digest is also saved as a Markdown file:

```bash
# View the digest file
ls -lht storage/digests/ | head -5

# Read the latest digest
cat storage/digests/digest_*.md
```

**Example path:**
```
storage/digests/digest_<job-id>_2025-11-21.md
```

---

## Example Output

```markdown
# DOE Department Circulars - Digest
*Generated: November 21, 2025*

## 🎯 Executive Summary
Discovered 12 new department circulars...

## 📌 Highlights

### 1. Renewable Energy Guidelines DC2024-11-0033
**Significance:** HIGH
Processing time reduced from 180 to 90 days...

## 📊 Key Datapoints
- Submission Deadline: December 31, 2024
- Minimum Capacity: 50 MW
- Processing Fee: ₱50,000

## 📄 Documents (12 total)
1. DC2024-11-0033 - Renewable Energy Guidelines
2. DC2024-11-0029 - Grid Connection Standards
...
```

---

## Troubleshooting

### ❌ "Database connection failed"
```bash
docker-compose up -d postgres
cd packages/db && pnpm migrate
```

### ❌ "No digest generated"
Check API logs for LLM errors. Make sure `OPENAI_API_KEY` is set in `.env`

### ❌ Crawl stuck in "pending"
Refresh the page. Check API terminal for error messages.

### ❌ "Source not found" when starting crawl
Make sure you saved the source in Step 1. Check Sources page.

---

## Testing with Limited Pages

For quick testing, use these settings:
- Max Depth: `1` (only crawl the start page + direct links)
- Max Pages: `5` (stop after 5 pages)
- Concurrency: `2`

This will complete in ~2-3 minutes.

---

## What Gets Crawled

From `https://www.doe.gov.ph/department-circulars`:

1. **Start page** - List of circulars
2. **Linked pages** - Individual circular pages (up to maxDepth)
3. **Content extraction** - Titles, dates, text content
4. **LLM processing** - Extracts:
   - Policy summaries
   - Key requirements/deadlines
   - Technical specifications
   - Significance assessment

---

## Next Steps After First Digest

1. **View Datapoints:** http://localhost:3000/datapoints
   - See all extracted structured data
   - Filter by source, type, confidence

2. **Schedule Regular Crawls:**
   - Create recurring crawl jobs
   - Monitor for policy updates

3. **Export Data:**
   - Use API to get digest JSON
   - Generate custom reports

4. **Email Digests:**
   - Configure Sendgrid API key
   - Set up subscriber list
   - Automatic weekly emails

---

## API Equivalent (for automation)

```bash
# 1. Create source
SOURCE_ID=$(curl -s -X POST http://localhost:3001/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{"name":"DOE Circulars","url":"https://www.doe.gov.ph/department-circulars","type":"policy","country":"PH","active":true}' \
  | jq -r '.data.id')

echo "Source ID: $SOURCE_ID"

# 2. Start crawl
JOB_ID=$(curl -s -X POST http://localhost:3001/api/v1/crawl/start \
  -H "Content-Type: application/json" \
  -d "{\"sourceId\":\"$SOURCE_ID\",\"useMultiPage\":true,\"maxDepth\":2,\"maxPages\":20}" \
  | jq -r '.data.id')

echo "Job ID: $JOB_ID"

# 3. Wait and check status
while true; do
  STATUS=$(curl -s http://localhost:3001/api/v1/crawl/jobs/$JOB_ID | jq -r '.data.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "done" ] && break
  sleep 10
done

# 4. Get digest
curl -s http://localhost:3001/api/v1/digests | jq ".data[] | select(.crawlJobId == \"$JOB_ID\")"
```

---

## Summary

**Time Required:**
- Adding source: 1 min
- Starting crawl: 1 min
- Crawling (20 pages): 5-10 min
- **Total: ~10-15 minutes**

**Output:**
- ✅ Structured digest (HTML + Markdown)
- ✅ Extracted datapoints in database
- ✅ Document classification and themes
- ✅ Confidence scores for reliability

**Access Points:**
- 🌐 Web UI: http://localhost:3000/digests
- 📡 API: http://localhost:3001/api/v1/digests
- 📁 Files: `storage/digests/*.md`

---

*Ready to start! Open http://localhost:3000/sources* 🚀
