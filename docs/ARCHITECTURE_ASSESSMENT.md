# Architecture Assessment & Roadmap to Agnostic Crawler

## Executive Summary

**Current State:** ❌ **NOT Agnostic**  
**Ideal State:** ✅ **Fully Agnostic Multi-Format Crawler**

The current implementation is **source-specific** and **PDF-only**. However, the foundation for a fully agnostic crawler already exists in the codebase but is **commented out/disabled**.

---

## Current Architecture Analysis

### ✅ What IS Agnostic (Production Ready)

| Component | Status | Description |
|-----------|--------|-------------|
| **PDF Download** | ✅ Agnostic | Works for any PDF from any source |
| **PDF Validation** | ✅ Agnostic | Content-type + magic byte checks |
| **OCR Processing** | ✅ Agnostic | Ghostscript + Tesseract pipeline |
| **LLM Extraction** | ✅ Agnostic | Schema works for any regulatory doc |
| **Data Storage** | ✅ Agnostic | Generic JSON structure |
| **CSV Export** | ✅ Agnostic | Works with any processed source |
| **Digest Generation** | ✅ Agnostic | Template-based HTML output |

### ❌ What IS NOT Agnostic (Hardcoded)

| Component | Status | Issue | Impact |
|-----------|--------|-------|--------|
| **CSS Selectors** | ❌ Hardcoded | Each source needs manual selector configuration | Cannot crawl new sites without code changes |
| **Navigation Logic** | ❌ Brittle | Assumes specific page structures | Breaks on non-standard layouts |
| **Link Discovery** | ❌ Manual | Predefined selectors per source | Misses PDFs with different class/ID names |
| **HTML Extraction** | ❌ Disabled | Code exists but commented out | Cannot extract data from HTML pages (only PDFs) |
| **Content Type Detection** | ❌ Limited | Only handles PDFs | Cannot process DOC, DOCX, Excel, HTML tables |

---

## Current Implementation: Source Configs

Here's how sources are currently configured (hardcoded):

```typescript
// apps/api/src/cli/pdf-crawler.cli.ts

const SOURCE_CONFIGS: Record<string, PdfSourceConfig> = {
    'DOE-circulars': {
        name: 'DOE-circulars',
        startUrl: 'https://legacy.doe.gov.ph/?q=laws-and-issuances/department-circular',
        domainAllowlist: ['legacy.doe.gov.ph', 'doe.gov.ph'],
        downloadDir: './storage/downloads/doe-circulars',
        maxDepth: 2,
        maxPages: 50,
        pdfLinkSelectorHints: [
            'a[href$=".pdf"]',           // ⚠️ Hardcoded
            'a[href$=".PDF"]',           // ⚠️ Hardcoded
            'a[href*="/sites/default/files/pdf/"]'  // ⚠️ Hardcoded
        ],
        scrollToBottom: true,
        headless: true,
    },
    // ... more hardcoded sources
};
```

**Problem:** To crawl a new agency (e.g., SEC, BSP, PAGCOR), you must:
1. Add new config to `SOURCE_CONFIGS`
2. Manually find CSS selectors
3. Test and iterate selectors
4. Redeploy code

---

## Hidden Capability: HTML Extraction (Disabled)

**Good News:** The codebase already has HTML extraction infrastructure!

### Evidence in Code

```typescript
// packages/types/src/index.ts

export interface ExtractedHtmlContent {
    readonly is_relevant: boolean;
    readonly category: 'circular' | 'order' | 'resolution' | 'announcement' | 'news' | 'table_data' | 'other';
    readonly title: string;
    readonly source_url: string;
    readonly issuing_body: string;
    readonly published_date: string | null;
    readonly effective_date: string | null;
    readonly summary: string;
    readonly key_numbers: Array<{
        name: string;
        value: number;
        unit: string;
    }>;
    readonly topics: string[];
    readonly content_type: 'html_page' | 'html_table' | 'html_announcement';
    readonly raw_text_excerpt: string;
    readonly raw_text_hash: string;
}
```

