/**
 * Policy & Market Scanner Service
 * 
 * Tracks policy moves + market signals (circulars, rate changes, guidelines, policy advisories, energy-related news).
 * Core questions: "Is there a new/revised rule or signal?", "What does it change?", "From when?", "Who is impacted?"
 * 
 * Features:
 * - Headless browser support for JS-rendered content
 * - Improved relevance filtering with domain-specific LLM prompts
 * - Executive digest generation
 * - Multi-format output (CSV, JSON, DB)
 */

import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import OpenAI from 'openai';

export interface ScanResult {
    url: string;
    title: string;
    content: string;
    extractedText: string;
    contentHash: string;
    isRelevant: boolean;
    relevanceScore: number;
    relevanceReason: string;
    signals: PolicySignal[];
    metadata: {
        scrapedAt: Date;
        method: 'headless' | 'fetch';
        hasJavaScript: boolean;
        contentLength: number;
    };
}

export interface PolicySignal {
    type: 'circular' | 'rate_change' | 'guideline' | 'advisory' | 'regulatory_timeline' | 'energy_policy' | 'other';
    title: string;
    description: string;
    effectiveDate?: Date;
    impactedParties?: string[];
    changeDescription?: string;
    confidence: number;
}

export interface ScannerOptions {
    useHeadless?: boolean; // Force headless browser
    timeout?: number; // Page load timeout in ms
    waitForSelectors?: string[]; // Wait for specific elements
    llmModel?: string;
}

