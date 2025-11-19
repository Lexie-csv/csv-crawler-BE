/**
 * Datapoint Query API Routes
 * GET /api/v1/datapoints - Query with filtering
 * GET /api/v1/datapoints/export - CSV export
 * GET /api/v1/datapoints/timeseries - Time series aggregation
 */

import { Router, Request, Response } from 'express';
import { datapointQueryService, DatapointQueryFilters } from '../services/datapoint-query.service';

const router: Router = Router();

/**
 * GET /api/v1/datapoints
 * Query datapoints with filtering and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const filters: DatapointQueryFilters = {
            key: req.query.key as string | undefined,
            country: req.query.country as string | undefined,
            sector: req.query.sector as string | undefined,
            sourceId: req.query.sourceId as string | undefined,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            minConfidence: req.query.minConfidence
                ? parseFloat(req.query.minConfidence as string)
                : undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
            sortBy: req.query.sortBy as 'effective_date' | 'confidence' | 'created_at' | undefined,
            sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        };

        // Validate minConfidence
        if (filters.minConfidence !== undefined && (filters.minConfidence < 0 || filters.minConfidence > 1)) {
            res.status(400).json({ error: 'minConfidence must be between 0 and 1' });
            return;
        }

        // Validate limit
        if (filters.limit !== undefined && (filters.limit < 1 || filters.limit > 10000)) {
            res.status(400).json({ error: 'limit must be between 1 and 10000' });
            return;
        }

        // Validate date format (basic check)
        if (filters.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)) {
            res.status(400).json({ error: 'startDate must be in YYYY-MM-DD format' });
            return;
        }
        if (filters.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
            res.status(400).json({ error: 'endDate must be in YYYY-MM-DD format' });
            return;
        }

        const result = await datapointQueryService.queryDatapoints(filters);
        res.json(result);
    } catch (err) {
        console.error('Failed to query datapoints:', err);
        const error = err as Error;
        res.status(500).json({ error: error.message || 'Failed to query datapoints' });
    }
});

/**
 * GET /api/v1/datapoints/export
 * Export datapoints as CSV
 */
router.get('/export', async (req: Request, res: Response): Promise<void> => {
    try {
        const filters: DatapointQueryFilters = {
            key: req.query.key as string | undefined,
            country: req.query.country as string | undefined,
            sector: req.query.sector as string | undefined,
            sourceId: req.query.sourceId as string | undefined,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            minConfidence: req.query.minConfidence
                ? parseFloat(req.query.minConfidence as string)
                : undefined,
        };

        // Validate minConfidence
        if (filters.minConfidence !== undefined && (filters.minConfidence < 0 || filters.minConfidence > 1)) {
            res.status(400).json({ error: 'minConfidence must be between 0 and 1' });
            return;
        }

        // Validate date format
        if (filters.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)) {
            res.status(400).json({ error: 'startDate must be in YYYY-MM-DD format' });
            return;
        }
        if (filters.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
            res.status(400).json({ error: 'endDate must be in YYYY-MM-DD format' });
            return;
        }

        const csv = await datapointQueryService.exportToCSV(filters);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=datapoints.csv');
        res.send(csv);
    } catch (err) {
        console.error('Failed to export datapoints:', err);
        const error = err as Error;
        res.status(500).json({ error: error.message || 'Failed to export datapoints' });
    }
});

/**
 * GET /api/v1/datapoints/timeseries
 * Get time series aggregation for a specific datapoint key
 */
router.get('/timeseries', async (req: Request, res: Response): Promise<void> => {
    try {
        const key = req.query.key as string;
        if (!key) {
            res.status(400).json({ error: 'key parameter is required' });
            return;
        }

        const options = {
            country: req.query.country as string | undefined,
            sector: req.query.sector as string | undefined,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            resolution: (req.query.resolution as 'daily' | 'weekly' | 'monthly') || 'monthly',
        };

        // Validate resolution
        if (!['daily', 'weekly', 'monthly'].includes(options.resolution)) {
            res.status(400).json({ error: 'resolution must be daily, weekly, or monthly' });
            return;
        }

        // Validate date format
        if (options.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(options.startDate)) {
            res.status(400).json({ error: 'startDate must be in YYYY-MM-DD format' });
            return;
        }
        if (options.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(options.endDate)) {
            res.status(400).json({ error: 'endDate must be in YYYY-MM-DD format' });
            return;
        }

        const timeSeries = await datapointQueryService.getTimeSeries(key, options);
        res.json(timeSeries);
    } catch (err) {
        console.error('Failed to get time series:', err);
        const error = err as Error;
        res.status(500).json({ error: error.message || 'Failed to get time series' });
    }
});

export default router;
