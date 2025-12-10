import { query, queryOne } from '@csv/db';
import { createCrawler } from './crawler.service';
import { createMultiPageCrawler } from './multi-page-crawler.service';
import { digestOrchestrator } from './digest-orchestration.service';
import { CrawlJob, SourceCrawlConfig, CrawlerConfig } from '@csv/types';

/**
 * Validate that the provided sourceId exists in the database
 */
async function validateSourceExists(sourceId: string): Promise<boolean> {
    const source = await queryOne<{ id: string }>(
        'SELECT id FROM sources WHERE id = $1',
        [sourceId]
    );
    return !!source;
}

/**
 * Validate crawl job input data
 */
export interface CreateCrawlJobInput {
    sourceId: string;
    maxDepth?: number;
    maxPages?: number;
    concurrency?: number;
    useMultiPage?: boolean; // Flag to use multi-page crawler
}

export function validateCrawlJob(data: unknown): {
    valid: boolean;
    errors: Record<string, string>;
    data?: CreateCrawlJobInput;
} {
    const errors: Record<string, string> = {};
    const input = data as Record<string, unknown>;

    // Validate sourceId
    if (!input.sourceId) {
        errors.sourceId = 'sourceId is required';
    } else if (typeof input.sourceId !== 'string') {
        errors.sourceId = 'sourceId must be a string (UUID)';
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.sourceId)) {
        errors.sourceId = 'sourceId must be a valid UUID';
    }

    if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        errors: {},
        data: {
            sourceId: input.sourceId as string,
        },
    };
}

/**
 * Create a new crawl job for a source with optional multi-page crawling
 */
export async function createCrawlJob(
    sourceId: string,
    options?: {
        maxDepth?: number;
        maxPages?: number;
        concurrency?: number;
        useMultiPage?: boolean;
    }
): Promise<CrawlJob> {
    // Verify source exists
    const sourceExists = await validateSourceExists(sourceId);
    if (!sourceExists) {
        throw new Error('Source not found');
    }

    const maxDepth = options?.maxDepth ?? 1;
    const maxPages = options?.maxPages ?? (options?.useMultiPage ? 50 : 1);
    const useMultiPage = options?.useMultiPage ?? false;

    // Insert new job with pending status
    const job = await queryOne<CrawlJob>(
        `INSERT INTO crawl_jobs (
            source_id, status, items_crawled, items_new,
            max_depth, max_pages, crawl_config,
            created_at, updated_at
        )
        VALUES ($1, 'pending', 0, 0, $2, $3, $4, NOW(), NOW())
        RETURNING id, source_id as "sourceId", status, 
            items_crawled as "itemsCrawled", items_new as "itemsNew",
            pages_crawled as "pagesCrawled", pages_new as "pagesNew",
            pages_failed as "pagesFailed", pages_skipped as "pagesSkipped",
            max_depth as "maxDepth", max_pages as "maxPages",
            started_at as "startedAt", completed_at as "completedAt",
            error_message as "errorMessage",
            created_at as "createdAt", updated_at as "updatedAt"`,
        [
            sourceId,
            maxDepth,
            maxPages,
            JSON.stringify({ useMultiPage, ...options }),
        ]
    );

    if (!job) {
        throw new Error('Failed to create crawl job');
    }

    // Start crawling in the background (don't await)
    executeCrawlJob(job.id, sourceId, { ...options, useMultiPage }).catch(error => {
        console.error(`[CrawlService] Background crawl failed for job ${job.id}:`, error);
    });

    return job;
}

/**
 * Get a single crawl job by ID
 */
export async function getCrawlJobById(jobId: string): Promise<CrawlJob | null> {
    const job = await queryOne<CrawlJob>(
        `SELECT id, source_id, status, items_crawled, items_new, started_at, completed_at, error_message, created_at, updated_at
     FROM crawl_jobs
     WHERE id = $1`,
        [jobId]
    );
    return job;
}

