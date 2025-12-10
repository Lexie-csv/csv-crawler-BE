import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '@csv/db';

const router: Router = Router();

/**
 * GET /api/v1/documents
 * List documents with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const {
            limit = '20',
            days = '7',
            type,
            source_id,
            offset = '0',
            is_alert // NEW: Filter by alert status
        } = req.query;

        console.log('📊 Documents API Query:', { limit, days, type, source_id, is_alert });

        let sql = `
            SELECT 
                d.*,
                s.name as source_name,
                s.type as source_type
            FROM documents d
            JOIN sources s ON s.id = d.source_id
            WHERE d.created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
        `;

        const params: any[] = [];

        if (source_id) {
            params.push(source_id);
            sql += ` AND d.source_id = $${params.length}`;
        }

        if (type) {
            params.push(type);
            sql += ` AND s.type = $${params.length}`;
        }

        // NEW: Filter by is_alert
        if (is_alert !== undefined) {
            const alertValue = is_alert === 'true';
            params.push(alertValue);
            sql += ` AND d.is_alert = $${params.length}`;
            console.log(`✅ Adding is_alert filter: ${alertValue}`);
        }

        sql += ` ORDER BY d.created_at DESC`;
        sql += ` LIMIT ${parseInt(limit as string)}`;
        sql += ` OFFSET ${parseInt(offset as string)}`;

        const result = await query(sql, params);

        // Get total count for pagination
        let countSql = `
            SELECT COUNT(*) as total
            FROM documents d
            JOIN sources s ON s.id = d.source_id
            WHERE d.created_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
        `;

        const countParams: any[] = [];
        if (source_id) {
            countParams.push(source_id);
            countSql += ` AND d.source_id = $${countParams.length}`;
        }
        if (type) {
            countParams.push(type);
            countSql += ` AND s.type = $${countParams.length}`;
        }
        // NEW: Include is_alert in count query
        if (is_alert !== undefined) {
            countParams.push(is_alert === 'true');
            countSql += ` AND d.is_alert = $${countParams.length}`;
        }

        const countResult = await query(countSql, countParams);
        const total = parseInt((countResult[0] as any).total);

        res.json({
            data: result,
            total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({
            error: 'Failed to fetch documents',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/v1/documents/:id
 * Get a single document by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT 
                d.*,
                s.name as source_name,
                s.type as source_type,
                s.url as source_url
            FROM documents d
            JOIN sources s ON s.id = d.source_id
            WHERE d.id = $1`,
            [id]
        );

        if (result.length === 0) {
            return res.status(404).json({
                error: 'Document not found',
                message: `No document found with id: ${id}`
            });
        }

        res.json({
            data: result[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({
            error: 'Failed to fetch document',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
