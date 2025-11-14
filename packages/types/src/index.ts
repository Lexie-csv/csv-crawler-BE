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
