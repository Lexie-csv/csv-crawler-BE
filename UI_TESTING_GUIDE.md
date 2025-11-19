# 🎉 Multi-Page Crawler UI - Ready to Test!

## ✅ What's Been Implemented

### Backend (Complete)
- ✅ Multi-page crawler with BFS queue and pagination detection
- ✅ LLM extraction pipeline (classify → extract → generate digest)
- ✅ Digest generation service (1-2 page Markdown summaries)
- ✅ API endpoints for digests (`GET /api/digests`, `GET /api/crawl/:jobId/digest`)
- ✅ Database schema extensions (crawl_digests table)

### Frontend (Complete)
- ✅ Crawl configuration modal with multi-page options
- ✅ Digests listing page with pagination and filters
- ✅ Individual digest view with tabs (Summary, Highlights, Datapoints)
- ✅ Updated crawl dashboard with digest links
- ✅ Navigation menu with "Digests" link

## 🚀 How to Test

### 1. Access the Application

**Web UI**: http://localhost:3000
**API**: http://localhost:3001

### 2. Start a Multi-Page Crawl

1. Go to: http://localhost:3000/crawl
2. Click "Start Crawl" button next to any source
3. **NEW**: A modal will appear with options:
   - ☑️ **Multi-Page Crawling** (toggle on)
   - **Max Depth**: 1-5 (how many link levels to follow)
   - **Max Pages**: 1-500 (total pages to crawl)
   - **Concurrency**: 1-5 (parallel requests)
4. Click "Start Crawl"
5. The job will show progress in real-time

### 3. View the Digest

**Option A: From Crawl Dashboard**
- After the crawl completes (status: "done")
- Look for the "Digest →" link in the Actions column
- Click it to view the generated digest

**Option B: From Digests Page**
- Go to: http://localhost:3000/digests
- See all generated digests with pagination
- Filter by source
- Click "View →" to see any digest

### 4. Explore Digest Details

The digest view has 3 tabs:

1. **Summary** - Full Markdown digest (1-2 pages)
2. **Highlights** - Key updates with categories (circular, ppa, price_change, etc.)
3. **Datapoints** - Structured data in a table (indicator codes, values, dates)

## ⚠️ Important Note: OpenAI API Key Required

To use the LLM extraction features, you MUST set your OpenAI API key:

```bash
# Edit apps/api/.env
OPENAI_API_KEY=sk-your-actual-key-here
```

Then restart the servers:
```bash
# Press Ctrl+C in the terminal running pnpm dev
pnpm dev
```

**Without the key:**
- Single-page crawls will work
- Multi-page crawls will work
- BUT digest generation will fail

## 🎨 UI Features

### Crawl Configuration Modal
- Toggle between single-page and multi-page modes
- Visual estimation of crawl time and cost
- Clear explanations of each option
- Responsive design

### Digests Page
- Paginated list of all digests
- Filter by source
- Shows highlight count and datapoint count
- Category badges
- Clean, professional layout

### Digest Detail Page
- Full Markdown rendering with proper styling
- Tabbed interface for easy navigation
- Highlight cards with categories and effective dates
- Datapoint table with indicator codes
- Download link to raw Markdown file

## 📝 Test Scenarios

### Scenario 1: Quick Test (No OpenAI Key)
1. Start a single-page crawl (uncheck "Multi-Page Crawling")
2. See documents extracted
3. No digest will be generated (expected)

### Scenario 2: Full Multi-Page Crawl (With OpenAI Key)
1. Add your OpenAI key to `.env`
2. Restart servers
3. Start a multi-page crawl:
   - Max Depth: 2
   - Max Pages: 20
   - Concurrency: 3
4. Wait for completion (~2-5 minutes)
5. View the generated digest
6. See LLM-classified highlights
7. See extracted structured datapoints

### Scenario 3: Browse Existing Digests
1. Go to http://localhost:3000/digests
2. Use pagination controls
3. Filter by source
4. Click into any digest to see details
5. Switch between tabs

## 🔗 Quick Links

- **Home**: http://localhost:3000
- **Sources**: http://localhost:3000/sources
- **Crawl Dashboard**: http://localhost:3000/crawl
- **Digests**: http://localhost:3000/digests
- **Documents**: http://localhost:3000/documents
- **Datapoints**: http://localhost:3000/datapoints
- **API Health**: http://localhost:3001/health

## 📊 What the LLM Extracts

For Philippine/SEA energy policy sources:

**Categories:**
- `circular` - DOE circulars, regulatory orders
- `ppa` - Power Purchase Agreements
- `price_change` - WESM prices, retail tariffs
- `energy_mix` - Generation capacity changes
- `policy` - Policy updates, incentives

**Indicator Codes:**
- `DOE_CIRCULAR` - Circular numbers
- `PPA_SIGNED` - PPA signings
- `WESM_AVG_PRICE` - Market prices (PHP/kWh)
- `ENERGY_MIX_COAL` - Coal percentage
- `ENERGY_MIX_SOLAR` - Solar percentage
- `FIT_RATE` - Feed-in tariff rates
- `RETAIL_TARIFF` - Retail electricity tariffs

## 🐛 Troubleshooting

### Issue: Modal doesn't open
- Check browser console for errors
- Refresh the page

### Issue: No digest link appears
- Digest link only shows for completed multi-page crawls
- Check that the crawl status is "done"
- Verify that pages_crawled > 1

### Issue: "OPENAI_API_KEY required" error
- Add your key to `apps/api/.env`
- Restart: `Ctrl+C` then `pnpm dev`

### Issue: Digest generation fails
- Check API logs for LLM errors
- Verify OpenAI API key is valid
- Check that you have API credits

## 💡 Next Steps

1. **Set OpenAI Key** - Add your key to start using LLM features
2. **Add Real Sources** - Add DOE, ERC, WESM sources
3. **Test Full Flow** - Run a complete multi-page crawl
4. **Review Digests** - Check digest quality and accuracy
5. **Adjust Settings** - Tune maxDepth/maxPages for your needs

## 📚 Documentation

- **User Guide**: `docs/MULTI_PAGE_CRAWLER_GUIDE.md`
- **Implementation**: `MULTI_PAGE_CRAWLER_SUMMARY.md`
- **Test Script**: `test-multipage-crawl.sh`

---

**Ready to test!** Start at: http://localhost:3000/crawl

Enjoy exploring the new multi-page crawler with LLM-powered digest generation! 🚀
