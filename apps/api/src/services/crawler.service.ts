import { createHash } from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { query, queryOne } from '@csv/db';
import type { Source } from '@csv/types';
import { robotsParser } from './robots.parser';
import * as crawlService from './crawl.service';

/**
 * Crawled Document interface (matches documents table)
 */
interface CrawledDocument {
    id: string;
    source_id: string;
    title: string;
    url: string;
    content: string | null;
    content_hash: string;
    classification: string;
    country: string | null;
    sector: string | null;
    themes: string[] | null;
    extracted_data: Record<string, unknown>;
    confidence: number;
    verified: boolean;
    published_at: Date | null;
    crawled_at: Date;
    created_at: Date;
    updated_at: Date;
}

/**
 * Configuration for LLM API calls
 */
export interface LLMConfig {
    apiKey: string;
    model: string;
    baseUrl?: string;
}

/**
 * LLM Crawler Service
 * Fetches URLs, extracts content via HTML parsing (or optionally LLM), deduplicates, stores documents
 */
export class CrawlerService {
    private config: LLMConfig;
    private sourceRateLimits: Map<string, number> = new Map();
    private rateLimitMs = 1000; // 1 second between requests per source

    constructor(config: LLMConfig) {
        this.config = {
            apiKey: config.apiKey || '',
            model: config.model || 'gpt-4-turbo',
            baseUrl: config.baseUrl || 'https://api.openai.com/v1',
        };

        if (!this.config.apiKey) {
            console.log('[Crawler] No LLM API key provided, using simple HTML extraction');
        }
    }

