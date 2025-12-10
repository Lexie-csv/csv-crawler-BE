# CSV Crawler Workflow Guide

## Overview

The CSV Crawler is a full-stack system for monitoring regulatory and policy updates across Philippine and Southeast Asian markets. It crawls government websites, downloads PDF documents, extracts structured data using LLM processing (with OCR support for scanned documents), and generates professional weekly newsletters.

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      CSV Crawler System                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Web Crawler (Playwright RPA)                             │
│     ├── Navigate target websites                             │
│     ├── Extract PDF links                                    │
│     └── Download PDFs with validation                        │
│                                                               │
│  2. PDF Processing Pipeline                                  │
│     ├── Text Extraction (pdf-parse)                          │
│     ├── OCR Processing (Ghostscript + Tesseract)            │
│     └── LLM Analysis (OpenAI GPT-4o-mini)                   │
│                                                               │
│  3. Data Management                                          │
│     ├── PostgreSQL Database                                  │
│     ├── File Storage (downloads, OCR text, metadata)        │
│     └── Export Utilities (CSV, Digest)                      │
│                                                               │
│  4. Output Generation                                        │
│     ├── CSV Reports                                          │
│     ├── HTML Digests (newsletters)                           │
│     └── API Endpoints                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Workflow

### Phase 1: Source Configuration

Before crawling, you need to configure your source in `apps/api/src/cli/pdf-crawler.cli.ts`:

```typescript
const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  'DOE-circulars': {
    startUrl: 'https://www.doe.gov.ph/laws-and-issuances',
    maxDepth: 2,
    maxPages: 50,
    pdfSelectors: [
      'a[href*="/sites/default/files/pdf/"]',
      'a[href$=".pdf"]',
      'a[href*="issuances"][href$=".pdf"]'
    ]
  }
};
```

**Configuration Parameters:**
- `startUrl`: Entry point for crawling
- `maxDepth`: How many navigation levels to traverse (2 = start page → list page → detail page)
- `maxPages`: Maximum number of pages to visit (prevents infinite loops)
- `pdfSelectors`: CSS selectors to identify PDF download links

---

### Phase 2: Web Crawling

**Command:**
```bash
cd apps/api
pnpm crawl-pdf crawl -s DOE-circulars
```

**Process:**

1. **Initialize Browser**
   - Launches headless Chromium via Playwright
   - Sets viewport and user agent
   - Configures download directory

2. **Navigate Website**
   - Visits `startUrl`
   - Extracts all matching PDF links using `pdfSelectors`
   - Follows pagination and navigation links (up to `maxDepth`)
   - Respects `maxPages` limit

3. **Download PDFs**
   - **Two-stage download process:**
     - **Stage 1 (5s timeout):** Browser-based download via click event
     - **Stage 2 (30s timeout):** HTTP fallback with fetch API
   
4. **Validate Downloads**
   - **Content-Type Check:** Rejects `text/html` responses
   - **Magic Byte Check:** Verifies file starts with `%PDF`
   - Skips invalid files with warning logs

5. **Save Metadata**
   - Creates JSON file: `storage/pdf-crawls/<source>_<timestamp>.json`
   - Stores: source URL, download path, timestamp, success status

**Output Structure:**
```
apps/api/storage/
├── downloads/
│   └── doe-circulars/
│       ├── department-circular-2025-01-001.pdf
│       ├── department-circular-2025-02-002.pdf
│       └── ...
└── pdf-crawls/
    └── DOE-circulars_2025-11-20T04-43-51.json
```

**Example Metadata:**
```json
{
  "source": "DOE-circulars",
  "timestamp": "2025-11-20T04:43:51Z",
  "totalProcessed": 38,
  "results": [
    {
      "url": "https://www.doe.gov.ph/sites/default/files/pdf/issuances/dc2025-01-001.pdf",
      "file_path": "/path/to/storage/downloads/doe-circulars/dc2025-01-001.pdf",
      "downloaded": true
    }
  ]
}
```

---

### Phase 3: OCR & LLM Processing

**Command:**
```bash
cd apps/api
npx tsx src/cli/ocr-reprocess.ts DOE-circulars
```