```typescript
// apps/api/src/services/pdf-rpa-crawler.ts

// ❌ CURRENTLY COMMENTED OUT:
// import { HtmlContentExtractor } from './html-content-extractor.js';
// private htmlExtractor: HtmlContentExtractor;
// private extractedHtmlContent: ExtractedHtmlContent[] = [];

// In crawlPdfSource():
//     if (config.analyzeHtml) {
//         const analyzed = await this.htmlExtractor.analyze(htmlContent);
//         this.extractedHtmlContent.push(analyzed);
//     }
```

**Why Disabled?** Likely incomplete implementation or testing. The types and structure exist.

---

## Your Ideal Architecture Requirements

Based on your description: *"an agnostic crawler that can scan, identify, download, extract, analyse, and present data in different output formats"*

### Required Capabilities

1. **✅ Scan** - Navigate any website structure
2. **⚠️ Identify** - Detect PDFs (yes) + HTML content (no) + other formats (no)
3. **✅ Download** - PDFs work, others need implementation
4. **⚠️ Extract** - PDFs work, HTML partially exists, DOC/DOCX/Excel missing
5. **✅ Analyse** - LLM processing is agnostic
6. **✅ Present** - CSV + Digest work, could add more formats

### Content Types to Support

| Format | Current Support | Priority | Effort |
|--------|----------------|----------|--------|
| **PDF** | ✅ Full support | - | Done |
| **HTML Pages** | ⚠️ Code exists but disabled | 🔥 High | Medium (enable + test) |
| **HTML Tables** | ❌ Not implemented | 🔥 High | Medium (scraping logic) |
| **DOCX** | ❌ Not implemented | 🔶 Medium | Low (use mammoth.js) |
| **DOC** | ❌ Not implemented | 🔶 Medium | Medium (use antiword) |
| **Excel** | ❌ Not implemented | 🔶 Medium | Low (use xlsx) |
| **Images (JPG/PNG)** | ❌ Not implemented | ⚪ Low | Low (OCR already exists) |

---

## Roadmap to Agnostic Crawler

### Phase 1: Enable HTML Extraction (2-3 days)

**Goal:** Extract and analyze HTML content alongside PDFs

**Tasks:**
1. ✅ Uncomment `HtmlContentExtractor` imports
2. ✅ Implement `html-content-extractor.ts` service
3. ✅ Add Playwright text extraction from pages
4. ✅ Use LLM to extract structured data from HTML
5. ✅ Store HTML extractions in results JSON
6. ✅ Update digest/CSV exports to include HTML content

**Benefits:**
- Capture announcements/press releases on HTML pages
- Extract data from pages without PDFs
- Get real-time updates before PDFs are published

**Example Use Case:**
```
BSP publishes interest rate changes as HTML announcements
→ Currently: Missed (only downloads PDFs)
→ After: Captured and analyzed
```

### Phase 2: Intelligent Link Discovery (1 week)

**Goal:** Auto-detect PDF/document links without hardcoded selectors

**Approach:**

```typescript
// Intelligent link discovery
async discoverDocumentLinks(page: Page): Promise<string[]> {
    const links = await page.$$eval('a', (anchors) => {
        return anchors
            .map(a => ({
                href: a.href,
                text: a.textContent?.trim() || '',
                classes: a.className,
            }))
            .filter(link => {
                // Pattern matching instead of hardcoded selectors
                const isPdf = link.href.match(/\.pdf$/i);
                const hasDocKeywords = /download|circular|order|resolution|issuance|memo/i.test(link.text);
                const hasDocIcon = /pdf|doc|file|download/.test(link.classes);
                
                return isPdf || hasDocKeywords || hasDocIcon;
            })
            .map(link => link.href);
    });
    
    return [...new Set(links)]; // Deduplicate
}
```

**Benefits:**
- No more `pdfLinkSelectorHints` config needed
- Works across different website designs
- Auto-adapts to site redesigns

### Phase 3: Multi-Format Support (1 week)

**Goal:** Process DOCX, DOC, Excel files

**Implementation:**

