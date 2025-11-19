// Domain types for CSV Policy & Data Crawler
// All types are based on the canonical UUID-based schema in packages/db/migrations/001_init_schema.sql

/**
 * Source: A regulatory watchlist entry (website, regulator, exchange, etc.)
 */
export interface Source {
    readonly id: string; // UUID
    readonly name: string;
    readonly url: string;
    readonly type: 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news';
    readonly country: string;
    readonly sector?: string | null;
    readonly frequency?: 'daily' | 'weekly' | 'monthly' | 'ad-hoc';
    readonly active: boolean;
    readonly crawlConfig?: SourceCrawlConfig | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

/**
 * CrawlJob: Tracking for a crawl execution
 */
export interface CrawlJob {
    readonly id: string; // UUID
    readonly sourceId: string; // UUID, FK to sources.id
    readonly status: 'pending' | 'running' | 'done' | 'failed';
    readonly startedAt?: Date | null;
    readonly completedAt?: Date | null;
    readonly itemsCrawled: number;
    readonly itemsNew: number;
    readonly errorMessage?: string | null;
    // Multi-page crawling fields
    readonly pagesCrawled?: number;
    readonly pagesNew?: number;
    readonly pagesFailed?: number;
    readonly pagesSkipped?: number;
    readonly maxDepth?: number;
    readonly maxPages?: number;
    readonly crawlConfig?: SourceCrawlConfig | null;
    readonly createdAt: Date;
}

/**
 * CrawledDocument (also referred to as 'documents' in DB):
 * Raw fetched content from a crawl, pre-extraction.
 */
export interface CrawledDocument {
    readonly id: string; // UUID
    readonly sourceId: string; // UUID, FK to sources.id
    readonly crawlJobId?: string | null; // UUID, FK to crawl_jobs.id
    readonly url: string;
    readonly title?: string | null;
    readonly content?: string | null;
    readonly contentHash: string;
    readonly classification?: string | null; // e.g., policy, news, etc.
    readonly country?: string | null;
    readonly sector?: string | null;
    readonly themes?: string[] | null; // Tags/themes array
    readonly extractedData?: Record<string, unknown> | null; // Unstructured extracted fields
    readonly confidence?: number; // 0-1 confidence score
    readonly verified?: boolean;
    readonly publishedAt?: Date | null;
    readonly extractedAt?: Date | null;
    readonly crawledAt?: Date;
    readonly createdAt: Date;
    readonly updatedAt?: Date;
}

/**
 * DataPoint: Extracted structured key-value pairs from a document
 */
export interface DataPoint {
    readonly id: string; // UUID
    readonly documentId: string; // UUID, FK to documents.id
    readonly key: string;
    readonly value: string | number;
    readonly unit?: string | null;
    readonly effectiveDate?: Date | null;
    readonly source?: string | null;
    readonly confidence?: number; // 0-1
    readonly provenance?: string | null; // Audit trail
    readonly createdAt: Date;
    readonly updatedAt?: Date;
}

/**
 * Digest: Weekly newsletter or periodic rollup
 */
export interface Digest {
    readonly id: string; // UUID
    readonly title: string;
    readonly topics?: string[] | null;
    readonly countries?: string[] | null;
    readonly content?: string | null;
    readonly markdownContent?: string | null;
    readonly pdfUrl?: string | null;
    readonly scheduledAt: Date;
    readonly sentAt?: Date | null;
    readonly createdAt: Date;
    readonly updatedAt?: Date;
}

/**
 * Subscription: User digest preferences
 */
export interface Subscription {
    readonly id: string; // UUID
    readonly email: string;
    readonly topics?: string[] | null;
    readonly countries?: string[] | null;
    readonly active: boolean;
    readonly verified: boolean;
    readonly subscribedAt?: Date;
    readonly createdAt: Date;
    readonly updatedAt?: Date;
}

/**
 * AuditLog: Immutable record of system actions
 */
export interface AuditLog {
    readonly id: string; // UUID
    readonly action: string;
    readonly entityType?: string | null;
    readonly entityId?: string | null;
    readonly userId?: string | null;
    readonly changes?: Record<string, unknown> | null;
    readonly createdAt: Date;
}

/**
 * CrawlConfig: Settings for LLM-based crawler
 */
export interface CrawlConfig {
    readonly apiKey: string;
    readonly model: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly systemPrompt?: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
    readonly data?: T;
    readonly error?: string;
    readonly message?: string;
}

/**
 * Paginated API list response
 */
export interface ApiListResponse<T> {
    readonly data: readonly T[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
}

// ============================================
// Multi-Page Crawling & LLM Digest Types
// ============================================

/**
 * SourceCrawlConfig: Configuration for multi-page crawling per source
 */
export interface SourceCrawlConfig {
    readonly baseUrl: string;
    readonly maxDepth?: number;         // max link depth from base URL (default: 2)
    readonly maxPages?: number;         // total pages to crawl per job (default: 50)
    readonly concurrency?: number;      // simultaneous HTTP requests (default: 3)
    readonly allowedPathPatterns?: string[]; // regex patterns for allowed paths
    readonly blockedPathPatterns?: string[]; // regex patterns for blocked paths
    readonly paginationSelectors?: string[]; // CSS selectors for pagination links
    readonly followExternalLinks?: boolean;  // whether to follow external domains
}

/**
 * DigestHighlight: A significant event or document found during crawl
 */
export interface DigestHighlight {
    readonly title: string;
    readonly summary: string;
    readonly category: 'circular' | 'ppa' | 'price_change' | 'energy_mix' | 'policy' | 'other';
    readonly documentId: string | null;
    readonly sourceUrl: string;
    readonly effectiveDate?: string | null;
    readonly confidence?: number;
}

/**
 * DigestDatapoint: Structured datapoint extracted by LLM
 */
export interface DigestDatapoint {
    readonly indicatorCode: string;      // "DOE_CIRCULAR", "PPA_SIGNED", "WESM_AVG_PRICE", etc.
    readonly description: string;
    readonly value: number | string;
    readonly unit?: string | null;
    readonly effectiveDate?: string | null;
    readonly country?: string | null;
    readonly metadata?: Record<string, any>;
    readonly sourceDocumentId: string;
    readonly sourceUrl: string;
    readonly confidence?: number;
}

/**
 * CrawlDigest: LLM-generated summary of a crawl job
 */
export interface CrawlDigest {
    readonly id: string;
    readonly crawlJobId: string;
    readonly sourceId: string;
    readonly periodStart: string;
    readonly periodEnd: string;
    readonly summaryMarkdown?: string | null;
    readonly summaryMarkdownPath?: string | null;
    readonly highlights: DigestHighlight[];
    readonly datapoints: DigestDatapoint[];
    readonly metadata?: Record<string, any>;
    readonly createdAt: string;
    readonly updatedAt?: string;
}

/**
 * LLM Classification Result
 */
export interface DocumentClassification {
    readonly isRelevant: boolean;
    readonly category: 'circular' | 'ppa' | 'price_change' | 'energy_mix' | 'policy' | 'other' | 'irrelevant';
    readonly confidence: number;
    readonly reasoning?: string;
}

/**
 * LLM Extraction Result
 */
export interface ExtractionResult {
    readonly events: Array<{
        title: string;
        summary: string;
        category: string;
        effectiveDate?: string | null;
    }>;
    readonly datapoints: DigestDatapoint[];
    readonly confidence: number;
}

/**
 * Paginated response with page info
 */
export interface PaginatedResponse<T> {
    readonly items: T[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
    readonly hasMore: boolean;
}