**Process:**

1. **Load Environment**
   - Searches for `.env` file in multiple locations:
     - `apps/api/.env`
     - `apps/api/.env.local`
     - `.env`
     - `.env.local`
   - Loads `OPENAI_API_KEY`

2. **Find Source PDFs**
   - Locates download directory: `storage/downloads/doe-circulars/`
   - Lists all `.pdf` files

3. **Text Extraction (Fast Path)**
   - Uses `pdf-parse` library to extract text
   - **Skip OCR if ≥ 400 characters extracted**
   - Saves processing time on text-based PDFs

4. **OCR Processing (Slow Path)**
   - **For scanned PDFs with < 400 characters:**
   
   ```bash
   # Step 1: Convert PDF to PNG images (300 DPI)
   ghostscript -dNOPAUSE -dBATCH -sDEVICE=png16m -r300 -sOutputFile=page_%03d.png input.pdf
   
   # Step 2: OCR each page
   tesseract page_001.png stdout
   tesseract page_002.png stdout
   # ... combine all pages
   ```

5. **Parallel Processing**
   - Uses 3-worker concurrency via `Promise.all()` batching
   - Prevents system overload
   - Significantly faster than sequential processing

6. **Save OCR Text**
   - Creates text files: `storage/ocr/<source>/<filename>.txt`
   - Preserves original filename for traceability

7. **LLM Analysis**
   - Calls `PdfLlmProcessor.processText()` for each document
   - **Model:** OpenAI GPT-4o-mini
   - **Temperature:** 0.1 (deterministic output)
   - **Max Tokens:** 2000

   **Extraction Schema:**
   ```typescript
   {
     isRelevant: boolean,          // Is this a policy/regulatory document?
     title: string,                 // Document title
     documentType: string,          // e.g., "Department Circular"
     effectiveDate: string,         // Date it takes effect
     issuingBody: string,           // Who issued it
     issuingAgency: string,         // Agency name
     department: string,            // Department name
     sector: string,                // e.g., "Energy", "Oil & Gas"
     summary: string,               // 2-3 sentence summary
     keyNumbers: string[],          // Important figures/dates
     implications: string[],        // Business impacts
     complianceRequirements: string[]
   }
   ```

8. **Save Results**
   - Creates JSON: `storage/pdf-crawls/<source>_ocr_reprocessed_<timestamp>.json`
   - Contains all extracted data + OCR text

**Output Structure:**
```
apps/api/storage/
├── ocr/
│   └── doe-circulars/
│       ├── dc2025-01-001.txt
│       ├── dc2025-02-002.txt
│       └── ...
└── pdf-crawls/
    └── DOE-circulars_ocr_reprocessed_2025-11-20T09-43-59.json
```

**Performance:**
- **38 PDFs processed in ~15 minutes** (with OCR)
- **17 relevant documents identified**
- **21 non-relevant documents filtered**

---

### Phase 4: CSV Export

**Command:**
```bash
cd apps/api
pnpm crawl-pdf export-csv -s DOE-circulars_ocr
# Or include non-relevant documents:
pnpm crawl-pdf export-csv -s DOE-circulars_ocr --all
```

**Process:**

1. **Load Latest Results**
   - Finds most recent `<source>_ocr_reprocessed_*.json`
   - Defaults to relevant documents only

2. **Data Transformation**
   - Flattens nested JSON structure
   - Joins arrays with `|` delimiter (keyNumbers, implications, etc.)
   - Normalizes date formats
   - Infers agency names from source if missing

3. **Generate CSV**
   - **11 Columns:**
     1. Title
     2. Document Type
     3. Effective Date
     4. Agency
     5. Sector
     6. Summary
     7. Key Numbers
     8. Implications
     9. Compliance Requirements
     10. File Path
     11. Relevance (only with `--all` flag)

4. **Save Export**
   - Path: `storage/exports/<source>_reprocessed_latest.csv`
   - UTF-8 encoding with BOM (Excel compatibility)

**Output:**
```
apps/api/storage/exports/
└── DOE-circulars_ocr_reprocessed_latest.csv
```