```typescript
// packages/types/src/index.ts
export type DocumentFormat = 'pdf' | 'docx' | 'doc' | 'xlsx' | 'xls' | 'html';

// apps/api/src/services/document-processor.ts
class UniversalDocumentProcessor {
    async extractText(filePath: string): Promise<string> {
        const ext = path.extname(filePath).toLowerCase();
        
        switch (ext) {
            case '.pdf':
                return this.extractPdfText(filePath);
            case '.docx':
                return this.extractDocxText(filePath); // mammoth.js
            case '.doc':
                return this.extractDocText(filePath);  // antiword CLI
            case '.xlsx':
            case '.xls':
                return this.extractExcelText(filePath); // xlsx library
            case '.html':
                return this.extractHtmlText(filePath);
            default:
                throw new Error(`Unsupported format: ${ext}`);
        }
    }
}
```

**Dependencies to Add:**
```bash
pnpm add mammoth xlsx cheerio antiword
```

**Benefits:**
- Capture documents in any format
- No data loss from format limitations
- Comprehensive regulatory monitoring

### Phase 4: LLM-Based Navigation (2-3 weeks)

**Goal:** Use LLM to understand site structure and navigate intelligently

**Approach:**

```typescript
class IntelligentNavigator {
    async discoverNavigationPaths(page: Page, goal: string): Promise<string[]> {
        // Extract page structure
        const pageStructure = await page.evaluate(() => {
            return {
                title: document.title,
                headings: [...document.querySelectorAll('h1, h2, h3')].map(h => h.textContent),
                mainLinks: [...document.querySelectorAll('nav a, .menu a')].map(a => ({
                    text: a.textContent?.trim(),
                    href: a.href
                }))
            };
        });
        
        // Ask LLM which links to follow
        const prompt = `
        Goal: ${goal}
        
        Page Title: ${pageStructure.title}
        Available Links: ${JSON.stringify(pageStructure.mainLinks, null, 2)}
        
        Which links should I click to find regulatory documents, circulars, or policy announcements?
        Return as JSON array of hrefs.
        `;
        
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
        });
        
        return JSON.parse(response.choices[0].message.content);
    }
}
```

**Benefits:**
- **Zero configuration for new sites**
- Understands context (e.g., "Find energy policy documents")
- Adapts to site changes automatically

**Example:**
```typescript
await crawler.crawl({
    startUrl: 'https://newagency.gov.ph',
    goal: 'Find all regulatory circulars from 2024-2025',
    // No selectors needed!
});
```

### Phase 5: Database Integration (1 week)

**Goal:** Store structured data in PostgreSQL for querying

**Schema:**

```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    format TEXT NOT NULL,  -- 'pdf', 'html', 'docx', etc.
    title TEXT,
    document_type TEXT,
    effective_date DATE,
    agency TEXT,
    sector TEXT,
    summary TEXT,
    content_hash TEXT UNIQUE,
    file_path TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE key_numbers (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id),
    name TEXT,
    value NUMERIC,
    unit TEXT
);

CREATE INDEX idx_documents_agency ON documents(agency);
CREATE INDEX idx_documents_effective_date ON documents(effective_date);
CREATE INDEX idx_documents_sector ON documents(sector);
```

**Benefits:**
- Query across all sources
- Track document changes over time
- Build API for data access
- Enable search functionality

---

## Proposed Agnostic Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Universal Crawler Engine                    │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Intelligent Navigator (LLM-powered)                        │
│     ├── Understands website structure                          │
│     ├── Discovers relevant pages                               │
│     └── No hardcoded selectors                                 │
│                                                                 │
│  2. Multi-Format Detector                                      │
│     ├── PDF (✅ working)                                        │
│     ├── HTML pages (⚠️ needs enabling)                         │
│     ├── DOCX/DOC (❌ needs implementation)                     │
│     ├── Excel (❌ needs implementation)                        │
│     └── Images (❌ needs implementation)                       │
│                                                                 │
│  3. Universal Content Extractor                                │
│     ├── PDF → pdf-parse + OCR                                  │
│     ├── HTML → Cheerio/Playwright                              │
│     ├── DOCX → mammoth.js                                      │
│     ├── DOC → antiword                                         │
│     └── Excel → xlsx                                           │
│                                                                 │
│  4. LLM Analyzer (✅ already agnostic)                         │
│     ├── Relevancy detection                                    │
│     ├── Structured extraction                                  │
│     └── Categorization                                         │
│                                                                 │
│  5. Data Layer                                                 │
│     ├── PostgreSQL (persistent storage)                        │
│     ├── File storage (raw documents)                           │
│     └── Cache layer (Redis - optional)                         │
│                                                                 │
│  6. Output Generator (✅ already agnostic)                     │
│     ├── CSV exports                                            │
│     ├── HTML digests                                           │
│     ├── JSON API                                               │
│     └── Email newsletters                                      │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## Migration Path: Quick Wins

