# CSV RADAR - Crawl Testing Guide

## Quick Test: Crawl a Real Website

Follow these steps to test the crawler with a real Philippine regulatory website.

---

## Step 1: Add a Test Source

Open your browser to: **http://localhost:3000/sources**

Click **"+ Add Source"** and enter:

```
Name: DOE Circulars Test
URL: https://www.doe.gov.ph/circulars
Type: Policy
Country: PH
Sector: Energy
✓ Active (enable monitoring)
```

Click **"Create Source"**

---

## Step 2: Start a Crawl Job

Navigate to: **http://localhost:3000/crawl**

You should see your new source in the "Active Sources" section.

Click **"Start Crawl"** next to "DOE Circulars Test"

### Option A: Simple Single-Page Crawl
- Leave "Enable Multi-Page Crawl" **unchecked**
- Click **"Start Crawl"**

This will crawl just the main page and extract content.

### Option B: Multi-Page Crawl (Recommended for Testing)
- Check **"Enable Multi-Page Crawl"**
- Set **Max Depth**: `2` (follow links 2 levels deep)
- Set **Max Pages**: `10` (limit to 10 pages total)
- Set **Concurrency**: `3` (crawl 3 pages at a time)
- Click **"Start Crawl"**

This will follow links on the page and crawl multiple related pages.

---

## Step 3: Monitor Progress

After starting the crawl, you'll see:

**Real-time Updates (every 2 seconds):**
- Status changes: pending → running → done
- Pages crawled counter incrementing
- New pages discovered
- Failed pages (if any)
- Duration timer

**Example Progress:**
```
Status: running
Progress:
  Pages: 5
  New: 4 | Failed: 0
Duration: 15s
```

---

## Step 4: View Crawled Documents

Once the job status shows **"done"**, click **"Docs →"** next to the job.

You'll see a list of all crawled documents with:
- Title
- URL
- Crawl date
- Extraction status

---

## Step 5: View Generated Digest (Multi-Page Only)

If you ran a **multi-page crawl**, you'll see a **"Digest →"** link.

Click it to view the LLM-generated summary containing:
- **Summary** - Overview of what was found
- **Highlights** - Key findings organized by category
- **Datapoints** - Extracted structured data (dates, numbers, policy indicators)

---

## Alternative Test Sources

### Option 1: BSP Regulations (Banking)
```
Name: BSP Regulations
URL: https://www.bsp.gov.ph/Regulations/Issuances/
Type: Policy
Country: PH
Sector: Finance
```

### Option 2: SEC Advisories (Securities)
```
Name: SEC Advisories
URL: https://www.sec.gov.ph/advisories/
Type: Policy
Country: PH
Sector: Finance
```

### Option 3: PCC Advisories (Competition)
```
Name: PCC Advisories
URL: https://www.phcc.gov.ph/advisories-and-issuances/
Type: Policy  
Country: PH
Sector: Competition
```

---

## Expected Results

### Single-Page Crawl
- **Duration**: 5-15 seconds
- **Pages**: 1
- **Documents**: 1
- **Datapoints**: 0-5 (depends on content)

### Multi-Page Crawl (10 pages, depth 2)
- **Duration**: 30-60 seconds
- **Pages**: 5-10 (depending on link availability)
- **Documents**: 5-10
- **Datapoints**: 10-50
- **Digest**: Yes (auto-generated summary)

---

## Troubleshooting

### "Validation failed" when adding source
- Make sure **Type** is one of: Policy, Stock Exchange, Government Gazette, IFI, Government Portal, News
- **NOT** "Regulatory" or "Other" (these don't match backend validation)

### Crawl stays in "pending" status
- Check terminal logs for errors
- Verify the URL is accessible: `curl -I <URL>`
- Check if robots.txt blocks crawling

### No documents found
- The page might be JavaScript-rendered (crawler only works with server-rendered HTML)
- Try a simpler page with static HTML content

### Database errors
- Make sure PostgreSQL is running: `docker ps | grep postgres`
- Run migrations: `cd packages/db && npx pnpm build && node dist/migrate.js`

---

## What Happens During a Crawl?

1. **Fetch robots.txt** - Check if crawling is allowed
2. **Download HTML** - Fetch the page content
3. **Parse content** - Extract text, links, metadata
4. **Hash content** - Create SHA-256 hash to detect duplicates
5. **Store document** - Save to database (skip if duplicate)
6. **Follow links** (multi-page only) - Queue discovered links
7. **Extract datapoints** - Find structured data (dates, numbers, indicators)
8. **Generate digest** (multi-page only) - LLM summarizes all documents

---

## Next Steps After Testing

1. **View Dashboard** - See updated stats at http://localhost:3000/dashboard
2. **Query Datapoints** - Filter and export at http://localhost:3000/datapoints
3. **Review Digests** - Browse summaries at http://localhost:3000/digests
4. **Add More Sources** - Build your monitoring list
5. **Schedule Crawls** - Set frequency (daily/weekly/monthly) on each source

---

## Performance Notes

- **Single-page crawls**: Very fast (5-10 seconds)
- **Multi-page crawls**: Depends on page count and concurrency
  - 10 pages, concurrency 3: ~30-45 seconds
  - 50 pages, concurrency 5: ~2-3 minutes
- **Rate limiting**: 1 second delay between requests per source
- **Duplicate detection**: Content hash prevents re-processing

---

## Success Indicators

✅ **Crawl succeeded if you see:**
- Status: "done" (green badge)
- Pages crawled > 0
- No error messages
- Documents viewable via "Docs →" link
- (Multi-page) Digest available via "Digest →" link

❌ **Crawl failed if you see:**
- Status: "failed" (red badge)
- Error message displayed
- Pages crawled = 0

Check the API server terminal logs for detailed error information.

---

**Ready to test! Start with DOE Circulars - it's the most reliable test source.**