**Use Cases:**
- Import into Excel/Google Sheets for analysis
- Load into business intelligence tools
- Share with non-technical stakeholders
- Bulk data processing

---

### Phase 5: Digest Generation

**Command:**
```bash
cd apps/api
pnpm crawl-pdf digest -s DOE-circulars_ocr
```

**Process:**

1. **Load & Filter Data**
   - Loads latest OCR-processed results
   - Filters to relevant documents only
   - Sorts by effective date (most recent first)
   - Takes top 10 documents

2. **Data Normalization**
   
   **Date Normalization:**
   ```typescript
   // Handles formats:
   "2025-01-28" → "January 28, 2025"
   "January 28, 2025" → "January 28, 2025"
   "2023-2050" → "2023-2050"
   ```

   **Agency Normalization:**
   ```typescript
   // Standardizes agency names:
   "Department of Energy" → "Department of Energy (DOE)"
   "DOE" → "Department of Energy (DOE)"
   "Energy Regulatory Commission" → "Energy Regulatory Commission (ERC)"
   "ERC" → "Energy Regulatory Commission (ERC)"
   ```

3. **Generate PDF Links**
   - Uses `file://` protocol for local viewing
   - Absolute paths: `file:///Users/.../storage/downloads/doe-circulars/file.pdf`
   - Works when HTML is opened directly in browser

4. **LLM Digest Generation**
   - **Model:** GPT-4o-mini
   - **Temperature:** 0.2 (slight creativity)
   - **Max Tokens:** 4000

   **Prompt Structure:**
   ```
   Generate a professional weekly digest with:
   
   1. Executive Summary (3-4 paragraphs)
   2. Regulatory Updates Table (10 documents, 3-4 sentence summaries each)
   3. Why This Matters (3-5 bullet points)
   4. What to Watch Next (3-5 bullet points)
   
   Include ALL documents provided - do not omit any.
   ```

5. **Markdown to HTML Conversion**
   
   Custom parser handles:
   - **Tables:** Proper `<thead>`, `<tbody>`, `<tr>`, `<td>` structure
   - **Multi-line cells:** Joins lines within table cells
   - **Headings:** `##` → `<h2>`, `###` → `<h3>`
   - **Bullet lists:** `- item` → `<ul><li>item</li></ul>`
   - **Bold text:** `**text**` → `<strong>text</strong>`
   - **Links:** `[text](url)` → `<a href="url">text</a>`
   - **Paragraphs:** Wraps plain text in `<p>` tags

6. **Apply Styling**
   ```html
   <style>
     body { font-family: 'Plus Jakarta Sans', sans-serif; }
     table { border-collapse: collapse; width: 100%; }
     td { vertical-align: top; padding: 12px; }
     ul { margin: 0; padding-left: 20px; }
   </style>
   ```

7. **Save Output**
   - **Markdown:** `storage/digests/<source>/digest_<timestamp>.md`
   - **HTML:** `storage/digests/<source>/digest_<timestamp>.html`

**Output Structure:**
```
apps/api/storage/digests/
└── DOE-circulars_ocr/
    ├── digest_2025-11-21T01-37-40.md
    └── digest_2025-11-21T01-37-40.html
```

**Digest Features:**
- ✅ Professional formatting with responsive design
- ✅ Top 10 most recent regulatory updates
- ✅ 3-4 sentence summaries per document
- ✅ Clickable PDF links
- ✅ Consistent date formatting
- ✅ Normalized agency names
- ✅ Executive summary and analysis sections
- ✅ Ready to email or publish

**Viewing Options:**
1. Open HTML file directly: `open storage/digests/.../*.html`
2. Via Express server: `http://localhost:3001/digests/<source>/digest_<timestamp>.html`

---

## Advanced Features

### Multi-Source Processing

Process multiple sources in sequence:

```bash
# Crawl
pnpm crawl-pdf crawl -s DOE-circulars
pnpm crawl-pdf crawl -s DOE-legacy-ERC

# OCR Process
npx tsx src/cli/ocr-reprocess.ts DOE-circulars
npx tsx src/cli/ocr-reprocess.ts DOE-legacy-ERC

# Generate Digests
pnpm crawl-pdf digest -s DOE-circulars_ocr
pnpm crawl-pdf digest -s DOE-legacy-ERC_ocr
```