### Week 1: Enable HTML Extraction (High Impact, Low Effort)

```typescript
// 1. Implement html-content-extractor.ts
export class HtmlContentExtractor {
    async extract(page: Page): Promise<HtmlPageContent> {
        const content = await page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            text: document.body.innerText,
            tables: [...document.querySelectorAll('table')].map(t => t.outerHTML),
        }));
        
        return content;
    }
    
    async analyze(content: HtmlPageContent): Promise<ExtractedHtmlContent> {
        // Use existing LLM processor with HTML content
        return await this.llmProcessor.processHtml(content);
    }
}

// 2. Uncomment in pdf-rpa-crawler.ts
import { HtmlContentExtractor } from './html-content-extractor.js';
private htmlExtractor: HtmlContentExtractor;

// 3. Add config flag
interface PdfSourceConfig {
    // ... existing fields
    analyzeHtml?: boolean;  // Enable HTML extraction
}
```

**Test with:**
```bash
pnpm crawl-pdf crawl -s DOE-circulars --analyze-html
```

### Week 2: Smart Link Discovery (Medium Impact, Medium Effort)

Replace hardcoded selectors with pattern matching:

```typescript
// Before (hardcoded):
pdfLinkSelectorHints: ['a[href$=".pdf"]', 'a[href*="/sites/default/files/"]']

// After (intelligent):
async findDocumentLinks(page: Page): Promise<string[]> {
    return await page.$$eval('a', anchors => {
        return anchors
            .filter(a => {
                const href = a.href.toLowerCase();
                const text = (a.textContent || '').toLowerCase();
                
                // Pattern: file extensions
                if (/\.(pdf|docx?|xlsx?)$/i.test(href)) return true;
                
                // Pattern: document keywords
                if (/(circular|order|resolution|memo|issuance|advisory)/i.test(text)) return true;
                
                // Pattern: download indicators
                if (/(download|view.*pdf|attachment)/i.test(text)) return true;
                
                return false;
            })
            .map(a => a.href);
    });
}
```

### Week 3: Add DOCX Support (Low Effort, Good Coverage)

```bash
pnpm add mammoth
```

```typescript
import mammoth from 'mammoth';

async extractDocxText(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}
```

---

## Example: Adding a New Agency (Before vs After)

### Current Approach (❌ Not Agnostic)

```typescript
// 1. Edit code: apps/api/src/cli/pdf-crawler.cli.ts
const SOURCE_CONFIGS = {
    'SEC': {  // ⚠️ Manual configuration
        name: 'SEC',
        startUrl: 'https://sec.gov.ph/circulars',
        pdfLinkSelectorHints: [
            'a[href$=".pdf"]',  // ⚠️ Hope this works
            // ... iterate and test
        ],
        maxDepth: 2,
        maxPages: 50,
    }
};

// 2. Test and debug selectors (trial and error)
// 3. Redeploy code
// 4. Run crawl
```

**Time:** 2-4 hours per source  
**Scalability:** Poor (requires developer intervention)

### Agnostic Approach (✅ Goal)

```bash
# 1. No code changes needed - just run:
pnpm crawl-pdf crawl \
  --url https://sec.gov.ph/circulars \
  --goal "Find all SEC memorandum circulars" \
  --name SEC
  
# 2. Crawler auto-discovers:
#    - Navigation paths
#    - Document links (PDFs, DOCX, HTML)
#    - Relevant content
  
# 3. Results saved automatically
```

**Time:** 5 minutes  
**Scalability:** Excellent (non-technical users can add sources)

---

## Recommended Implementation Priority

### 🔥 Phase 1 (Week 1-2): Critical Path
1. ✅ Enable HTML extraction (80% done, just uncomment + test)
2. ✅ Implement intelligent link discovery (remove hardcoded selectors)
3. ✅ Test with 3 different agencies (DOE, SEC, BSP)

