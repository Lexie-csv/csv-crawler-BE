import { Router, type Request, type Response } from 'express';
import { digestOrchestrator } from '../services/digest-orchestration.service';

const router: Router = Router();

/**
 * GET /api/digests
 * List digests with pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
        const sourceId = req.query.sourceId as string | undefined;

        if (page < 1 || pageSize < 1 || pageSize > 100) {
            res.status(400).json({
                error: 'Invalid pagination parameters',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const result = await digestOrchestrator.listDigests({
            sourceId,
            page,
            pageSize,
        });

        res.json({
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Digests API] GET / error:', error);
        res.status(500).json({
            error: 'Failed to list digests',
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/digests/:digestId
 * Get a single digest by ID
 */
router.get('/:digestId', async (req: Request, res: Response): Promise<void> => {
    try {
        const digest = await digestOrchestrator.getDigestByJobId(req.params.digestId);

        if (!digest) {
            res.status(404).json({
                error: 'Digest not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.json({
            data: digest,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Digests API] GET /:digestId error:', error);
        res.status(500).json({
            error: 'Failed to fetch digest',
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