### List Available Sources

```bash
pnpm crawl-pdf list-sources
```

### Debug Mode (Non-Headless)

```bash
pnpm crawl-pdf crawl -s DOE-circulars --no-headless
```

Watch browser navigate in real-time for debugging.

### Viewing Stored Files

All downloaded PDFs and digests are served via Express:

```bash
# Start API server
pnpm dev

# Access files
http://localhost:3001/downloads/doe-circulars/file.pdf
http://localhost:3001/digests/DOE-circulars_ocr/digest_latest.html
```

---

## File Storage Structure

```
apps/api/storage/
├── downloads/              # Downloaded PDFs
│   ├── doe-circulars/
│   ├── doe-legacy-erc/
│   └── ...
│
├── ocr/                    # OCR-extracted text
│   ├── doe-circulars/
│   │   ├── file1.txt
│   │   └── file2.txt
│   └── ...
│
├── pdf-crawls/             # Crawl metadata & LLM results
│   ├── DOE-circulars_2025-11-20T04-43-51.json
│   ├── DOE-circulars_ocr_reprocessed_2025-11-20T09-43-59.json
│   └── ...
│
├── exports/                # CSV exports
│   └── DOE-circulars_ocr_reprocessed_latest.csv
│
└── digests/                # Generated newsletters
    ├── DOE-circulars_ocr/
    │   ├── digest_2025-11-21T01-37-40.md
    │   └── digest_2025-11-21T01-37-40.html
    └── ...
```

---

## Technology Stack

### Core Dependencies

- **Crawler:** Playwright (headless Chromium)
- **PDF Processing:** pdf-parse, Ghostscript, Tesseract 5.5.1
- **LLM:** OpenAI GPT-4o-mini
- **Runtime:** Node.js + TypeScript, tsx CLI runner
- **Package Manager:** pnpm

### System Requirements

```bash
# Install Tesseract (OCR engine)
brew install tesseract

# Install Ghostscript (PDF to image conversion)
brew install ghostscript

# Verify installations
tesseract --version  # Should show 5.5.1 or higher
gs --version         # Should show 10.06.0 or higher
```

---

## Error Handling & Validation

### Download Validation

1. **Content-Type Check**
   ```typescript
   if (contentType.includes('text/html')) {
     console.warn('Skipped HTML page, not a PDF');
     continue;
   }
   ```

2. **Magic Byte Check**
   ```typescript
   const buffer = fs.readFileSync(filePath);
   if (!buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
     fs.unlinkSync(filePath);
     console.warn('Invalid PDF, removed');
   }
   ```

### OCR Fallback

- **pdf-parse succeeds (≥400 chars):** Skip OCR entirely
- **pdf-parse fails (<400 chars):** Run full OCR pipeline
- **OCR fails:** Log error, continue with next document

### LLM Parsing

```typescript
try {
  return JSON.parse(llmResponse);
} catch (e) {
  // Tolerant parsing: extract JSON from markdown code blocks
  const match = llmResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (match) return JSON.parse(match[1]);
  throw new Error('Could not parse LLM response');
}
```

---

## Performance Optimization

### Parallelization

```typescript
// Process 3 PDFs at a time
const WORKER_COUNT = 3;
for (let i = 0; i < pdfFiles.length; i += WORKER_COUNT) {
  const batch = pdfFiles.slice(i, i + WORKER_COUNT);
  await Promise.all(batch.map(processFile));
}
```

### Skip-OCR Optimization

- **Text-based PDFs:** ~2-3 seconds per document
- **Scanned PDFs:** ~20-30 seconds per document
- **pdf-parse threshold:** 400 characters (reduces OCR calls by ~60%)

### Download Timeouts

- **Browser download:** 5 seconds (fast, but unreliable for large files)
- **HTTP fallback:** 30 seconds (slower, but more reliable)

---

## Best Practices

### 1. Development Workflow

