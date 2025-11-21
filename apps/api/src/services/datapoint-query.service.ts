/**
 * Datapoint Query Service
 * Advanced filtering, pagination, and time series aggregation for datapoints
 */

import { query } from '@csv/db';

export interface DatapointQueryFilters {
    key?: string;
    country?: string;
    sector?: string;
    sourceId?: string;
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    minConfidence?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'effective_date' | 'confidence' | 'created_at';
    sortOrder?: 'asc' | 'desc';
}

export interface Datapoint {
    id: string;
    document_id: string;
    key: string;
    value: string;
    unit: string | null;
    effective_date: string | null;
    source_reference: string | null;
    confidence: number;
    provenance: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    source_name?: string;
    source_country?: string;
    source_sector?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface TimeSeriesPoint {
    date: string;
    value: number;
    count: number;
    min: number;
    max: number;
    avg: number;
}

export class DatapointQueryService {
    /**
     * Query datapoints with advanced filtering
     */
    async queryDatapoints(filters: DatapointQueryFilters): Promise<PaginatedResult<Datapoint>> {
        const {
            key,
            country,
            sector,
            sourceId,
            startDate,
            endDate,
            minConfidence = 0,
            limit = 50,
            offset = 0,
            sortBy = 'effective_date',
            sortOrder = 'desc',
        } = filters;

        // Validate inputs
        if (limit < 1 || limit > 10000) {
            throw new Error('Limit must be between 1 and 10000');
        }
        if (offset < 0) {
            throw new Error('Offset must be >= 0');
        }

        // Build SQL query
        let sql = `
      SELECT 
        dp.id,
        dp.document_id,
        dp.key,
        dp.value,
        dp.unit,
        dp.effective_date,
        dp.source_reference,
        dp.confidence,
        dp.provenance,
        dp.created_at,
        dp.updated_at,
        s.name as source_name,
        s.country as source_country,
        s.sector as source_sector
      FROM datapoints dp
      JOIN documents d ON dp.document_id = d.id
      JOIN sources s ON d.source_id = s.id
      WHERE dp.confidence >= $1
    `;

        const params: any[] = [minConfidence];
        let paramIndex = 2;

        // Add filters
        if (key) {
            sql += ` AND dp.key = $${paramIndex}`;
            params.push(key);
            paramIndex++;
        }

        if (country) {
            sql += ` AND s.country = $${paramIndex}`;
            params.push(country);
            paramIndex++;
        }

        if (sector) {
            sql += ` AND s.sector = $${paramIndex}`;
            params.push(sector);
            paramIndex++;
        }

        if (sourceId) {
            sql += ` AND s.id = $${paramIndex}`;
            params.push(sourceId);
            paramIndex++;
        }

        if (startDate) {
            sql += ` AND dp.effective_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            sql += ` AND dp.effective_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        // Add sorting
        const validSortFields = ['effective_date', 'confidence', 'created_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'effective_date';
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        sql += ` ORDER BY dp.${sortField} ${order} NULLS LAST`;

        // Add pagination
        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        // Execute query
        const datapoints = await query<Datapoint>(sql, params);

        // Get total count for pagination
        let countSql = `
      SELECT COUNT(*) as count
      FROM datapoints dp
      JOIN documents d ON dp.document_id = d.id
      JOIN sources s ON d.source_id = s.id
      WHERE dp.confidence >= $1
    `;

        const countParams: any[] = [minConfidence];
        let countIndex = 2;

        if (key) {
            countSql += ` AND dp.key = $${countIndex}`;
            countParams.push(key);
            countIndex++;
        }

        if (country) {
            countSql += ` AND s.country = $${countIndex}`;
            countParams.push(country);
            countIndex++;
        }

        if (sector) {
            countSql += ` AND s.sector = $${countIndex}`;
            countParams.push(sector);
            countIndex++;
        }

        if (sourceId) {
            countSql += ` AND s.id = $${countIndex}`;
            countParams.push(sourceId);
            countIndex++;
        }

        if (startDate) {
            countSql += ` AND dp.effective_date >= $${countIndex}`;
            countParams.push(startDate);
            countIndex++;
        }

        if (endDate) {
            countSql += ` AND dp.effective_date <= $${countIndex}`;
            countParams.push(endDate);
            countIndex++;
        }

        const countResult = await query<{ count: string }>(countSql, countParams);
        const total = parseInt(countResult[0]?.count || '0', 10);

        return {
            data: datapoints,
            total,
            limit,
            offset,
            hasMore: offset + datapoints.length < total,
        };
    }

    /**
     * Generate time series aggregation
     */
    async getTimeSeries(
        key: string,
        options: {
            country?: string;
            sector?: string;
            startDate?: string;
            endDate?: string;
            resolution?: 'daily' | 'weekly' | 'monthly';
        }
    ): Promise<TimeSeriesPoint[]> {
        const { country, sector, startDate, endDate, resolution = 'monthly' } = options;

        // Determine date truncation based on resolution
        const truncFunc = {
            daily: 'DATE(dp.effective_date)',
            weekly: "DATE_TRUNC('week', dp.effective_date)::date",
            monthly: "DATE_TRUNC('month', dp.effective_date)::date",
        }[resolution];

        let sql = `
      SELECT 
        ${truncFunc} as date,
        AVG(CAST(dp.value AS FLOAT)) as avg,
        MIN(CAST(dp.value AS FLOAT)) as min,
        MAX(CAST(dp.value AS FLOAT)) as max,
        COUNT(*) as count
      FROM datapoints dp
      JOIN documents d ON dp.document_id = d.id
      JOIN sources s ON d.source_id = s.id
      WHERE dp.key = $1
        AND dp.effective_date IS NOT NULL
        AND dp.value ~ '^[0-9]+\.?[0-9]*$'
    `;

        const params: any[] = [key];
        let paramIndex = 2;

        if (country) {
            sql += ` AND s.country = $${paramIndex}`;
            params.push(country);
            paramIndex++;
        }

        if (sector) {
            sql += ` AND s.sector = $${paramIndex}`;
            params.push(sector);
            paramIndex++;
        }

        if (startDate) {
            sql += ` AND dp.effective_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            sql += ` AND dp.effective_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        sql += ` GROUP BY date ORDER BY date ASC`;

        const results = await query<{
            date: string;
            avg: number;
            min: number;
            max: number;
            count: string;
        }>(sql, params);

        return results.map((row) => ({
            date: row.date,
            value: row.avg, // Use average as the primary value
            count: parseInt(row.count, 10),
            min: row.min,
            max: row.max,
            avg: row.avg,
        }));
    }

    /**
     * Export datapoints as CSV
     */
    async exportToCSV(filters: DatapointQueryFilters): Promise<string> {
        // Get all matching datapoints (force limit/offset for export)
        const { data } = await this.queryDatapoints({
            key: filters.key,
            country: filters.country,
            sector: filters.sector,
            sourceId: filters.sourceId,
            startDate: filters.startDate,
            endDate: filters.endDate,
            minConfidence: filters.minConfidence,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            limit: 10000, // Max export size
            offset: 0,
        });

        // Generate CSV
        const headers = [
            'ID',
            'Key',
            'Value',
            'Unit',
            'Effective Date',
            'Source',
            'Source Name',
            'Country',
            'Sector',
            'Confidence',
            'Created At',
        ];

        const rows = data.map((dp) => [
            dp.id,
            dp.key,
            dp.value,
            dp.unit || '',
            dp.effective_date || '',
            dp.source_reference || '',
            dp.source_name || '',
            dp.source_country || '',
            dp.source_sector || '',
            dp.confidence,
            dp.created_at,
        ]);

        const csv = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        return csv;
    }
}

// Export singleton instance
export const datapointQueryService = new DatapointQueryService();
