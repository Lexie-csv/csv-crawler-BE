import * as cheerio from 'cheerio';
import axios, { AxiosError } from 'axios';
import { URL } from 'url';
import PQueue from 'p-queue';
import crypto from 'crypto';
import { query, queryOne } from '@csv/db';
import { SourceCrawlConfig, CrawlerConfig } from '@csv/types';
import { robotsParser } from './robots.parser';
import { chromium, Browser, Page } from 'playwright';

interface CrawlPage {
    url: string;
    depth: number;
    sourceUrl?: string; // The page that linked to this URL
}

interface CrawlResult {
    url: string;
    title: string;
    content: string;
    contentHash: string;
    links: string[];
    isNew: boolean;
    error?: string;
}

interface CrawlStats {
    pagesCrawled: number;
    pagesNew: number;
    pagesFailed: number;
    pagesSkipped: number;
}

export class MultiPageCrawlerService {
    private queue: PQueue;
    private visited: Set<string> = new Set();
    private pending: Map<string, CrawlPage> = new Map();
    private config: Required<SourceCrawlConfig>;
    private sourceConfig: CrawlerConfig | null = null; // Per-source config overrides
    private stats: CrawlStats = {
        pagesCrawled: 0,
        pagesNew: 0,
        pagesFailed: 0,
        pagesSkipped: 0,
    };
    private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    private baseDomain: string;
    private browser: Browser | null = null;
    private usePlaywright: boolean = false; // Enable for Cloudflare-protected sites

    constructor(config: SourceCrawlConfig, sourceConfig?: CrawlerConfig | null) {
        // Store source-specific config
        this.sourceConfig = sourceConfig || null;

        // Apply source config overrides if present, otherwise use defaults
        const maxDepth = sourceConfig?.maxDepth ?? config.maxDepth ?? 2; // Default to 2 for DOE
        const maxPages = sourceConfig?.maxPages ?? config.maxPages ?? 50; // Default to 50 for DOE

        this.config = {
            baseUrl: config.baseUrl,
            maxDepth,
            maxPages,
            concurrency: sourceConfig?.concurrency ?? config.concurrency ?? 3,
            allowedPathPatterns: sourceConfig?.allowedPathPatterns ?? config.allowedPathPatterns ?? [],
            blockedPathPatterns: sourceConfig?.blockedPathPatterns ?? config.blockedPathPatterns ?? [
                '/wp-admin/',
                '/wp-content/uploads/',
                '/wp-includes/',
                '/feed/',
                '/rss/',
                '/print/',
                '/share/',
                '\\.pdf$',
                '\\.xlsx?$',
                '\\.docx?$',
                '\\.pptx?$',
                '\\.zip$',
                '\\.rar$',
                '\\.jpg$',
                '\\.jpeg$',
                '\\.png$',
                '\\.gif$',
                '\\.mp4$',
                '\\.mp3$',
            ],
            paginationSelectors: config.paginationSelectors ?? [
                'a[rel="next"]',
                'a.next',
                'a.pagination-next',
                'a:contains("Next")',
                'a:contains("›")',
                'a:contains("»")',
                'a[href*="page="]',
                'a[href*="/page/"]',
            ],
            followExternalLinks: config.followExternalLinks ?? false,
        };

        this.queue = new PQueue({ concurrency: this.config.concurrency });
        this.baseDomain = new URL(this.config.baseUrl).hostname;

        console.log(`[MultiPageCrawler] Initialized with maxDepth=${this.config.maxDepth}, maxPages=${this.config.maxPages}`);
        if (this.sourceConfig) {
            console.log(`[MultiPageCrawler] Using source-specific config:`, this.sourceConfig);
        }
    }

