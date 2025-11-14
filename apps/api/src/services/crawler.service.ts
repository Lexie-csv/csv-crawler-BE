import { createHash } from 'crypto';
import fetch from 'node-fetch';
import { query, queryOne } from '@csv/db';
import { Source, CrawledDocument } from '@csv/types';
import { robotsParser } from './robots.parser';
import * as crawlService from './crawl.service';

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
 * Fetches URLs, extracts content via LLM, deduplicates, stores documents
 */
export class CrawlerService {
    private config: LLMConfig;
    private sourceRateLimits: Map<string, number> = new Map();
    private rateLimitMs = 1000; // 1 second between requests per source

    constructor(config: LLMConfig) {
        if (!config.apiKey) {
            throw new Error('LLM_API_KEY environment variable is required');
        }
        this.config = {
            apiKey: config.apiKey,
            model: config.model || 'gpt-4-turbo',
            baseUrl: config.baseUrl || 'https://api.openai.com/v1',
        };
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
     * Fetch content from URL using LLM
     */
    private async fetchContentViaLLM(url: string): Promise<string> {
        try {
            // First, fetch the HTML
            const response = await Promise.race([
                fetch(url),
                new Promise<Response>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 10000)
                ),
            ]);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await (response as any).text();

            // Call LLM to extract content
            return await this.extractContentViaLLM(html, url);
        } catch (error) {
            throw new Error(`Failed to fetch ${url}: ${(error as Error).message}`);
        }
    }

    /**
     * Send HTML to LLM for content extraction
     */
    private async extractContentViaLLM(html: string, url: string): Promise<string> {
        const systemPrompt = `You are a regulatory policy content extractor. Extract and summarize the main policy content from the provided HTML, focusing on:
- Policy titles and summaries
- Regulatory updates or changes
- Key dates and deadlines
- Affected sectors or jurisdictions
- Implementation details

Return only the extracted content, without HTML tags or metadata.`;

        const userPrompt = `Extract policy content from this HTML (from ${url}):\n\n${html.substring(0, 10000)}`;

        try {
            const llmResponse = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 2000,
                }),
            });

            if (!llmResponse.ok) {
                const error = await (llmResponse as any).json();
                throw new Error(`LLM API error: ${error.error?.message || 'Unknown error'}`);
            }

            const data = (await (llmResponse as any).json()) as any;
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from LLM');
            }

            return content;
        } catch (error) {
            throw new Error(`LLM extraction failed: ${(error as Error).message}`);
        }
    }

    /**
     * Check if content hash already exists (deduplication)
     */
    private async checkDuplicate(contentHash: string): Promise<CrawledDocument | null> {
        return queryOne<CrawledDocument>(
            'SELECT * FROM crawled_documents WHERE content_hash = $1',
            [contentHash]
        );
    }

    /**
     * Store crawled document in database
     */
    private async storeCrawledDocument(
        sourceId: string,
        url: string,
        content: string,
        contentHash: string
    ): Promise<CrawledDocument> {
        const doc = await queryOne<CrawledDocument>(
            `INSERT INTO crawled_documents (source_id, url, content, content_hash, extracted_at, created_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, source_id, url, content, content_hash, extracted_at, created_at`,
            [sourceId, url, content, contentHash]
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

            // Fetch content via LLM
            const content = await this.fetchContentViaLLM(url);
            const contentHash = this.computeHash(content);

            // Check for duplicate
            const duplicate = await this.checkDuplicate(contentHash);
            if (duplicate) {
                return { isNew: false };
            }

            // Store new document
            const document = await this.storeCrawledDocument(sourceId, url, content, contentHash);

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