### 🔶 Phase 2 (Week 3-4): High Value
4. ✅ Add DOCX support (mammoth.js)
5. ✅ Add Excel support (xlsx)
6. ✅ Database integration (PostgreSQL)
7. ✅ Search API endpoint

### ⚪ Phase 3 (Week 5-6): Advanced Features
8. ✅ LLM-based navigation (fully autonomous)
9. ✅ Document change detection (version tracking)
10. ✅ Webhook notifications (Slack/Discord)
11. ✅ Web UI for adding sources

---

## Cost-Benefit Analysis

### Current System (Source-Specific)

**Pros:**
- ✅ Simple to understand
- ✅ Predictable behavior
- ✅ Works for known sources

**Cons:**
- ❌ Requires developer for each new source
- ❌ Breaks when sites change design
- ❌ Misses HTML-only content
- ❌ Limited to PDFs
- ❌ Poor scalability (manual config)

**Scalability:** 5-10 sources maximum (developer bottleneck)

### Agnostic System (Goal)

**Pros:**
- ✅ Zero-config for new sources
- ✅ Auto-adapts to site changes
- ✅ Multi-format support
- ✅ HTML + PDF + DOCX + Excel
- ✅ Non-technical users can add sources

**Cons:**
- ⚠️ More complex initial implementation
- ⚠️ Higher LLM costs (more API calls)
- ⚠️ Requires careful prompt engineering
- ⚠️ May over-crawl on first run

**Scalability:** 100+ sources easily (no developer needed)

---

## Questions for You

Before proceeding with the implementation, please clarify:

1. **Priority:** Do you want HTML extraction first (quick win) or full agnostic navigation (longer-term)?

2. **Scope:** Which document formats are most important?
   - PDFs (✅ done)
   - HTML pages (⚠️ 80% done)
   - DOCX (easy to add)
   - Excel (easy to add)
   - DOC (requires CLI tool)
   - Images (use existing OCR)

3. **Agencies:** Which 3-5 agencies should we test with initially?
   - Department of Energy (✅ working)
   - Energy Regulatory Commission (✅ working)
   - Securities and Exchange Commission?
   - Bangko Sentral ng Pilipinas?
   - Others?

4. **Budget:** LLM-based navigation will increase API costs. Estimate:
   - Current: ~$0.01 per document (extraction only)
   - Agnostic: ~$0.05-0.10 per document (navigation + extraction)
   - Are you comfortable with this?

5. **Database:** Should we integrate PostgreSQL now or keep file-based storage?

---

## Next Steps

**Option A: Quick Win (HTML Extraction)**
- ✅ 2-3 days to implement
- ✅ Immediate value (capture HTML announcements)
- ✅ Low risk
- ⚠️ Still requires hardcoded selectors

**Option B: Full Agnostic (LLM Navigation)**
- ⚠️ 2-3 weeks to implement
- ✅ Long-term scalability
- ✅ Zero-config for new sources
- ⚠️ Higher complexity

**Option C: Hybrid Approach (Recommended)**
- Week 1: Enable HTML extraction
- Week 2: Intelligent link discovery
- Week 3: Multi-format support
- Week 4: LLM navigation (optional)

**My Recommendation:** Start with **Option C (Hybrid)**. This gives you immediate value while building toward full agnosticism.

---

## Conclusion

**Current Answer to Your Question:**
> "If I fed you the URL of a different agency, would you be able to perform the crawl in a similar manner?"

**Short Answer:** ❌ No, not currently. You'd need to add hardcoded configuration.

**Good News:** 🎯 The foundation for a fully agnostic crawler already exists in your codebase. With 2-4 weeks of focused development, you can achieve:

✅ Zero-config crawling of any government site  
✅ Multi-format support (PDF + HTML + DOCX + Excel)  
✅ Intelligent navigation without selectors  
✅ Scalability to 100+ sources  

**HTML Extraction:** 80% complete (code exists, just commented out)  
**Smart Link Discovery:** Can implement in 1 week  
**LLM Navigation:** Most complex, but highest ROI  

Let me know which path you want to pursue, and I'll start implementing!

---

*Last Updated: November 21, 2025*