    /**
     * Main entry point: crawl a source with multi-page support
     */
    async crawlSource(sourceId: string, crawlJobId: string): Promise<CrawlStats> {
        console.log(`[MultiPageCrawler] Starting crawl for source ${sourceId}, job ${crawlJobId}`);
        console.log(`[MultiPageCrawler] Config:`, this.config);

        try {
            // Try initial fetch - if it fails with Cloudflare, enable Playwright
            try {
                const testResponse = await axios.get(this.config.baseUrl, {
                    headers: { 'User-Agent': this.userAgent },
                    timeout: 10000,
                    maxRedirects: 5,
                });

                // Check if we got Cloudflare challenge
                if (testResponse.data.includes('Just a moment') || testResponse.data.includes('__cf_chl')) {
                    console.log(`[MultiPageCrawler] Cloudflare detected, enabling Playwright mode`);
                    this.usePlaywright = true;
                    await this.initBrowser();
                }
            } catch (error) {
                console.log(`[MultiPageCrawler] Initial test failed, enabling Playwright mode`);
                this.usePlaywright = true;
                await this.initBrowser();
            }

            // Initialize queue with base URL
            this.addToPending({ url: this.config.baseUrl, depth: 0 });

            // Update job status to running
            await this.updateJobStatus(crawlJobId, 'running');

            // Process queue until empty or limits reached
            while (this.pending.size > 0 && this.stats.pagesCrawled < this.config.maxPages) {
                const batch = Array.from(this.pending.values()).slice(0, this.config.concurrency);
                this.pending.clear();

                await Promise.all(
                    batch.map(page =>
                        this.queue.add(() =>
                            this.crawlPage(page, sourceId, crawlJobId)
                        )
                    )
                );
            }

            // Wait for queue to finish
            await this.queue.onIdle();

            // Clean up browser
            if (this.browser) {
                await this.browser.close();
            }

            // Update final job status
            await this.updateJobStatus(crawlJobId, 'done', this.stats);

            console.log(`[MultiPageCrawler] Completed. Stats:`, this.stats);
            return this.stats;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[MultiPageCrawler] Fatal error:`, errorMsg);

            // Clean up browser on error
            if (this.browser) {
                await this.browser.close().catch(() => { });
            }

            await this.updateJobStatus(crawlJobId, 'failed', this.stats, errorMsg);
            throw error;
        }
    }

    /**
     * Initialize Playwright browser for Cloudflare bypass
     */
    private async initBrowser(): Promise<void> {
        this.browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
            ],
        });
    }

    /**
     * Crawl a single page
     */
    private async crawlPage(
        page: CrawlPage,
        sourceId: string,
        crawlJobId: string
    ): Promise<void> {
        const { url, depth } = page;

        // Skip if already visited
        if (this.visited.has(url)) {
            this.stats.pagesSkipped++;
            return;
        }

        this.visited.add(url);

        // Check robots.txt
        const allowed = await robotsParser.isUrlAllowed(url, this.userAgent);
        if (!allowed) {
            console.log(`[MultiPageCrawler] Skipping ${url} - blocked by robots.txt`);
            this.stats.pagesSkipped++;
            return;
        }

        try {
            console.log(`[MultiPageCrawler] Crawling ${url} (depth: ${depth})`);

            // Fetch page
            const result = await this.fetchPage(url);
            this.stats.pagesCrawled++;

            // Parse HTML to check if it's an article page
            const $ = cheerio.load(result.content);
            const isArticle = this.isArticlePage(url, $);

            if (!isArticle && depth < this.config.maxDepth) {
                console.log(`[MultiPageCrawler] ⊘ Skipping ${url} - not an article page (likely category/listing)`);
                // Don't save, but still extract links to find actual articles
                const newLinks = this.extractLinks(url, result.links, depth);
                console.log(`[MultiPageCrawler] Found ${newLinks.length} new links at depth ${depth}`);

                for (const link of newLinks) {
                    this.addToPending({ url: link, depth: depth + 1, sourceUrl: url });
                }
                return;
            }

            // This is an article page - save it
            console.log(`[MultiPageCrawler] ✓ Article page detected: ${url}`);

            // Check for duplicate content
            const existing = await queryOne<{ id: string }>(
                'SELECT id FROM documents WHERE content_hash = $1',
                [result.contentHash]
            );

            if (existing) {
                console.log(`[MultiPageCrawler] Duplicate content detected for ${url}`);
                // Still save the URL but mark as duplicate
                await this.saveDocument(sourceId, crawlJobId, result, false);
            } else {
                // Save new document
                await this.saveDocument(sourceId, crawlJobId, result, true);
                this.stats.pagesNew++;
            }

            // Extract and queue links if not at max depth
            // Exception: Always extract links from non-article pages (category/listing pages)
            // to find actual articles, even at max depth
            const shouldExtractLinks = depth < this.config.maxDepth || !isArticle;

            if (shouldExtractLinks) {
                const newLinks = this.extractLinks(url, result.links, depth);
                console.log(`[MultiPageCrawler] Found ${newLinks.length} new links at depth ${depth}`);

                for (const link of newLinks) {
                    this.addToPending({ url: link, depth: depth + 1, sourceUrl: url });
                }
            }

        } catch (error) {
            this.stats.pagesFailed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[MultiPageCrawler] Failed to crawl ${url}:`, errorMsg);
        }

