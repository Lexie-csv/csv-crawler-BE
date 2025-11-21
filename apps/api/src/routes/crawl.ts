import { Router, type Request, type Response, type Router as ExpressRouter } from 'express';
import {
    validateCrawlJob,
    createCrawlJob,
    getCrawlJobById,
    listCrawlJobs,
    updateCrawlJob,
    cancelCrawlJob,
} from '../services/crawl.service';
import { digestOrchestrator } from '../services/digest-orchestration.service';

const router: ExpressRouter = Router();

/**
 * POST /api/v1/crawl/start
 * Create a new crawl job for a source with optional multi-page options
 */
router.post('/start', async (req: Request, res: Response): Promise<void> => {
    try {
        const validation = validateCrawlJob(req.body);

        if (!validation.valid) {
            res.status(400).json({
                error: 'Validation failed',
                errors: validation.errors,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // Extract crawl options
        const options = {
            maxDepth: req.body.maxDepth ? parseInt(req.body.maxDepth, 10) : undefined,
            maxPages: req.body.maxPages ? parseInt(req.body.maxPages, 10) : undefined,
            concurrency: req.body.concurrency ? parseInt(req.body.concurrency, 10) : undefined,
            useMultiPage: req.body.useMultiPage === true || req.body.useMultiPage === 'true',
        };

        const job = await createCrawlJob(validation.data!.sourceId, options);

        res.status(201).json({
            data: job,
            message: 'Crawl job created',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        const message = (error as Error).message ?? 'Unknown error';

        if (message === 'Source not found') {
            res.status(404).json({
                error: 'Source not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        console.error('[Crawl API] POST /start error:', error);
        res.status(500).json({
            error: 'Failed to create crawl job',
            message: process.env.NODE_ENV === 'development' ? message : undefined,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/v1/crawl/jobs/:jobId
 * Get a single crawl job by ID
 */
router.get('/jobs/:jobId', async (req: Request, res: Response): Promise<void> => {
    try {
        const job = await getCrawlJobById(req.params.jobId);

        if (!job) {
            res.status(404).json({
                error: 'Crawl job not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.json({
            data: job,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Crawl API] GET /jobs/:jobId error:', error);
        res.status(500).json({
            error: 'Failed to fetch crawl job',
            message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/v1/crawl/jobs
 * List crawl jobs with filtering by sourceId and status
 * Query params: sourceId, status, limit, offset
 */
router.get('/jobs', async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await listCrawlJobs({
            sourceId: req.query.sourceId as string | undefined,
            status: req.query.status as 'pending' | 'running' | 'done' | 'failed' | undefined,
            limit,
            offset,
        });

        res.json({
            data: result.jobs,
            total: result.total,
            limit,
            offset,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Crawl API] GET /jobs error:', error);
        res.status(500).json({
            error: 'Failed to fetch crawl jobs',
            message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * PUT /api/v1/crawl/jobs/:jobId
 * Update crawl job status and progress
 * Note: This is primarily for internal use by the crawler (Story #6)
 */
router.put('/jobs/:jobId', async (req: Request, res: Response): Promise<void> => {
    try {
        const job = await updateCrawlJob(req.params.jobId, req.body);

        res.json({
            data: job,
            message: 'Crawl job updated',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        const message = (error as Error).message ?? 'Unknown error';

        if (message === 'Crawl job not found') {
            res.status(404).json({
                error: 'Crawl job not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        console.error('[Crawl API] PUT /jobs/:jobId error:', error);
        res.status(500).json({
            error: 'Failed to update crawl job',
            message: process.env.NODE_ENV === 'development' ? message : undefined,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * DELETE /api/v1/crawl/jobs/:jobId
 * Cancel a crawl job
 */
router.delete('/jobs/:jobId', async (req: Request, res: Response): Promise<void> => {
    try {
        await cancelCrawlJob(req.params.jobId);

        res.status(204).send();
    } catch (error) {
        const message = (error as Error).message ?? 'Unknown error';

        if (message === 'Crawl job not found') {
            res.status(404).json({
                error: 'Crawl job not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        if (message.includes('Cannot cancel')) {
            res.status(400).json({
                error: message,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        console.error('[Crawl API] DELETE /jobs/:jobId error:', error);
        res.status(500).json({
            error: 'Failed to cancel crawl job',
            message: process.env.NODE_ENV === 'development' ? message : undefined,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/v1/crawl/:jobId/digest
 * Get the LLM-generated digest for a crawl job
 */
router.get('/:jobId/digest', async (req: Request, res: Response): Promise<void> => {
    try {
        const digest = await digestOrchestrator.getDigestByJobId(req.params.jobId);

        if (!digest) {
            res.status(404).json({
                error: 'Digest not found for this crawl job',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.json({
            data: digest,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Crawl API] GET /:jobId/digest error:', error);
        res.status(500).json({
            error: 'Failed to fetch digest',
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