    /**
     * Compute SHA-256 hash of content
     */
    private computeHash(content: string): string {
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Rate limit: wait if necessary before crawling same source
     */
    private async enforceRateLimit(sourceId: string): Promise<void> {
        const lastCrawlTime = this.sourceRateLimits.get(sourceId) ?? 0;
        const timeSinceLastCrawl = Date.now() - lastCrawlTime;

        if (timeSinceLastCrawl < this.rateLimitMs) {
            const waitTime = this.rateLimitMs - timeSinceLastCrawl;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.sourceRateLimits.set(sourceId, Date.now());
    }

    /**
     * Fetch content from URL using simple HTML parsing (no LLM)
     * Extracts text content from HTML using cheerio
     */
    private async fetchContent(url: string): Promise<{ title: string; content: string }> {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'CSV-Crawler/1.0 (Policy monitoring bot)',
                },
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Remove script and style tags
            $('script, style, nav, header, footer').remove();

            // Extract title
            const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

            // Extract main content - try to find main content areas first
            let content = '';
            const mainSelectors = ['main', 'article', '.content', '#content', '.main', '#main'];
            
            for (const selector of mainSelectors) {
                const mainContent = $(selector).text();
                if (mainContent && mainContent.length > 100) {
                    content = mainContent;
                    break;
                }
            }

            // Fallback: get all body text
            if (!content) {
                content = $('body').text();
            }

            // Clean up whitespace
            content = content.replace(/\s+/g, ' ').trim();

            if (!content || content.length < 50) {
                throw new Error('Insufficient content extracted from page');
            }

            return { title, content };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch ${url}: ${error.message}`);
            }
            throw new Error(`Failed to fetch ${url}: ${(error as Error).message}`);
        }
    }

    /**
     * Send HTML to LLM for content extraction (optional, falls back to simple extraction)
     */
    private async extractContentViaLLM(html: string, url: string): Promise<string> {
        // If no API key configured, skip LLM
        if (!this.config.apiKey) {
            console.log('[Crawler] No LLM API key, using simple extraction');
            const $ = cheerio.load(html);
            $('script, style, nav, header, footer').remove();
            return $('body').text().replace(/\s+/g, ' ').trim();
        }

        const systemPrompt = `You are a regulatory policy content extractor. Extract and summarize the main policy content from the provided HTML, focusing on:
- Policy titles and summaries
- Regulatory updates or changes
- Key dates and deadlines
- Affected sectors or jurisdictions
- Implementation details

Return only the extracted content, without HTML tags or metadata.`;

        const userPrompt = `Extract policy content from this HTML (from ${url}):\n\n${html.substring(0, 10000)}`;

        try {
            const llmResponse = await axios.post(`${this.config.baseUrl}/chat/completions`, {
                model: this.config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 2000,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                timeout: 30000,
            });

            const content = llmResponse.data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from LLM');
            }

            return content;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('[Crawler] LLM API error:', error.response?.data || error.message);
                throw new Error(`LLM extraction failed: ${error.message}`);
            }
            throw new Error(`LLM extraction failed: ${(error as Error).message}`);
        }
    }

    /**
     * Check if content hash already exists (deduplication)
     */
    private async checkDuplicate(contentHash: string): Promise<CrawledDocument | null> {
        return queryOne<CrawledDocument>(
            'SELECT * FROM documents WHERE content_hash = $1',
            [contentHash]
        );
    }

    /**
     * Store crawled document in database
     */
    private async storeCrawledDocument(
        sourceId: string,
        url: string,
        title: string,
        content: string,
        contentHash: string
    ): Promise<CrawledDocument> {
        const doc = await queryOne<CrawledDocument>(
            `INSERT INTO documents (
                source_id, title, url, content, content_hash, 
                classification, crawled_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, 'policy', NOW(), NOW(), NOW())
            RETURNING *`,
            [sourceId, title, url, content, contentHash]
        );

        if (!doc) {
            throw new Error('Failed to store crawled document');
        }

        return doc;
    }

    /**
     * Main crawl method: called for each URL in a source
     */
    async crawlUrl(
        sourceId: string,
        jobId: string,
        url: string
    ): Promise<{
        isNew: boolean;
        document?: CrawledDocument;
    }> {
        try {
            // Check robots.txt
            const allowed = await robotsParser.isUrlAllowed(url);
            if (!allowed) {
                throw new Error('URL disallowed by robots.txt');
            }

            // Rate limit
            await this.enforceRateLimit(sourceId);

            // Fetch content using simple extraction
            const { title, content } = await this.fetchContent(url);
            const contentHash = this.computeHash(content);

            // Check for duplicate
            const duplicate = await this.checkDuplicate(contentHash);
            if (duplicate) {
                console.log(`[Crawler] Duplicate content found for ${url}`);
                return { isNew: false };
            }

            // Store new document
            const document = await this.storeCrawledDocument(sourceId, url, title, content, contentHash);

            return { isNew: true, document };
        } catch (error) {
            console.error(`[Crawler] Error crawling ${url}:`, error);
            throw error;
        }
    }

    /**
     * Crawl a single source: called by job worker
     * Fetches source details, URL, crawls, updates job status
     */
    async crawlSource(sourceId: string, jobId: string): Promise<void> {
        const startTime = new Date();

        try {
            // Get source details
            const source = await queryOne<Source>(
                'SELECT * FROM sources WHERE id = $1',
                [sourceId]
            );

            if (!source) {
                throw new Error('Source not found');
            }

            // Update job: mark as running
            await crawlService.updateCrawlJob(jobId, {
                status: 'running',
                startedAt: startTime,
            });

            // Crawl the URL
            const result = await this.crawlUrl(sourceId, jobId, source.url);

            // Update job: mark as done
            const endTime = new Date();
            await crawlService.updateCrawlJob(jobId, {
                status: 'done',
                completedAt: endTime,
                itemsCrawled: 1, // 1 URL crawled
                itemsNew: result.isNew ? 1 : 0,
            });

            console.log(
                `[Crawler] Crawl complete: source=${sourceId}, job=${jobId}, isNew=${result.isNew}`
            );
        } catch (error) {
            const message = (error as Error).message || 'Unknown error';
            console.error(`[Crawler] Crawl failed: source=${sourceId}, job=${jobId}, error=${message}`);

            // Update job: mark as failed
            await crawlService.updateCrawlJob(jobId, {
                status: 'failed',
                completedAt: new Date(),
                errorMessage: message,
            }).catch(updateError => {
                console.error('[Crawler] Failed to update job status:', updateError);
            });

            throw error;
        }
    }
}

/**
 * Create crawler instance with environment config
 */
export function createCrawler(): CrawlerService {
    return new CrawlerService({
        apiKey: process.env.LLM_API_KEY || '',
        model: process.env.LLM_MODEL || 'gpt-4-turbo',
        baseUrl: process.env.LLM_BASE_URL,
    });
}