/**
 * List crawl jobs with optional filtering by sourceId and status
 */
export interface ListCrawlJobsOptions {
    sourceId?: string;
    status?: 'pending' | 'running' | 'done' | 'failed';
    limit?: number;
    offset?: number;
}

export async function listCrawlJobs(options: ListCrawlJobsOptions = {}): Promise<{
    jobs: CrawlJob[];
    total: number;
}> {
    const limit = Math.min(options.limit ?? 20, 100);
    const offset = options.offset ?? 0;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.sourceId) {
        conditions.push(`source_id = $${paramIndex++}`);
        params.push(options.sourceId);
    }

    if (options.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query jobs
    const jobs = await query<CrawlJob>(
        `SELECT id, source_id, status, items_crawled, items_new, started_at, completed_at, error_message, created_at, updated_at
     FROM crawl_jobs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
    );

    // Query total count
    const countResult = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM crawl_jobs ${whereClause}`,
        params
    );

    return {
        jobs,
        total: countResult?.count ?? 0,
    };
}

/**
 * Update crawl job status and progress (used by Story #6 crawler)
 */
export interface UpdateCrawlJobInput {
    status?: 'running' | 'done' | 'failed';
    itemsCrawled?: number;
    itemsNew?: number;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string | null;
}

export async function updateCrawlJob(jobId: string, updates: UpdateCrawlJobInput): Promise<CrawlJob> {
    // Check if job exists
    const existing = await getCrawlJobById(jobId);
    if (!existing) {
        throw new Error('Crawl job not found');
    }

    // Build update query
    const updateFields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        params.push(updates.status);
    }

    if (updates.itemsCrawled !== undefined) {
        updateFields.push(`items_crawled = $${paramIndex++}`);
        params.push(updates.itemsCrawled);
    }

    if (updates.itemsNew !== undefined) {
        updateFields.push(`items_new = $${paramIndex++}`);
        params.push(updates.itemsNew);
    }

    if (updates.startedAt !== undefined) {
        updateFields.push(`started_at = $${paramIndex++}`);
        params.push(updates.startedAt);
    }

    if (updates.completedAt !== undefined) {
        updateFields.push(`completed_at = $${paramIndex++}`);
        params.push(updates.completedAt);
    }

    if ('errorMessage' in updates) {
        updateFields.push(`error_message = $${paramIndex++}`);
        params.push(updates.errorMessage ?? null);
    }

    if (updateFields.length === 0) {
        return existing;
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(jobId);

    const job = await queryOne<CrawlJob>(
        `UPDATE crawl_jobs
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, source_id, status, items_crawled, items_new, started_at, completed_at, error_message, created_at, updated_at`,
        params
    );

    if (!job) {
        throw new Error('Failed to update crawl job');
    }

    return job;
}

/**
 * Cancel a crawl job (soft cancel: mark as failed with message)
 */
export async function cancelCrawlJob(jobId: string, reason: string = 'Manually cancelled'): Promise<CrawlJob> {
    const job = await getCrawlJobById(jobId);
    if (!job) {
        throw new Error('Crawl job not found');
    }

    // Only allow cancelling if job is not already done/failed
    if (job.status === 'done' || job.status === 'failed') {
        throw new Error(`Cannot cancel job with status '${job.status}'`);
    }

    return updateCrawlJob(jobId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: reason,
    });
}

/**
 * Execute a crawl job in the background
 * Supports both single-page and multi-page crawling, followed by LLM-based digest generation
 */