```bash
# Always work from apps/api directory
cd apps/api

# Set environment variables
cp .env.example .env
# Add OPENAI_API_KEY=sk-...

# Test crawl with small limits first
# Edit SOURCE_CONFIGS: maxPages: 5
pnpm crawl-pdf crawl -s test-source

# Verify downloads before OCR processing
ls storage/downloads/test-source/

# Process with OCR
npx tsx src/cli/ocr-reprocess.ts test-source

# Check results
cat storage/pdf-crawls/test-source_ocr_reprocessed_*.json | jq '.results[] | select(.isRelevant)'
```

### 2. Production Deployment

- **Never commit `.env` files** (use `.env.example` templates)
- **Use `.gitignore` for storage/** (large files, sensitive data)
- **Rotate API keys regularly** (OpenAI usage monitoring)
- **Set up monitoring** (Sentry, log aggregation)
- **Schedule crawls** (cron jobs, GitHub Actions)

### 3. Content Policy

- **Respect robots.txt** (check before crawling)
- **Rate limiting** (add delays between requests if needed)
- **User agent** (identify your crawler)
- **Copyright compliance** (only process publicly available documents)

---

## Troubleshooting

### Common Issues

**1. "OPENAI_API_KEY not found"**
```bash
# Check .env file exists
ls apps/api/.env

# Verify key is loaded
cd apps/api && node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY)"
```

**2. "Tesseract not found"**
```bash
# Install Tesseract
brew install tesseract

# Verify installation
which tesseract
tesseract --version
```

**3. "No PDFs downloaded"**
```bash
# Run in non-headless mode to see what's happening
pnpm crawl-pdf crawl -s SOURCE --no-headless

# Check PDF selectors in SOURCE_CONFIGS
# Try broader selectors: 'a[href$=".pdf"]'
```

**4. "OCR produces gibberish"**
```bash
# Check PDF quality (300 DPI minimum recommended)
# Try higher DPI in ocr-reprocess.ts: -r600

# Verify Ghostscript installation
gs --version
```

**5. "LLM returns non-relevant for everything"**
```typescript
// Check relevancy prompt in pdf-llm-processor.service.ts
// Consider loosening criteria:
"Documents about policy, regulation, tariffs, rates, market rules, 
 or compliance are relevant. General announcements may also be relevant."
```

---

## Future Enhancements

### Planned Features

- [ ] **Automated scheduling** (daily/weekly crawls via cron)
- [ ] **Email delivery** (send digests via SendGrid/Resend)
- [ ] **Web dashboard** (Next.js UI for viewing digests)
- [ ] **Database integration** (PostgreSQL for structured storage)
- [ ] **Search API** (query datapoints by date, sector, agency)
- [ ] **Multi-language support** (Tagalog, Spanish, etc.)
- [ ] **Webhook notifications** (Slack, Discord, Teams)
- [ ] **PDF diff detection** (track amendments to existing documents)

### Scalability Considerations

- **Distributed OCR:** Use AWS Textract or Google Cloud Vision API
- **Queue system:** Redis + Bull for job management
- **Caching:** Store processed results in database
- **CDN:** Serve static digests via Cloudflare/Vercel
- **Monitoring:** Prometheus + Grafana for metrics

---

## Summary

The CSV Crawler provides an end-to-end pipeline for regulatory monitoring:

1. **Crawl** government websites → Download PDFs
2. **Process** with OCR + LLM → Extract structured data
3. **Export** as CSV → For analysis
4. **Digest** top 10 → Professional newsletter

**Total Time (Example):**
- Crawl: ~5 minutes (38 PDFs)
- OCR+LLM: ~15 minutes (38 PDFs, 3 workers)
- Export: <1 second
- Digest: ~30 seconds (LLM generation)

**Result:** High-quality, actionable intelligence delivered in <30 minutes per source.

---

## Resources

- **Repository:** https://github.com/Lexie-csv/csv-crawler-BE
- **OpenAI Docs:** https://platform.openai.com/docs
- **Playwright Docs:** https://playwright.dev/
- **Tesseract Wiki:** https://github.com/tesseract-ocr/tesseract

---

*Last Updated: November 21, 2025*
