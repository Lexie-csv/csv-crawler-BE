import * as cheerio from 'cheerio';
import axios, { AxiosError } from 'axios';
import { URL } from 'url';
import PQueue from 'p-queue';
import crypto from 'crypto';
import { query, queryOne } from '@csv/db';
import { SourceCrawlConfig } from '@csv/types';
import { robotsParser } from './robots.parser';

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
    private stats: CrawlStats = {
        pagesCrawled: 0,
        pagesNew: 0,
        pagesFailed: 0,
        pagesSkipped: 0,
    };
    private userAgent = 'CSV-Crawler/2.0 (Policy & Data Monitoring Bot; +https://csv-crawler.com)';
    private baseDomain: string;

    constructor(config: SourceCrawlConfig) {
        this.config = {
            baseUrl: config.baseUrl,
            maxDepth: config.maxDepth ?? 3, // Increased from 2 to 3 for deeper crawling
            maxPages: config.maxPages ?? 100, // Increased from 50 to 100 for more comprehensive crawling
            concurrency: config.concurrency ?? 3,
            allowedPathPatterns: config.allowedPathPatterns ?? [], // Empty by default = crawl entire site
            blockedPathPatterns: config.blockedPathPatterns ?? [
                '/wp-admin/',
                '/wp-content/uploads/', // Still block admin and uploads
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
    }

    /**
     * Main entry point: crawl a source with multi-page support
     */
    async crawlSource(sourceId: string, crawlJobId: string): Promise<CrawlStats> {
        console.log(`[MultiPageCrawler] Starting crawl for source ${sourceId}, job ${crawlJobId}`);
        console.log(`[MultiPageCrawler] Config:`, this.config);

        try {
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

            // Update final job status
            await this.updateJobStatus(crawlJobId, 'done', this.stats);

            console.log(`[MultiPageCrawler] Completed. Stats:`, this.stats);
            return this.stats;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[MultiPageCrawler] Fatal error:`, errorMsg);
            
            await this.updateJobStatus(crawlJobId, 'failed', this.stats, errorMsg);
            throw error;
        }
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
            if (depth < this.config.maxDepth) {
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
     * Fetch and parse a single page
     */
    private async fetchPage(url: string): Promise<CrawlResult> {
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
        await query(
            `INSERT INTO documents (
                source_id, crawl_job_id, url, title, content, content_hash,
                classification, extracted, crawled_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
            ON CONFLICT (content_hash) DO NOTHING`,
            [
                sourceId,
                crawlJobId,
                result.url,
                result.title,
                result.content,
                result.contentHash,
                'unknown', // Will be classified by LLM
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
export function createMultiPageCrawler(config: SourceCrawlConfig): MultiPageCrawlerService {
    return new MultiPageCrawlerService(config);
}
