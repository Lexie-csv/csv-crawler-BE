# ✅ System Ready: Complete Crawl & Digest Flow

## 🎉 Everything is Set Up!

**Status:**
- ✅ API Server running on http://localhost:3001
- ✅ Web Frontend running on http://localhost:3000  
- ✅ PostgreSQL database running (healthy)
- ✅ All migrations applied
- ✅ Crawl service with LLM extraction ready
- ✅ Automatic digest generation enabled

---

## 🚀 How to Use (Simple Steps)

### 1. Add DOE Source
**Go to:** http://localhost:3000/sources

Click **"Add Source"** and fill in:
```
Name: DOE Department Circulars
URL: https://www.doe.gov.ph/department-circulars
Type: policy
Country: PH
Sector: energy
Active: ✅
```

### 2. Start Crawl
**Go to:** http://localhost:3000/jobs

Find your source, click **"Start Crawl"**

Configure:
```
Multi-Page: ✅ Enable
Max Depth: 2
Max Pages: 20 (start small)
Concurrency: 3
```

### 3. Wait for Completion
The job will automatically:
- Crawl the DOE website
- Extract document content
- Process with GPT-4 (LLM)
- Generate structured digest
- Save everything to database

**Time:** ~5-10 minutes for 20 pages

### 4. View Digest
**Go to:** http://localhost:3000/digests

Click **"View Digest"** on your job

You'll see:
- Executive summary
- Policy highlights (HIGH/MEDIUM/LOW significance)
- Extracted datapoints (dates, amounts, requirements)
- Full document list with links

---

## 📁 Output Locations

### Web UI
- **Sources:** http://localhost:3000/sources
- **Jobs:** http://localhost:3000/jobs
- **Digests:** http://localhost:3000/digests
- **Datapoints:** http://localhost:3000/datapoints

### API Endpoints
- **Sources:** http://localhost:3001/api/v1/sources
- **Crawl:** http://localhost:3001/api/v1/crawl
- **Digests:** http://localhost:3001/api/v1/digests
- **Health:** http://localhost:3001/health

### File System
```bash
storage/
├── digests/
│   └── digest_<job-id>_<date>.md
├── downloads/
│   └── <source-name>/
│       └── *.pdf
└── pdf-crawls/
    └── <source>_<timestamp>.json
```

---

## 🎯 What You'll Get (Example)

### Digest Format

```markdown
# DOE Department Circulars - Digest
*Generated: November 21, 2025*

## 🎯 Executive Summary
Discovered 12 new department circulars related to renewable energy,
power plant licensing, and grid connection standards. 

Key themes: Renewable Energy (8), Grid Standards (3), Compliance (1)

## 📌 Highlights

### 1. Renewable Energy Circular DC2024-11-0033
**Published:** November 15, 2024
**Significance:** HIGH
**URL:** https://www.doe.gov.ph/dc-2024-11-0033

New streamlined guidelines for solar power plant approvals.
Processing time reduced from 180 days to 90 days.

Key Points:
- Submission deadline: December 31, 2024
- Minimum capacity: 50 MW (reduced from 100 MW)
- Online portal now available
- Priority processing in NGCP areas

### 2. Grid Connection Standards DC2024-11-0029
**Published:** November 10, 2024
**Significance:** MEDIUM

Updated technical standards for distributed energy resources...

## 📊 Key Datapoints

| Datapoint | Value | Source | Confidence |
|-----------|-------|--------|------------|
| Submission Deadline | Dec 31, 2024 | DC2024-11-0033 | 95% |
| Minimum Capacity | 50 MW | DC2024-11-0033 | 92% |
| Processing Time | 90 days | DC2024-11-0033 | 90% |
| Application Fee | ₱50,000 | DC2024-11-0033 | 88% |

## 📄 All Documents (12)

1. DC2024-11-0033 - Renewable Energy Plant Guidelines
   https://www.doe.gov.ph/dc-2024-11-0033
   
2. DC2024-11-0029 - Grid Connection Standards
   https://www.doe.gov.ph/dc-2024-11-0029
   
[... 10 more ...]
```

---

## 🔧 Technical Details

### What Happens Behind the Scenes

1. **Web Crawling** (Playwright)
   - Navigates website with headless browser
   - Handles JavaScript-rendered content
   - Follows pagination links
   - Respects robots.txt
   - Rate limits requests

