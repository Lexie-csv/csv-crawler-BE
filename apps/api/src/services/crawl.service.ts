import { query, queryOne } from '@csv/db';
import { CrawlJob } from '@csv/types';

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
 * Create a new crawl job for a source
 * Status is initialized as 'pending'; actual crawling happens in Story #6
 */
export async function createCrawlJob(sourceId: string): Promise<CrawlJob> {
    // Verify source exists
    const sourceExists = await validateSourceExists(sourceId);
    if (!sourceExists) {
        throw new Error('Source not found');
    }

    // Insert new job with pending status
    const job = await queryOne<CrawlJob>(
        `INSERT INTO crawl_jobs (source_id, status, items_crawled, items_new, created_at, updated_at)
     VALUES ($1, 'pending', 0, 0, NOW(), NOW())
     RETURNING id, source_id, status, items_crawled, items_new, started_at, completed_at, error_message, created_at, updated_at`,
        [sourceId]
    );

    if (!job) {
        throw new Error('Failed to create crawl job');
    }

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