        // Polite delay
        await this.sleep(1000);
    }

    /**
     * Fetch and parse a single page with Playwright (for Cloudflare-protected sites)
     */
    private async fetchPageWithPlaywright(url: string): Promise<CrawlResult> {
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }

        const page = await this.browser.newPage({
            userAgent: this.userAgent,
        });

        try {
            console.log(`[MultiPageCrawler] Fetching with Playwright: ${url}`);

            // Navigate with extended timeout for Cloudflare challenge
            await page.goto(url, {
                timeout: 60000,
                waitUntil: 'networkidle',
            });

            // Wait for Cloudflare challenge to complete
            await page.waitForTimeout(8000);

            // Check if we're still on Cloudflare challenge
            const title = await page.title();
            if (title.includes('Just a moment')) {
                console.log(`[MultiPageCrawler] Still on Cloudflare, waiting longer...`);
                await page.waitForTimeout(15000);
            }

            // Get the page content
            const html = await page.content();
            const $ = cheerio.load(html);

            // Remove noise
            $('script, style, nav, header, footer, .navigation, .menu, #sidebar').remove();

            // Extract title
            const pageTitle = await page.title() ||
                $('h1').first().text().trim() ||
                'Untitled';

            // Extract content
            let content = '';
            const contentSelectors = [
                'main',
                'article',
                '[role="main"]',
                '.content',
                '.main-content',
                '#content',
                '#main',
                'body'
            ];

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    const text = element.text()
                        .replace(/\s+/g, ' ')
                        .replace(/\n+/g, '\n')
                        .trim();

                    if (text && text.length > 200) {
                        content = text;
                        break;
                    }
                }
            }

            // Fallback to paragraph extraction
            if (!content || content.length < 200) {
                const paragraphs: string[] = [];
                $('p, li, td, h1, h2, h3, h4, h5, h6').each((_, elem) => {
                    const text = $(elem).text().trim();
                    if (text && text.length > 20) {
                        paragraphs.push(text);
                    }
                });

                if (paragraphs.length > 0) {
                    content = paragraphs.join('\n');
                }
            }

            // Minimal content warning
            if (!content || content.length < 50) {
                console.warn(`[MultiPageCrawler] ⚠️ Minimal content extracted from ${url}`);
                content = `[Minimal content] ${pageTitle}\n${content}`;
            }

            content = content.replace(/\s+/g, ' ').trim();

            // Truncate if needed
            const MAX_CONTENT_LENGTH = 50000;
            if (content.length > MAX_CONTENT_LENGTH) {
                content = content.substring(0, MAX_CONTENT_LENGTH) + '\n...[truncated]';
            }

            // Extract links
            const links = await page.$$eval('a[href]', (anchors) =>
                anchors.map((a: any) => a.href)
            );

            // Generate content hash
            const contentHash = crypto
                .createHash('sha256')
                .update(content)
                .digest('hex');

            await page.close();

            return {
                url: page.url(),
                title: pageTitle,
                content,
                contentHash,
                links,
                isNew: true,
            };
        } catch (error) {
            await page.close();
            throw error;
        }
    }

    /**
     * Fetch and parse a single page
     */
    private async fetchPage(url: string): Promise<CrawlResult> {
        if (this.usePlaywright && this.browser) {
            return this.fetchPageWithPlaywright(url);
        }

        const response = await axios.get(url, {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml',
            },
            timeout: 30000,
            maxRedirects: 5,
        });

        const $ = cheerio.load(response.data);

        // Remove script, style, and nav elements that add noise
        $('script, style, nav, header, footer, .navigation, .menu, #sidebar').remove();

        // Extract title
        const title = $('title').text().trim() ||
            $('h1').first().text().trim() ||
            'Untitled';

        // Extract main content with improved selectors for SharePoint/modern sites
        let content = '';
        const contentSelectors = [
            '[id*="content"]',           // SharePoint content zones
            '[class*="content"]',
            'article',
            'main',
            '.post-content',
            '.entry-content',
            '.page-content',
            '[role="main"]',
            '.ms-rtestate-field',        // SharePoint rich text editor
            '#contentBox',               // Common SharePoint container
            'body'
        ];

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                // Get text, removing extra whitespace
                const text = element.text()
                    .replace(/\s+/g, ' ')
                    .replace(/\n+/g, '\n')
                    .trim();

                if (text && text.length > 200) { // Increased threshold from 100
                    content = text;
                    console.log(`[MultiPageCrawler] Extracted ${text.length} chars using selector: ${selector}`);
                    break;
                }
            }
        }

        // Fallback: if still no content, try extracting all paragraph text
        if (!content || content.length < 200) {
            const paragraphs: string[] = [];
            $('p, li, td, h1, h2, h3, h4, h5, h6').each((_, elem) => {
                const text = $(elem).text().trim();
                if (text && text.length > 20) {
                    paragraphs.push(text);
                }
            });

            if (paragraphs.length > 0) {
                content = paragraphs.join('\n');
                console.log(`[MultiPageCrawler] Extracted ${content.length} chars from ${paragraphs.length} elements`);
            }
        }

        // If STILL no content, log warning but continue
        if (!content || content.length < 50) {
            console.warn(`[MultiPageCrawler] ⚠️ Minimal content extracted from ${url} (${content.length} chars)`);
            content = `[Minimal content] ${title}\n${content}`;
        }

        // Clean whitespace
        content = content.replace(/\s+/g, ' ').trim();

        // Truncate very long content (to avoid token limits)
        const MAX_CONTENT_LENGTH = 50000; // ~12k tokens
        if (content.length > MAX_CONTENT_LENGTH) {
            content = content.substring(0, MAX_CONTENT_LENGTH) + '\n...[truncated]';
            console.log(`[MultiPageCrawler] Content truncated to ${MAX_CONTENT_LENGTH} chars`);
        }

        // Extract all links
        const links: string[] = [];
        $('a[href]').each((_, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                links.push(href);
            }
        });

        // Generate content hash
        const contentHash = crypto
            .createHash('sha256')
            .update(content)
            .digest('hex');

        return {
            url: response.request.res.responseUrl || url,
            title,
            content,
            contentHash,
            links,
            isNew: true,
        };
    }

    /**
     * Check if URL is likely an article page (not a category/archive/listing page)
     * Only applies if skipCategoryPages is enabled in source config
     */
    private isArticlePage(url: string, $: cheerio.CheerioAPI): boolean {
        // If source config doesn't want category page skipping, accept all pages
        if (!this.sourceConfig?.skipCategoryPages) {
            return true;
        }

        try {
            const urlPath = new URL(url).pathname;

            // Check source-specific blocked patterns first (e.g., /markets/, /stock-quotes/)
            const blockedPatterns = this.sourceConfig?.blockedPathPatterns ?? [];
            for (const pattern of blockedPatterns) {
                if (urlPath.includes(pattern)) {
                    return false;
                }
            }

            // Check URL patterns that indicate category/archive pages
            const categoryPatterns = [
                '/category/',
                '/tag/',
                '/author/',
                '/page/',
                '/archives/',
                '-archives',
                '/index',
            ];

            for (const pattern of categoryPatterns) {
                if (urlPath.includes(pattern)) {
                    return false;
                }
            }

            // Articles typically have date-based URLs or longer paths
            // e.g., /2025/12/article-title/ or /economy/article-title/
            const pathSegments = urlPath.split('/').filter(s => s.length > 0);

            // Homepage or single-segment paths are usually not articles
            if (pathSegments.length < 2) {
                return false;
            }

            // Reject pages that are just category landing pages (exactly 1 segment)
            // Real articles have category + slug: /economy/power-sector-update/
            if (pathSegments.length === 1) {
                return false;
            }

            // Check for content length - articles should have substantial text
            const bodyText = $('body').text().trim();
            const contentLength = bodyText.length;

            // Articles should have at least 500 characters of content
            if (contentLength < 500) {
                return false;
            }

            // Use custom article indicators if provided
            const indicators = this.sourceConfig?.articleIndicators ?? [
                'article',
                '[class*="post"]',
                '.entry-content',
                '.post-content',
                '.article-content',
                '[class*="author"]',
                '.byline',
                'time',
                '[class*="date"]',
                '[class*="published"]',
            ];

            let articleScore = 0;
            for (const indicator of indicators) {
                const elements = $(indicator);
                if (elements.length > 0) {
                    articleScore++;

                    // Bonus points for indicators with substantial content
                    if (indicator.includes('content') || indicator === 'article') {
                        const elementText = elements.first().text().trim();
                        if (elementText.length > 200) {
                            articleScore += 2; // Extra weight for content-rich elements
                        }
                    }
                }
            }

            // Check for article-specific metadata
            const hasArticleSchema = $('script[type="application/ld+json"]').text().includes('"@type":"Article"');
            if (hasArticleSchema) {
                articleScore += 3; // Strong indicator
            }

            // Check for Open Graph article tags
            const ogType = $('meta[property="og:type"]').attr('content');
            if (ogType === 'article') {
                articleScore += 2;
            }

            // Need at least 3 points to be considered an article
            // This reduces false positives from data pages
            return articleScore >= 3;

        } catch (error) {
            return false;
        }
    }

    /**
     * Extract and filter links from a page
     */
    private extractLinks(baseUrl: string, links: string[], currentDepth: number): string[] {
        const baseUrlObj = new URL(baseUrl);
        const validLinks: string[] = [];

        for (const link of links) {
            try {
                // Resolve relative URLs
                const absoluteUrl = new URL(link, baseUrl).href;
                const linkUrl = new URL(absoluteUrl);

                // Skip if already visited or pending
                if (this.visited.has(absoluteUrl) || this.pending.has(absoluteUrl)) {
                    continue;
                }

                // Check domain restrictions
                if (!this.config.followExternalLinks && linkUrl.hostname !== this.baseDomain) {
                    continue;
                }

                // Skip anchors and javascript
                if (linkUrl.hash || linkUrl.protocol === 'javascript:' || linkUrl.protocol === 'mailto:') {
                    continue;
                }

                // Check blocked patterns
                if (this.config.blockedPathPatterns.some(pattern =>
                    new RegExp(pattern, 'i').test(absoluteUrl)
                )) {
                    continue;
                }

                // Check allowed patterns (if any specified)
                if (this.config.allowedPathPatterns.length > 0) {
                    const isAllowed = this.config.allowedPathPatterns.some(pattern =>
                        new RegExp(pattern, 'i').test(absoluteUrl)
                    );
                    if (!isAllowed) continue;
                }

                validLinks.push(absoluteUrl);

            } catch (error) {
                // Invalid URL, skip
                continue;
            }
        }

        return validLinks;
    }

    /**
     * Add URL to pending queue
     */
    private addToPending(page: CrawlPage): void {
        if (!this.visited.has(page.url) && !this.pending.has(page.url)) {
            this.pending.set(page.url, page);
        }
    }

    /**
     * Save document to database
     */
    private async saveDocument(
        sourceId: string,
        crawlJobId: string,
        result: CrawlResult,
        isNew: boolean
    ): Promise<void> {
        // Determine if this is an alert based on source type
        const sourceResult = await query<{ type: string }>(
            'SELECT type FROM sources WHERE id = $1',
            [sourceId]
        );
        
        const isAlert = sourceResult.length > 0 && sourceResult[0].type === 'policy';
        
        await query(
            `INSERT INTO documents (
                source_id, crawl_job_id, url, title, content, content_hash,
                classification, is_alert, extracted, crawled_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
            ON CONFLICT (content_hash) DO NOTHING`,
            [
                sourceId,
                crawlJobId,
                result.url,
                result.title,
                result.content,
                result.contentHash,
                'unknown', // Will be classified by LLM
                isAlert,   // TRUE for policy sources, FALSE for news
                false,     // Not yet extracted
            ]
        );
    }

    /**
     * Update crawl job status and metrics
     */
    private async updateJobStatus(
        jobId: string,
        status: 'pending' | 'running' | 'done' | 'failed',
        stats?: CrawlStats,
        errorMessage?: string
    ): Promise<void> {
        const fields: string[] = ['status = $1'];
        const params: any[] = [status];
        let paramIndex = 2;

        if (status === 'running') {
            fields.push(`started_at = NOW()`);
        }

        if (status === 'done' || status === 'failed') {
            fields.push(`completed_at = NOW()`);
        }

        if (stats) {
            fields.push(`pages_crawled = $${paramIndex++}`);
            params.push(stats.pagesCrawled);

            fields.push(`pages_new = $${paramIndex++}`);
            params.push(stats.pagesNew);

            fields.push(`pages_failed = $${paramIndex++}`);
            params.push(stats.pagesFailed);

            fields.push(`pages_skipped = $${paramIndex++}`);
            params.push(stats.pagesSkipped);

            // Also update legacy fields for compatibility
            fields.push(`items_crawled = $${paramIndex++}`);
            params.push(stats.pagesCrawled);

            fields.push(`items_new = $${paramIndex++}`);
            params.push(stats.pagesNew);
        }

        if (errorMessage) {
            fields.push(`error_message = $${paramIndex++}`);
            params.push(errorMessage);
        }

        fields.push(`updated_at = NOW()`);
        params.push(jobId);

        await query(
            `UPDATE crawl_jobs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
            params
        );
    }

    /**
     * Sleep for a given duration (polite crawling)
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Factory function to create a multi-page crawler
 */
export function createMultiPageCrawler(
    config: SourceCrawlConfig,
    sourceConfig?: CrawlerConfig | null
): MultiPageCrawlerService {
    return new MultiPageCrawlerService(config, sourceConfig);
}
