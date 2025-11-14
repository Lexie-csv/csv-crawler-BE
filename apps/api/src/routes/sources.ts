/**
 * Sources API Routes
 */

import { Router, type Request, type Response } from 'express';
import {
    getAllSources,
    getSourceById,
    createSource,
    updateSource,
    deleteSource,
    validateSource,
} from '../services/sources.service';

const router: Router = Router();

/**
 * GET /api/v1/sources - List active sources with pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const { data, total } = await getAllSources(limit, offset);

        res.json({
            data,
            total,
            limit,
            offset,
            message: `Found ${data.length} sources`,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('GET /sources error:', err);
        res.status(500).json({
            error: 'Failed to fetch sources',
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/v1/sources/:id - Get single source
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const source = await getSourceById(req.params.id);

        if (!source) {
            res.status(404).json({
                error: 'Source not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.json({
            data: source,
            message: 'Source retrieved',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error(`GET /sources/${req.params.id} error:`, err);
        res.status(500).json({
            error: 'Failed to fetch source',
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * POST /api/v1/sources - Create new source
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate input
        const validation = validateSource(req.body);
        if (!validation.valid) {
            res.status(400).json({
                error: 'Validation failed',
                errors: validation.errors,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // Create source
        const source = await createSource({
            name: req.body.name as string,
            url: req.body.url as string,
            type: req.body.type as string,
            country: req.body.country as string,
            sector: req.body.sector as string | null | undefined,
        });

        res.status(201).json({
            data: source,
            message: 'Source created successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('POST /sources error:', err);
        const message = err instanceof Error ? err.message : 'Failed to create source';
        res.status(500).json({
            error: message,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * PUT /api/v1/sources/:id - Update source
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate that source exists
        const existing = await getSourceById(req.params.id);
        if (!existing) {
            res.status(404).json({
                error: 'Source not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // Validate name length if provided
        if (req.body.name !== undefined && req.body.name !== null) {
            if (typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
                res.status(400).json({
                    error: 'Validation failed',
                    errors: ['name must be a non-empty string if provided'],
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            if (req.body.name.length > 255) {
                res.status(400).json({
                    error: 'Validation failed',
                    errors: ['name must be 255 characters or less'],
                    timestamp: new Date().toISOString(),
                });
                return;
            }
        }

        // Update source
        const updated = await updateSource(req.params.id, {
            name: req.body.name,
            sector: req.body.sector,
            active: req.body.active,
        });

        res.json({
            data: updated,
            message: 'Source updated successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error(`PUT /sources/${req.params.id} error:`, err);
        res.status(500).json({
            error: 'Failed to update source',
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * DELETE /api/v1/sources/:id - Soft delete (mark inactive)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate that source exists
        const existing = await getSourceById(req.params.id);
        if (!existing) {
            res.status(404).json({
                error: 'Source not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // Delete (soft delete - mark inactive)
        const deleted = await deleteSource(req.params.id);

        if (!deleted) {
            res.status(500).json({
                error: 'Failed to delete source',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.json({
            message: 'Source deleted successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error(`DELETE /sources/${req.params.id} error:`, err);
        res.status(500).json({
            error: 'Failed to delete source',
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