2. **Content Extraction**
   - Downloads HTML/PDF documents
   - Extracts text content
   - OCR for scanned PDFs (Tesseract)
   - Deduplicates using content hashing

3. **LLM Processing** (GPT-4)
   - Analyzes document content
   - Extracts structured data
   - Identifies policy changes
   - Assigns significance scores
   - Generates summaries

4. **Digest Generation**
   - Aggregates all findings
   - Creates executive summary
   - Highlights top updates
   - Exports to HTML/Markdown/JSON
   - Saves to database + files

5. **Storage**
   - PostgreSQL database (structured data)
   - File system (markdown files)
   - API endpoints (JSON responses)

---

## 📊 Database Schema

The system stores data in these tables:

```sql
sources           -- Your monitored websites
crawl_jobs        -- Crawl execution tracking
documents         -- Extracted documents
crawl_digests     -- Generated summaries
datapoints        -- Structured data extractions
```

You can query directly:
```bash
psql postgresql://postgres:postgres@localhost:5432/csv_crawler

\dt  -- List tables
SELECT COUNT(*) FROM sources;
SELECT COUNT(*) FROM documents;
SELECT COUNT(*) FROM crawl_digests;
```

---

## 🎓 Pro Tips

### For Faster Testing
- Use `Max Pages: 5` for quick tests (~2 minutes)
- Use `Max Depth: 1` to only crawl direct links
- Start with one source to verify everything works

### For Production Use
- Set `Max Pages: 100` for comprehensive crawls
- Use `Max Depth: 3` to follow nested pages
- Enable `concurrency: 5` for faster parallel processing

### Monitoring
Watch the API logs in your terminal for real-time updates:
```
[CrawlService] === Starting crawl job ===
[MultiPageCrawler] Discovered 15 URLs
[LLMExtractor] Processing document 1/15
[DigestOrchestration] ✓✓✓ Digest generated ✓✓✓
```

---

## 🐛 Troubleshooting

### Issue: No documents crawled
**Check:** Is the URL accessible? Try opening it in your browser first.

### Issue: Digest not generated
**Check:** 
- Is `OPENAI_API_KEY` set in `.env`?
- Were any documents actually created?
- Check API logs for LLM errors

### Issue: Crawl stuck in "running"
**Solution:** Refresh the page. Check if the process crashed in terminal.

### Issue: Database connection error
**Solution:**
```bash
docker-compose up -d postgres
cd packages/db && pnpm migrate
```

---

## 📚 Additional Documentation

- **Full Guide:** `CRAWL_AND_DIGEST_GUIDE.md`
- **Quick Start:** `QUICK_START_GUIDE.md`
- **API Reference:** Check `apps/api/src/routes/`
- **Database Schema:** `packages/db/migrations/`

---

## 🎬 Ready to Start!

**Open:** http://localhost:3000/sources

**Follow the 4 steps above ☝️**

**Expected result:**
- Professional digest with executive summary
- Extracted policy highlights with significance scores
- Structured datapoints (dates, requirements, amounts)
- Links to all source documents
- Confidence scores for data reliability

**Time to complete:** ~10-15 minutes for first digest

---

## 💡 Example Use Cases

1. **Policy Monitoring**
   - Track DOE circulars for energy sector updates
   - Monitor SEC advisories for financial regulations
   - Follow BSP announcements for banking changes

2. **Competitive Intelligence**
   - Monitor competitor press releases
   - Track industry news portals
   - Analyze market announcements

3. **Compliance Tracking**
   - Regulatory requirement changes
   - Filing deadline updates
   - New compliance standards

4. **Research & Analysis**
   - Automatic policy change detection
   - Trend analysis over time
   - Structured data extraction for reports

---

## 🔐 Security Notes

- The system respects `robots.txt`
- Rate limiting prevents server overload (1 request/second)
- Content hashing ensures no duplicate processing
- All data stored locally in your database
- No external data sharing (except OpenAI API for LLM)

---

## 📈 What's Next?

After your first successful crawl:

1. **Add More Sources**
   - SEC advisories
   - BSP circulars
   - Other government portals

2. **Schedule Regular Crawls**
   - Weekly automated runs
   - Change detection
   - Email notifications

3. **Export & Share**
   - Generate reports
   - Email digests to stakeholders
   - API integration with other tools

---

**Everything is ready! Start at:** http://localhost:3000/sources 🚀

*Questions? Check the logs in your terminal or the full guide.*