async function executeCrawlJob(
    jobId: string,
    sourceId: string,
    options?: {
        useMultiPage?: boolean;
        maxDepth?: number;
        maxPages?: number;
        concurrency?: number;
    }
): Promise<void> {
    try {
        console.log(`[CrawlService] === Starting crawl job ${jobId} ===`);
        console.log(`[CrawlService] Source: ${sourceId}`);
        console.log(`[CrawlService] Options:`, JSON.stringify(options, null, 2));

        // Get source info
        const source = await queryOne<{ url: string; name: string; crawler_config: any }>(
            'SELECT url, name, crawler_config FROM sources WHERE id = $1',
            [sourceId]
        );

        if (!source) {
            console.error(`[CrawlService] Source ${sourceId} not found in database`);
            throw new Error('Source not found');
        }

        console.log(`[CrawlService] Source details:`, {
            name: source.name,
            url: source.url,
            hasConfig: !!source.crawler_config
        });

        const useMultiPage = options?.useMultiPage ?? false;

        if (useMultiPage) {
            // Multi-page crawling with pagination detection
            console.log(`[CrawlService] ✓ Multi-page mode enabled`);
            console.log(`[CrawlService] Starting MULTI-PAGE crawl for job ${jobId}, source ${sourceId}`);

            // Parse source-specific crawler config from database
            const sourceConfig: CrawlerConfig | null = source.crawler_config || null;

            if (sourceConfig) {
                console.log(`[CrawlService] Using source-specific config:`, sourceConfig);
            } else {
                console.log(`[CrawlService] No source-specific config, using defaults`);
            }

            const config: SourceCrawlConfig = {
                baseUrl: source.url,
                maxDepth: options?.maxDepth ?? 2,
                maxPages: options?.maxPages ?? 50,
                concurrency: options?.concurrency ?? 3,
            };

            console.log(`[CrawlService] Crawl config:`, JSON.stringify(config, null, 2));

            const multiPageCrawler = createMultiPageCrawler(config, sourceConfig);
            const stats = await multiPageCrawler.crawlSource(sourceId, jobId);

            console.log(`[CrawlService] ✓ Multi-page crawl completed for job ${jobId}`);
            console.log(`[CrawlService] Stats:`, JSON.stringify(stats, null, 2));

        } else {
            // Single-page crawling (legacy)
            console.log(`[CrawlService] Using SINGLE-PAGE mode (legacy)`);
            console.log(`[CrawlService] Starting SINGLE-PAGE crawl for job ${jobId}, source ${sourceId}`);
            const crawler = createCrawler();
            await crawler.crawlSource(sourceId, jobId);
            console.log(`[CrawlService] ✓ Single-page crawl completed for job ${jobId}`);
        }

        // Check if documents were created
        const docCount = await queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM documents WHERE crawl_job_id = $1',
            [jobId]
        );
        console.log(`[CrawlService] Documents created: ${docCount?.count ?? 0}`);

        if (!docCount || docCount.count === 0) {
            console.warn(`[CrawlService] ⚠️ No documents created, skipping digest generation`);
            return;
        }

        // Generate LLM-based digest
        console.log(`[CrawlService] === Starting digest generation ===`);
        console.log(`[CrawlService] Job ID: ${jobId}`);
        console.log(`[CrawlService] Source ID: ${sourceId}`);

        const digest = await digestOrchestrator.processAndGenerateDigest(jobId, sourceId);

        if (digest) {
            console.log(`[CrawlService] ✓✓✓ Digest generated successfully ✓✓✓`);
            console.log(`[CrawlService] Digest ID: ${digest.id}`);
            console.log(`[CrawlService] Highlights: ${digest.highlights.length}`);
            console.log(`[CrawlService] Datapoints: ${digest.datapoints.length}`);
            console.log(`[CrawlService] Summary path: ${digest.summaryMarkdownPath}`);
        } else {
            console.warn(`[CrawlService] ⚠️ No digest generated (no relevant content found)`);
        }

        console.log(`[CrawlService] === Crawl job ${jobId} completed ===`);

    } catch (error) {
        console.error(`[CrawlService] ❌ Crawl failed for job ${jobId}:`, error);
        console.error(`[CrawlService] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

        // Update job with error
        await updateCrawlJob(jobId, {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
