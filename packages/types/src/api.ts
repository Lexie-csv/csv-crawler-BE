/**
 * API Response Types & Contracts
 * Single source of truth for frontend-backend communication
 * 
 * This file defines the exact shape of API responses and should be imported
 * by both apps/api (backend) and apps/web (frontend).
 */

// ============================================
// GENERIC API RESPONSE WRAPPERS
// ============================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
    readonly data: T;
    readonly message?: string;
    readonly timestamp: string;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
    readonly items: readonly T[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
    readonly hasMore: boolean;
}

/**
 * Documents list response (legacy format, to be migrated)
 */
export interface DocumentsListResponse {
    readonly data: readonly Document[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
    readonly hasMore: boolean;
    readonly timestamp: string;
}

/**
 * Error response
 */
export interface ApiError {
    readonly error: string;
    readonly timestamp: string;
    readonly details?: unknown;
}

// ============================================
// DOMAIN TYPES (from database schema)
// ============================================

/**
 * Source: A regulatory watchlist entry
 */
export interface Source {
    readonly id: string; // UUID
    readonly name: string;
    readonly url: string;
    readonly type: 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news';
    readonly country: string;
    readonly sector: string | null;
    readonly active: boolean;
    readonly created_at: string; // ISO 8601
    readonly updated_at: string; // ISO 8601
}

/**
 * CrawlJob: Tracking for a crawl execution
 */
export interface CrawlJob {
    readonly id: string; // UUID
    readonly source_id: string; // UUID
    readonly status: 'pending' | 'running' | 'done' | 'failed';
    readonly started_at: string | null; // ISO 8601
    readonly completed_at: string | null; // ISO 8601
    readonly items_crawled: number;
    readonly items_new: number;
    readonly pages_crawled?: number;
    readonly pages_new?: number;
    readonly pages_failed?: number;
    readonly pages_skipped?: number;
    readonly max_depth?: number;
    readonly max_pages?: number;
    readonly error_message: string | null;
    readonly created_at: string; // ISO 8601
    readonly updated_at: string; // ISO 8601
}

/**
 * Document: Crawled content from a source
 */
export interface Document {
    readonly id: string; // UUID
    readonly source_id: string; // UUID
    readonly crawl_job_id: string; // UUID
    readonly url: string;
    readonly title: string;
    readonly content: string;
    readonly content_hash: string;
    readonly image_url?: string | null;
    readonly classification: string;
    readonly confidence_score?: number;
    readonly extracted: boolean;
    readonly is_alert: boolean; // TRUE for policy docs, FALSE for news
    readonly published_at?: string | null; // ISO 8601
    readonly crawled_at: string; // ISO 8601
    readonly created_at: string; // ISO 8601
    readonly updated_at: string; // ISO 8601
    // Joined fields (from source)
    readonly source_name?: string;
    readonly source_type?: string;
}

/**
 * DigestHighlight: Significant event in a digest (JSONB format - legacy)
 */
export interface DigestHighlight {
    readonly title: string;
    readonly summary: string;
    readonly category: 'circular' | 'ppa' | 'price_change' | 'energy_mix' | 'policy' | 'other';
    readonly documentId: string | null;
    readonly sourceUrl: string;
    readonly effectiveDate?: string | null; // ISO 8601
    readonly confidence?: number;
    readonly metadata?: Record<string, unknown>;
}

/**
 * DigestHighlightRow: Normalized digest highlight (database row)
 */
export interface DigestHighlightRow {
    readonly id: string; // UUID
    readonly digest_id: string; // UUID
    readonly text: string;
    readonly type: string | null; // 'event', 'circular', 'ppa', 'news', 'policy'
    readonly source_url: string | null;
    readonly document_id: string | null; // UUID
    readonly category: string | null; // 'Policy', 'Regulatory', 'Market', etc.
    readonly importance: string | null; // 'high', 'medium', 'low'
    readonly metadata: Record<string, unknown> | null;
    readonly created_at: string; // ISO 8601
}

/**
 * DigestDatapoint: Structured data extracted from documents (JSONB format - legacy)
 */
export interface DigestDatapoint {
    readonly indicatorCode: string; // "DOE_CIRCULAR", "PPA_SIGNED", etc.
    readonly description: string;
    readonly value: number | string;
    readonly unit?: string | null;
    readonly effectiveDate?: string | null; // ISO 8601
    readonly country?: string | null;
    readonly sourceDocumentId: string;
    readonly sourceUrl: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * DigestDatapointRow: Normalized digest datapoint (database row)
 */
export interface DigestDatapointRow {
    readonly id: string; // UUID
    readonly digest_id: string; // UUID
    readonly field: string; // 'price', 'volume', 'capacity', etc.
    readonly value: string;
    readonly unit: string | null; // 'MW', 'PHP', 'USD', '%'
    readonly context: string | null;
    readonly source_url: string | null;
    readonly document_id: string | null; // UUID
    readonly effective_date: string | null; // ISO 8601
    readonly metadata: Record<string, unknown> | null;
    readonly created_at: string; // ISO 8601
}

/**
 * CrawlDigest: LLM-generated summary of a crawl job
 */
export interface CrawlDigest {
    readonly id: string; // UUID
    readonly crawl_job_id: string; // UUID
    readonly source_id: string; // UUID
    readonly source_name: string; // Joined from sources table
    readonly period_start: string; // ISO 8601
    readonly period_end: string; // ISO 8601
    readonly summary_markdown: string;
    readonly summary_markdown_path: string | null;
    readonly highlights: readonly DigestHighlight[];
    readonly datapoints: readonly DigestDatapoint[];
    readonly highlights_count: number;
    readonly datapoints_count: number;
    readonly metadata: Record<string, unknown> | null;
    readonly crawled_at: string; // ISO 8601 (from crawl_jobs)
    readonly created_at: string; // ISO 8601
    readonly updated_at: string; // ISO 8601
}

// ============================================
// API REQUEST TYPES
// ============================================

/**
 * Source creation/update input
 */
export interface CreateSourceInput {
    readonly name: string;
    readonly url: string;
    readonly type: 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news';
    readonly country: string;
    readonly sector?: string | null;
    readonly active?: boolean;
}

export interface UpdateSourceInput extends Partial<CreateSourceInput> { }

/**
 * Crawl job creation input
 */
export interface CreateCrawlJobInput {
    readonly sourceId: string;
    readonly useMultiPage?: boolean;
    readonly maxDepth?: number;
    readonly maxPages?: number;
    readonly concurrency?: number;
}

/**
 * Crawl job update input
 */
export interface UpdateCrawlJobInput {
    readonly status?: 'pending' | 'running' | 'done' | 'failed';
    readonly started_at?: string | null;
    readonly completed_at?: string | null;
    readonly items_crawled?: number;
    readonly items_new?: number;
    readonly error_message?: string | null;
}

/**
 * Documents list query params
 */
export interface DocumentsListParams {
    readonly limit?: number;
    readonly offset?: number;
    readonly days?: number;
    readonly type?: string;
    readonly source_id?: string;
    readonly is_alert?: boolean;
}

/**
 * Digests list query params
 */
export interface DigestsListParams {
    readonly page?: number;
    readonly pageSize?: number;
    readonly sourceId?: string;
    readonly source_id?: string; // Alias for consistency
}

// ============================================
// API ENDPOINT RESPONSE TYPES
// ============================================

/**
 * GET /api/v1/sources
 */
export type SourcesListResponse = ApiResponse<readonly Source[]>;

/**
 * GET /api/v1/sources/:id
 */
export type SourceGetResponse = ApiResponse<Source>;

/**
 * GET /api/v1/documents
 */
export type DocumentsGetResponse = DocumentsListResponse;

/**
 * GET /api/v1/documents/:id
 */
export type DocumentGetResponse = ApiResponse<Document>;

/**
 * GET /api/v1/digests
 */
export type DigestsListResponse = PaginatedResponse<CrawlDigest> & {
    readonly timestamp: string;
};

/**
 * GET /api/v1/digests/:id
 */
export type DigestGetResponse = ApiResponse<CrawlDigest>;

/**
 * GET /api/v1/crawl/jobs
 */
export type CrawlJobsListResponse = ApiResponse<readonly CrawlJob[]>;

/**
 * GET /api/v1/crawl/jobs/:id
 */
export type CrawlJobGetResponse = ApiResponse<CrawlJob>;

// ============================================
// FRONTEND UI TYPES (derived from API types)
// ============================================

/**
 * Newsletter: UI representation of a CrawlDigest
 */
export interface Newsletter {
    readonly id: string;
    readonly title: string; // source_name
    readonly dateRange: string; // Formatted from period_start/period_end
    readonly category: string; // Derived from source type
    readonly highlights: number; // highlights_count
    readonly datapoints: number; // datapoints_count
    readonly lastUpdated: string; // created_at
}

/**
 * Signal: UI representation of a Document
 */
export interface Signal {
    readonly id: string;
    readonly title: string;
    readonly summary: string; // Excerpt from content
    readonly url: string;
    readonly source: string; // source_name
    readonly sourceType: string; // source_type
    readonly crawledAt: string; // created_at
    readonly isAlert: boolean; // is_alert
}

/**
 * Dashboard stats
 */
export interface DashboardStats {
    readonly newSignals: number;
    readonly newAlerts: number;
    readonly sourcesMonitored: number;
    readonly latestNewsletter: Newsletter | null;
}

// ============================================
// DATA HOOK RETURN TYPES
// ============================================

/**
 * Standard data hook result
 */
export interface DataHookResult<T> {
    readonly data: T | null;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: Error | null;
    readonly refresh: () => void;
}

/**
 * List data hook result (with array default)
 */
export interface ListDataHookResult<T> {
    readonly data: readonly T[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: Error | null;
    readonly refresh: () => void;
}

/**
 * Paginated data hook result
 */
export interface PaginatedDataHookResult<T> {
    readonly data: readonly T[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
    readonly hasMore: boolean;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: Error | null;
    readonly loadMore: () => void;
    readonly refresh: () => void;
}
