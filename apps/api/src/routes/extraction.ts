import { Router, type Request, type Response } from 'express';
import { extractDatapoints, extractAllForSource } from '../services/extraction.service';

const router: Router = Router();

/**
 * POST /api/extraction/documents/:documentId
 * Extract datapoints from a specific document
 */
router.post('/documents/:documentId', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;
        
        if (!documentId) {
            res.status(400).json({ error: 'Document ID is required' });
            return;
        }

        const result = await extractDatapoints(documentId);
        
        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Extraction API] Error extracting from document:', message);
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/extraction/sources/:sourceId
 * Extract datapoints from all documents of a source
 */
router.post('/sources/:sourceId', async (req: Request, res: Response) => {
    try {
        const { sourceId } = req.params;
        
        if (!sourceId) {
            res.status(400).json({ error: 'Source ID is required' });
            return;
        }

        const result = await extractAllForSource(sourceId);
        
        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Extraction API] Error extracting from source:', message);
        res.status(500).json({ error: message });
    }
});

export default router;
