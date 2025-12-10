/**
 * PDF RPA Crawler Service
 * 
 * RPA-style crawler that:
 * 1. Opens public websites with Playwright
 * 2. Scrolls and discovers PDF links
 * 3. Downloads PDFs
 * 4. Extracts text from PDFs
 * 5. Uses OpenAI LLM to extract structured policy data
 * 
 * Focus: Sites where important information is inside PDFs, not just HTML
 */

import { chromium, Browser, Page, BrowserContext, Download } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import type {
    PdfSourceConfig,
    DownloadedPdf,
    ExtractedPolicyDocument,
    PdfCrawlResult,
    ExtractedHtmlContent,
} from '@csv/types';
import { HtmlContentExtractor } from './html-content-extractor.js';
import PdfLlmProcessor from './pdf-llm-processor.service.js';
import { DocumentChangeDetector } from './document-change-detector.js';
import { Pool } from 'pg';

export class PdfRpaCrawler {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private openai: OpenAI | null = null;
    private visitedUrls: Set<string> = new Set();
    private downloadedPdfs: DownloadedPdf[] = [];
    private extractedDocuments: ExtractedPolicyDocument[] = [];
    private extractedHtmlContent: ExtractedHtmlContent[] = [];
    private errors: Array<{ url: string; error: string; timestamp: Date }> = [];
    private htmlExtractor: HtmlContentExtractor;
    private llmProcessor: PdfLlmProcessor;
    private changeDetector: DocumentChangeDetector | null = null;
    private newDocuments: number = 0;
    private updatedDocuments: number = 0;
    private unchangedDocuments: number = 0;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        } else {
            console.warn('[PdfRpaCrawler] OPENAI_API_KEY not set - extraction will be skipped');
        }
        this.htmlExtractor = new HtmlContentExtractor();
        this.llmProcessor = new PdfLlmProcessor();

        // Initialize change detector if database is configured
        if (process.env.DATABASE_URL) {
            try {
                const pool = new Pool({ connectionString: process.env.DATABASE_URL });
                this.changeDetector = new DocumentChangeDetector(pool);
            } catch (error) {
                console.warn('[PdfRpaCrawler] Failed to initialize change detector:', error);
            }
        }
    }

    /**
     * Main crawl entry point
     */
    async crawlPdfSource(config: PdfSourceConfig): Promise<PdfCrawlResult> {
        const startTime = new Date();
        console.log(`\n🚀 Starting PDF RPA crawl: ${config.name}`);
        console.log(`📍 Start URL: ${config.startUrl}`);
        console.log(`📂 Download dir: ${config.downloadDir}\n`);

        // Reset state
        this.visitedUrls.clear();
        this.downloadedPdfs = [];
        this.extractedDocuments = [];
        this.extractedHtmlContent = [];
        this.errors = [];

        try {
            // Initialize browser
            await this.initBrowser(config.headless ?? true);

            // Ensure download directory exists
            await fs.mkdir(config.downloadDir, { recursive: true });

            // BFS queue: { url, depth }
            const queue: Array<{ url: string; depth: number }> = [
                { url: config.startUrl, depth: 0 },
            ];

            let pagesVisited = 0;

            while (queue.length > 0 && pagesVisited < config.maxPages) {
                const { url, depth } = queue.shift()!;

                // Skip if already visited or exceeds max depth
                if (this.visitedUrls.has(url) || depth > config.maxDepth) {
                    continue;
                }

                // Skip if not in allowed domains
                if (!this.isAllowedDomain(url, config.domainAllowlist)) {
                    continue;
                }

                console.log(`[${pagesVisited + 1}/${config.maxPages}] Visiting (depth ${depth}): ${url}`);

                try {
                    this.visitedUrls.add(url);
                    pagesVisited++;

                    const page = await this.context!.newPage();

                    try {
                        // Navigate to page. Try networkidle first, then fallback to domcontentloaded
                        try {
                            await page.goto(url, {
                                waitUntil: 'networkidle',
                                timeout: 60000,
                            });
                        } catch (navErr) {
                            console.warn(`[PdfRpaCrawler] networkidle navigation failed for ${url}, falling back to domcontentloaded: ${navErr}`);
                            await page.goto(url, {
                                waitUntil: 'domcontentloaded',
                                timeout: 60000,
                            });
                        }

                        // Scroll to bottom if configured (loads lazy content)
                        if (config.scrollToBottom) {
                            await this.scrollToBottom(page);
                        }

                        // Optionally analyze HTML content before finding PDFs
                        if (config.analyzeHtml) {
                            await this.analyzeHtmlPage(page, config);
                        }

                        // Find and download PDFs
                        await this.downloadPdfsFromPage(page, config, url);

                        // Find new pages to visit
                        const newLinks = await this.extractLinks(page, url, depth, config);
                        queue.push(...newLinks);
                    } finally {
                        await page.close();
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(`❌ Error visiting ${url}:`, errorMsg);
                    this.errors.push({
                        url,
                        error: errorMsg,
                        timestamp: new Date(),
                    });
                }

                // Small delay between pages
                await this.delay(500);
            }

            console.log(`\n📊 Crawl complete! Downloaded ${this.downloadedPdfs.length} PDFs`);

            // Extract text and run LLM analysis on all PDFs (LLM runs only if configured)
            console.log(`\n🗂️  Processing downloaded PDFs (text extraction will always run)...`);
            await this.processPdfs(config);

            // Track changes if change detector is available
            if (this.changeDetector && (this.extractedDocuments.length > 0 || this.extractedHtmlContent.length > 0)) {
                console.log(`\n🔍 Detecting changes...`);
                await this.trackChanges(config.name);
            }

            const endTime = new Date();

            const result: PdfCrawlResult = {
                sourceName: config.name,
                startUrl: config.startUrl,
                pagesVisited,
                pdfsDownloaded: this.downloadedPdfs.length,
                pdfsProcessed: this.extractedDocuments.length,
                relevantDocuments: this.extractedDocuments.filter(d => d.is_relevant).length,
                htmlPagesAnalyzed: config.analyzeHtml ? this.extractedHtmlContent.length : undefined,
                relevantHtmlPages: config.analyzeHtml ? this.extractedHtmlContent.filter(h => h.is_relevant).length : undefined,
                newDocuments: this.newDocuments,
                updatedDocuments: this.updatedDocuments,
                unchangedDocuments: this.unchangedDocuments,
                errors: this.errors,
                downloadedPdfs: this.downloadedPdfs,
                extractedDocuments: this.extractedDocuments,
                extractedHtmlContent: config.analyzeHtml ? this.extractedHtmlContent : undefined,
                startedAt: startTime,
                completedAt: endTime,
            };

            return result;
        } finally {
            await this.closeBrowser();
        }
    }

    /**
     * Track changes for all extracted documents
     */
    private async trackChanges(sourceName: string): Promise<void> {
        if (!this.changeDetector) {
            return;
        }

        // Get source_id from database
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        let sourceId: string | null = null;

        try {
            const result = await pool.query(
                'SELECT id FROM sources WHERE name = $1',
                [sourceName]
            );

            if (result.rows.length === 0) {
                console.log(`   ⚠️  Source "${sourceName}" not found in database. Skipping change detection.`);
                return;
            }

            sourceId = result.rows[0].id;
        } catch (error) {
            console.error(`   ❌ Failed to lookup source: ${error}`);
            return;
        } finally {
            await pool.end();
        }

        if (!sourceId) {
            return;
        }

        const allDocuments = [
            ...this.extractedDocuments.map(d => ({ ...d, content_type: 'pdf' })),
            ...this.extractedHtmlContent.map(h => ({ ...h, content_type: 'html_page' }))
        ];

        for (const doc of allDocuments) {
            try {
                const documentUrl = doc.source_url || '';
                if (!documentUrl || !doc.title) {
                    continue; // Skip documents without URL or title
                }

                const result = await this.changeDetector.processDocument(sourceId, doc);

                if (result.isNew) {
                    this.newDocuments++;
                    console.log(`   ✨ NEW: ${doc.title}`);
                } else if (result.hasChanged) {
                    this.updatedDocuments++;
                    console.log(`   🔄 UPDATED: ${doc.title}`);
                } else {
                    this.unchangedDocuments++;
                }
            } catch (error) {
                console.error(`   ❌ Failed to track changes for: ${doc.title}`, error instanceof Error ? error.message : String(error));
            }
        }

        console.log(`\n📊 Change Summary:`);
        console.log(`   New documents: ${this.newDocuments}`);
        console.log(`   Updated documents: ${this.updatedDocuments}`);
        console.log(`   Unchanged documents: ${this.unchangedDocuments}`);
    }

    /**
     * Initialize Playwright browser with stealth settings
     */
    private async initBrowser(headless: boolean): Promise<void> {
        this.browser = await chromium.launch({
            headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
            ],
        });

        this.context = await this.browser.newContext({
            acceptDownloads: true,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
    }

    /**
     * Close browser
     */
    private async closeBrowser(): Promise<void> {
        if (this.context) {
            await this.context.close();
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Check if URL is in allowed domains
     */
    private isAllowedDomain(url: string, allowlist: string[]): boolean {
        try {
            const urlObj = new URL(url);
            return allowlist.some(domain => urlObj.hostname.includes(domain));
        } catch {
            return false;
        }
    }

    /**
     * Scroll page to bottom to trigger lazy-loaded content
     */
    private async scrollToBottom(page: Page): Promise<void> {
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    // @ts-ignore - runs in browser context
                    const scrollHeight = document.body.scrollHeight;
                    // @ts-ignore - runs in browser context
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // Wait for any lazy-loaded content
        await page.waitForTimeout(1000);
    }

    /**
     * Analyze HTML page content using LLM
     */
    private async analyzeHtmlPage(
        page: Page,
        config: PdfSourceConfig
    ): Promise<void> {
        try {
            // Extract HTML content
            const htmlContent = await this.htmlExtractor.extract(page);

            if (!htmlContent || htmlContent.mainText.length < 200) {
                console.log(`   ⏭️  Skipping HTML analysis - content too short`);
                return;
            }

            // Quick heuristic check before calling LLM
            if (!this.htmlExtractor.isLikelyRelevant(htmlContent)) {
                console.log(`   ⏭️  Skipping HTML analysis - doesn't look like regulatory content`);
                return;
            }

            // Analyze with LLM
            const analyzed = await this.llmProcessor.analyzeHtmlContent(htmlContent, config.name);

            if (analyzed) {
                this.extractedHtmlContent.push(analyzed);
                console.log(`   ✅ HTML content analyzed: ${analyzed.title} (relevant=${analyzed.is_relevant})`);
            }
        } catch (error) {
            console.error(`   ❌ Error analyzing HTML page:`, error);
        }
    }

    /**
     * Find and download all PDFs on the page
     */
    private async downloadPdfsFromPage(
        page: Page,
        config: PdfSourceConfig,
        pageUrl: string
    ): Promise<void> {
        // Build selectors for PDF links
        const selectors = config.pdfLinkSelectorHints || [
            'a[href$=".pdf"]',
            'a[href$=".PDF"]',
        ];

        // Get all PDF links
        const pdfLinks = await page.$$eval(
            selectors.join(', '),
            (links, baseUrl) => {
                return links.map((link: any) => {
                    const href = link.href;
                    const text = link.textContent?.trim() || '';
                    return { href, text };
                }).filter(l => l.href);
            },
            pageUrl
        );

        console.log(`   Found ${pdfLinks.length} PDF link(s)`);

        // Limit number of PDFs to download per page to avoid issues
        const maxPdfsPerPage = 10;
        const pdfsToDownload = pdfLinks.slice(0, maxPdfsPerPage);

        if (pdfLinks.length > maxPdfsPerPage) {
            console.log(`   ⚠️  Limiting to first ${maxPdfsPerPage} PDFs`);
        }

        for (const pdfLink of pdfsToDownload) {
            try {
                const pdfUrl = pdfLink.href;

                // Skip if already downloaded
                if (this.downloadedPdfs.some(p => p.sourceUrl === pdfUrl)) {
                    continue;
                }

                console.log(`   📥 Downloading: ${pdfLink.text || path.basename(pdfUrl)}`);

                // Start download - try Playwright download event with fallback to direct request
                const fileName = this.sanitizeFileName(pdfLink.text || path.basename(pdfUrl));
                const filePath = path.join(config.downloadDir, fileName);

                try {
                    // Try native download event (works when links trigger download)
                    console.log(`      Attempting browser download event...`);
                    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });

                    // Trigger download by creating and clicking an anchor
                    await page.evaluate((url) => {
                        // @ts-ignore - runs in browser context
                        const a = document.createElement('a');
                        a.href = url;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        // @ts-ignore - runs in browser context
                        document.body.appendChild(a);
                        a.click();
                        // @ts-ignore - runs in browser context
                        document.body.removeChild(a);
                    }, pdfUrl);

                    // Wait for download to start
                    const download = await downloadPromise;

                    // Save file and wait for completion
                    await download.saveAs(filePath);

                    // Verify file was saved
                    const stats = await fs.stat(filePath);

                    this.downloadedPdfs.push({
                        sourceName: config.name,
                        sourceUrl: pdfUrl,
                        filePath,
                        fileName,
                        downloadedAt: new Date(),
                        fileSizeBytes: stats.size,
                    });

                    console.log(`   ✓ Saved: ${fileName} (${this.formatBytes(stats.size)})`);
                } catch (dlErr) {
                    // Fallback: try direct HTTP GET via Playwright context.request
                    try {
                        console.log(`      Browser event failed, trying direct HTTP GET...`);
                        const resp = await this.context!.request.get(pdfUrl, { timeout: 30000 });
                        if (!resp.ok()) {
                            throw new Error(`HTTP ${resp.status()}`);
                        }

                        // Validate content type - reject HTML pages
                        const contentType = resp.headers()['content-type'] || '';
                        if (contentType.toLowerCase().includes('text/html')) {
                            console.log(`   ⚠️  Skipping HTML page (not a PDF): ${pdfUrl}`);
                            this.errors.push({
                                url: pdfUrl,
                                error: 'Skipped: HTML page, not a PDF',
                                timestamp: new Date(),
                            });
                            continue;
                        }

                        const buffer = await resp.body();

                        // Additional validation: check PDF magic bytes
                        if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
                            console.log(`   ⚠️  Skipping invalid PDF file: ${pdfUrl}`);
                            this.errors.push({
                                url: pdfUrl,
                                error: 'Skipped: Not a valid PDF (missing PDF header)',
                                timestamp: new Date(),
                            });
                            continue;
                        }

                        await fs.writeFile(filePath, buffer);
                        const stats = await fs.stat(filePath);

                        this.downloadedPdfs.push({
                            sourceName: config.name,
                            sourceUrl: pdfUrl,
                            filePath,
                            fileName,
                            downloadedAt: new Date(),
                            fileSizeBytes: stats.size,
                        });

                        console.log(`   ✓ Saved (fallback): ${fileName} (${this.formatBytes(stats.size)})`);
                    } catch (reqErr) {
                        const errMsg = reqErr instanceof Error ? reqErr.message : String(reqErr);
                        console.error(`   ❌ Download failed (both methods): ${errMsg}`);
                        this.errors.push({
                            url: pdfUrl,
                            error: `Download failed: ${errMsg}`,
                            timestamp: new Date(),
                        });
                        continue;
                    }
                }

                // Small delay between downloads
                await this.delay(800);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`   ❌ Download failed: ${errorMsg}`);
                this.errors.push({
                    url: pdfLink.href,
                    error: `Download failed: ${errorMsg}`,
                    timestamp: new Date(),
                });
            }
        }
    }

    /**
     * Extract links from page for crawling
     */
    private async extractLinks(
        page: Page,
        currentUrl: string,
        currentDepth: number,
        config: PdfSourceConfig
    ): Promise<Array<{ url: string; depth: number }>> {
        const links = await page.$$eval(
            'a[href]',
            (anchors, baseUrl) => {
                return anchors
                    .map((a: any) => {
                        try {
                            const href = a.href;
                            // Convert relative to absolute
                            const url = new URL(href, baseUrl);
                            return url.href;
                        } catch {
                            return null;
                        }
                    })
                    .filter(Boolean) as string[];
            },
            currentUrl
        );

        // Filter and deduplicate
        const newLinks = links
            .filter(url => !this.visitedUrls.has(url))
            .filter(url => this.isAllowedDomain(url, config.domainAllowlist))
            .filter(url => !url.endsWith('.pdf') && !url.endsWith('.PDF'))
            .map(url => ({ url, depth: currentDepth + 1 }));

        // Remove duplicates
        const uniqueLinks = Array.from(
            new Map(newLinks.map(l => [l.url, l])).values()
        );

        return uniqueLinks;
    }

    /**
     * Process all downloaded PDFs: extract text + LLM analysis
     */
    private async processPdfs(config: PdfSourceConfig): Promise<void> {
        for (const pdfFile of this.downloadedPdfs) {
            try {
                console.log(`\n📄 Processing: ${pdfFile.fileName}`);

                // Extract text from PDF
                const fileBuffer = await fs.readFile(pdfFile.filePath);
                // Use PDFParse class from pdf-parse to extract text
                const { PDFParse } = pdfParse as any;
                const parser = new PDFParse({ data: fileBuffer } as any);
                const textResult = await parser.getText();
                const text = (textResult && textResult.text) ? textResult.text : '';
                try { await parser.destroy(); } catch { }

                console.log(`   📝 Extracted ${text.length} characters`);

                // Skip if text is too short (likely not a real document)
                if (text.length < 100) {
                    console.log(`   ⚠️  Skipping: text too short`);
                    continue;
                }

                // Calculate hash to avoid reprocessing
                const textHash = crypto.createHash('sha256').update(text).digest('hex');
                // Prepare base extracted document (text-only) so we always store parsing results
                const baseDoc: ExtractedPolicyDocument = {
                    is_relevant: false,
                    reason: 'LLM not run',
                    category: 'other',
                    title: path.basename(pdfFile.fileName),
                    source_url: pdfFile.sourceUrl,
                    issuing_body: 'unknown',
                    published_date: null,
                    effective_date: null,
                    jurisdiction: 'Philippines',
                    summary: '',
                    key_numbers: [],
                    topics: [],
                    file_path: pdfFile.filePath,
                    raw_text_hash: textHash,
                    raw_text_excerpt: text.substring(0, 2000),
                } as any;

                // If OpenAI is configured, run LLM extraction and merge results
                if (this.openai) {
                    const extracted = await this.extractPolicyFromPdf({
                        text,
                        url: pdfFile.sourceUrl,
                        sourceName: config.name,
                    });

                    if (extracted) {
                        this.extractedDocuments.push(extracted);
                        if (extracted.is_relevant) {
                            console.log(`   ✓ RELEVANT: ${extracted.category} - ${extracted.title}`);
                        } else {
                            console.log(`   ⚠️  NOT RELEVANT: ${extracted.reason}`);
                        }
                        continue;
                    }
                }

                // Fallback: store base document when LLM isn't available or failed
                this.extractedDocuments.push(baseDoc);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`   ❌ Processing failed: ${errorMsg}`);
                this.errors.push({
                    url: pdfFile.sourceUrl,
                    error: `PDF processing failed: ${errorMsg}`,
                    timestamp: new Date(),
                });
            }
        }
    }

    /**
     * Extract structured policy data from PDF text using OpenAI
     */
    private async extractPolicyFromPdf(params: {
        text: string;
        url: string;
        sourceName: string;
    }): Promise<ExtractedPolicyDocument | null> {
        if (!this.openai) {
            return null;
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert analyst of Philippine energy and regulatory policy.
You receive the full text of a PDF document from DOE, ERC, or a related Philippine government body.
The document may be a circular, order, resolution, tariff decision, or other regulatory issuance.

Your job:
1. Decide if this document is relevant to energy policy, regulation, tariffs, rate changes, or market rules.
2. If relevant, extract structured information about the issuance.
3. Always include the original source_url so a human can verify the information.

Respond ONLY with a single JSON object with this schema:

{
  "is_relevant": true,
  "reason": "short explanation",
  "category": "circular|order|resolution|tariff_update|rate_change|guideline|other",
  "title": "official title of the document, cleaned",
  "source_url": "https://…",
  "issuing_body": "DOE|ERC|other agency name|unknown",
  "published_date": "YYYY-MM-DD or null",
  "effective_date": "YYYY-MM-DD or null",
  "jurisdiction": "Philippines",
  "summary": "3–5 sentence summary of what the document does and why it matters.",
  "key_numbers": [
    { "name": "generation_rate", "value": 5.32, "unit": "PHP/kWh" },
    { "name": "system_loss_cap", "value": 5.0, "unit": "%" }
  ],
  "topics": ["electric_power", "tariff", "market_rules"]
}

If the document is not relevant, set "is_relevant": false and keep other fields minimal or null.
Do not invent numbers that are not clearly stated.
Do not output anything except the JSON.`,
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            source_name: params.sourceName,
                            source_url: params.url,
                            raw_text: params.text.slice(0, 15000), // Limit to ~15k chars
                        }),
                    },
                ],
                temperature: 0.1,
                max_tokens: 2000,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            // Parse JSON response
            const extracted = JSON.parse(content) as ExtractedPolicyDocument;
            return extracted;
        } catch (error) {
            console.error(`   ❌ LLM extraction failed:`, error);
            return null;
        }
    }

    /**
     * Utility: Sanitize filename
     */
    private sanitizeFileName(name: string): string {
        // Remove/replace invalid characters
        let clean = name
            .replace(/[^a-z0-9._-]/gi, '_')
            .replace(/_+/g, '_')
            .toLowerCase();

        // Ensure .pdf extension
        if (!clean.endsWith('.pdf')) {
            clean += '.pdf';
        }

        // Add timestamp to avoid conflicts
        const timestamp = Date.now();
        const ext = path.extname(clean);
        const base = path.basename(clean, ext);
        return `${base}_${timestamp}${ext}`;
    }

    /**
     * Utility: Format bytes
     */
    private formatBytes(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Utility: Delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