export class PolicyScanner {
    private browser: Browser | null = null;
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
    }

    /**
     * Initialize browser for headless crawling with stealth mode
     */
    async initBrowser(): Promise<void> {
        if (!this.browser) {
            this.browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
            });
        }
    }

    /**
     * Close browser instance
     */
    async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Scan a URL for policy & market signals
     */
    async scan(url: string, options: ScannerOptions = {}): Promise<ScanResult> {
        const {
            useHeadless = this.shouldUseHeadless(url),
            timeout = 30000,
            waitForSelectors = [],
        } = options;

        let content: string;
        let title: string;
        let method: 'headless' | 'fetch';
        let hasJavaScript = false;

        try {
            if (useHeadless) {
                ({ content, title, hasJavaScript } = await this.fetchWithHeadless(url, timeout, waitForSelectors));
                method = 'headless';
            } else {
                ({ content, title } = await this.fetchWithHttp(url));
                method = 'fetch';
            }

            // Extract clean text
            const extractedText = this.extractText(content);

            // Generate content hash
            const contentHash = this.hashContent(extractedText);

            // Check relevance with improved LLM prompt
            const { isRelevant, score, reason } = await this.checkRelevance(url, title, extractedText);

            // Extract policy signals
            const signals = await this.extractSignals(title, extractedText);

            return {
                url,
                title,
                content,
                extractedText,
                contentHash,
                isRelevant,
                relevanceScore: score,
                relevanceReason: reason,
                signals,
                metadata: {
                    scrapedAt: new Date(),
                    method,
                    hasJavaScript,
                    contentLength: extractedText.length,
                },
            };
        } catch (error) {
            console.error(`[PolicyScanner] Error scanning ${url}:`, error);
            throw error;
        }
    }

    /**
     * Determine if URL should use headless browser
     */
    private shouldUseHeadless(url: string): boolean {
        // Use headless for known JS-heavy sites
        const jsHeavyDomains = [
            'wesm.ph',          // WESM has dynamic tables
            'sec.gov.ph',       // SEC has JS widgets
            'doe.gov.ph',       // DOE has accordions
            'bsp.gov.ph',       // BSP has dynamic content
            'bir.gov.ph',       // BIR has JS-rendered tables
            'pemc.com.ph',      // PEMC market data
        ];

        return jsHeavyDomains.some(domain => url.includes(domain));
    }

    /**
     * Fetch page using headless browser (handles JS-rendered content)
     */
    private async fetchWithHeadless(
        url: string,
        timeout: number,
        waitForSelectors: string[]
    ): Promise<{ content: string; title: string; hasJavaScript: boolean }> {
        await this.initBrowser();

        const page: Page = await this.browser!.newPage();

        try {
            // Set realistic viewport
            await page.setViewportSize({ width: 1920, height: 1080 });

            // Set realistic user agent
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
            });

            // Mask automation indicators
            await page.addInitScript(() => {
                // @ts-ignore - runs in browser context
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                // @ts-ignore - runs in browser context
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                // @ts-ignore - runs in browser context
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            });

            // Navigate and wait for network idle
            const response = await page.goto(url, {
                waitUntil: 'networkidle',
                timeout,
            });

            // Check if page returned error status
            if (response && !response.ok()) {
                const status = response.status();
                let title = `Error ${status}`;

                if (status === 404) {
                    title = 'Page not found';
                } else if (status === 403) {
                    title = 'Access forbidden';
                } else if (status === 500) {
                    title = 'Server error';
                } else if (status >= 400) {
                    title = `HTTP Error ${status}`;
                }

                // Return error page info instead of throwing
                const content = await page.content();
                return { content, title, hasJavaScript: false };
            }

            // Wait for specific selectors if provided
            for (const selector of waitForSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                } catch (err) {
                    console.warn(`[PolicyScanner] Selector ${selector} not found on ${url}`);
                }
            }

            // Additional wait for dynamic content
            await page.waitForTimeout(2000);

            // Get page content and title
            const content = await page.content();
            const title = await page.title();

            // Check if page has JavaScript by counting script tags
            const hasJavaScript = await page.$$eval('script', (scripts) => scripts.length > 0);

            return { content, title, hasJavaScript };
        } catch (error) {
            console.error(`[PolicyScanner] Headless fetch error for ${url}:`, error);
            // Return error info instead of throwing
            return {
                content: '',
                title: `Error: ${(error as Error).message}`,
                hasJavaScript: false
            };
        } finally {
            await page.close();
        }
    }

    /**
     * Fetch page using simple HTTP (for static sites)
     */
    private async fetchWithHttp(url: string): Promise<{ content: string; title: string }> {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'CSV-PolicyScanner/1.0 (Policy Research Bot)',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();

        // Extract title from HTML
        const $ = cheerio.load(content);
        const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

        return { content, title };
    }

    /**
     * Extract clean text from HTML
     */
    private extractText(html: string): string {
        const $ = cheerio.load(html);

        // Remove script, style, nav, footer
        $('script, style, nav, footer, header, .menu, .sidebar').remove();

        // Get text from main content areas
        const mainSelectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '#content',
            '#main',
            'body',
        ];

        let text = '';
        for (const selector of mainSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                text = element.text();
                break;
            }
        }

        // Clean up whitespace
        return text
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 50000); // Limit to 50k chars
    }

    /**
     * Generate SHA-256 hash of content
     */
    private hashContent(content: string): string {
        return createHash('sha256').update(content, 'utf8').digest('hex');
    }

    /**
     * Check if content is relevant using improved LLM prompt
     */
    private async checkRelevance(
        url: string,
        title: string,
        content: string
    ): Promise<{ isRelevant: boolean; score: number; reason: string }> {
        if (!this.openai) {
            // Fallback: basic keyword matching
            return this.checkRelevanceWithKeywords(url, title, content);
        }

        try {
            const prompt = this.buildRelevancePrompt(url, title, content);

            const response = await this.openai.chat.completions.create({
                model: process.env.LLM_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert analyst specializing in Philippine and Southeast Asian policy, regulatory, and market intelligence. Your job is to identify content that contains actionable policy changes, regulatory updates, or market signals.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.1,
                max_tokens: 300,
            });

            const result = response.choices[0]?.message?.content || '';

            // Parse response
            const scoreMatch = result.match(/SCORE:\s*(\d+)/i);
            const reasonMatch = result.match(/REASON:\s*(.+?)(?:\n|$)/is);

            const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
            const reason = reasonMatch ? reasonMatch[1].trim() : 'Unable to determine relevance';
            const isRelevant = score >= 70;

            return { isRelevant, score, reason };
        } catch (error) {
            console.error('[PolicyScanner] LLM relevance check failed:', error);
            return this.checkRelevanceWithKeywords(url, title, content);
        }
    }

    /**
     * Build improved relevance prompt
     */
    private buildRelevancePrompt(url: string, title: string, content: string): string {
        const contentSample = content.substring(0, 3000);

        return `Analyze this web page for policy/regulatory/market signal relevance.

URL: ${url}
TITLE: ${title}

CONTENT SAMPLE:
${contentSample}

EVALUATION CRITERIA:
1. Is this a NEW or REVISED policy, regulation, circular, or guideline? (HIGH relevance)
2. Does it contain rate changes (interest rates, FIT rates, WESM prices, tax rates, FX rates)? (HIGH relevance)
3. Is it a regulatory advisory or timeline announcement? (MEDIUM relevance)
4. Is it energy policy news (solar, wind, power generation, grid)? (MEDIUM relevance)
5. Is it just a navigation page, homepage, or general information? (LOW relevance)
6. Is it news without actionable policy changes? (LOW relevance)

SCORING GUIDE:
- 90-100: Contains specific policy changes with dates and impact
- 70-89: Contains regulatory updates or significant market signals
- 50-69: Relevant topic but lacks specific actionable information
- 30-49: Tangentially related but mostly navigational
- 0-29: Not relevant (homepage, contact, about pages, etc.)

Return your answer in this EXACT format:
SCORE: [0-100]
REASON: [1-2 sentences explaining why]`;
    }

    /**
     * Fallback relevance check using keywords (no LLM)
     */
    private checkRelevanceWithKeywords(
        url: string,
        title: string,
        content: string
    ): { isRelevant: boolean; score: number; reason: string } {
        const text = `${title} ${content}`.toLowerCase();

        // High-value keywords
        const highValueKeywords = [
            'circular', 'memorandum', 'advisory', 'guideline', 'regulation',
            'rate change', 'interest rate', 'fit rate', 'wesm', 'tariff',
            'effective date', 'shall take effect', 'hereby', 'compliance',
            'tax rate', 'vat', 'corporate tax', 'incentive',
            'renewable energy', 'solar', 'wind', 'power generation',
        ];

        // Low-value keywords (navigation/generic)
        const lowValueKeywords = [
            'home', 'about us', 'contact', 'privacy policy', 'terms of service',
            'login', 'register', 'search', 'menu', 'navigation',
        ];

        let score = 50; // Neutral start
        let reason = 'Content analysis based on keywords';

        // Boost for high-value keywords
        for (const keyword of highValueKeywords) {
            if (text.includes(keyword)) {
                score += 10;
                reason = `Contains policy keyword: "${keyword}"`;
            }
        }

        // Penalty for low-value keywords
        for (const keyword of lowValueKeywords) {
            if (text.includes(keyword) && title.toLowerCase().includes(keyword)) {
                score -= 20;
                reason = `Appears to be navigation/generic page`;
                break;
            }
        }

        score = Math.max(0, Math.min(100, score));
        const isRelevant = score >= 70;

        return { isRelevant, score, reason };
    }

    /**
     * Extract policy signals from content
     */
    private async extractSignals(title: string, content: string): Promise<PolicySignal[]> {
        if (!this.openai) {
            return this.extractSignalsWithRegex(title, content);
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: process.env.LLM_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a policy analyst. Extract structured policy signals from documents. Return JSON array only.',
                    },
                    {
                        role: 'user',
                        content: this.buildSignalExtractionPrompt(title, content),
                    },
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(response.choices[0]?.message?.content || '{"signals":[]}');
            return result.signals || [];
        } catch (error) {
            console.error('[PolicyScanner] Signal extraction failed:', error);
            return this.extractSignalsWithRegex(title, content);
        }
    }

    /**
     * Build signal extraction prompt
     */
    private buildSignalExtractionPrompt(title: string, content: string): string {
        const contentSample = content.substring(0, 4000);

        return `Extract policy signals from this document.

TITLE: ${title}
CONTENT: ${contentSample}

Extract these signal types:
1. circular - New circular or memorandum
2. rate_change - Interest rate, FIT rate, WESM price, tax rate changes
3. guideline - New guidelines or rules
4. advisory - Policy advisories
5. regulatory_timeline - Compliance deadlines, implementation dates
6. energy_policy - Energy sector policy changes

For each signal found, provide:
- type (one of the above)
- title (brief 3-7 word title)
- description (1-2 sentences)
- effectiveDate (if mentioned, ISO format)
- impactedParties (array of affected groups: ["banks", "renewable energy developers", etc.])
- changeDescription (what changed from before)
- confidence (0.0-1.0)

Return ONLY a JSON object with this structure:
{"signals": [{"type": "rate_change", "title": "...", "description": "...", ...}, ...]}`;
    }

    /**
     * Fallback signal extraction using regex patterns
     */
    private extractSignalsWithRegex(title: string, content: string): PolicySignal[] {
        const signals: PolicySignal[] = [];
        const text = `${title}\n${content}`;

        // Circular/Memo pattern
        const circularMatch = text.match(/(circular|memorandum|memo)\s+no\.?\s*[A-Z0-9\-]+/i);
        if (circularMatch) {
            signals.push({
                type: 'circular',
                title: circularMatch[0],
                description: 'New regulatory circular or memorandum identified',
                confidence: 0.8,
            });
        }

        // Rate change pattern
        const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*%?\s*(interest rate|FIT|WESM|tax rate)/i);
        if (rateMatch) {
            signals.push({
                type: 'rate_change',
                title: `Rate Change: ${rateMatch[0]}`,
                description: 'Policy rate or tariff change detected',
                confidence: 0.7,
            });
        }

        // Effective date pattern
        const dateMatch = text.match(/effective\s+(?:date|from)?\s*:?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
        if (dateMatch) {
            signals.push({
                type: 'regulatory_timeline',
                title: 'Effective Date Announcement',
                description: `Effective from ${dateMatch[1]}`,
                effectiveDate: new Date(dateMatch[1]),
                confidence: 0.9,
            });
        }

        return signals;
    }
}
