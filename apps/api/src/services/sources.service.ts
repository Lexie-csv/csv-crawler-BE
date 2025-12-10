/**
 * Sources Service - CRUD operations for regulatory sources
 */

import type { Source } from '@csv/types';
import { query, queryOne } from '@csv/db';

const VALID_TYPES = ['policy', 'exchange', 'gazette', 'ifi', 'portal', 'news'];
const VALID_COUNTRIES = ['PH', 'SG', 'MY', 'ID', 'TH'];

/**
 * Validate source input
 */
export function validateSource(data: unknown): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
        return { valid: false, errors: ['Request body must be an object'] };
    }

    const body = data as Record<string, unknown>;

    // Validate name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        errors.push('name is required and must be a non-empty string');
    } else if (body.name.length > 255) {
        errors.push('name must be 255 characters or less');
    }

    // Validate URL
    if (!body.url || typeof body.url !== 'string') {
        errors.push('url is required and must be a string');
    } else {
        try {
            new URL(body.url);
            if (body.url.length > 2048) {
                errors.push('url must be 2048 characters or less');
            }
        } catch {
            errors.push('url must be a valid URL');
        }
    }

    // Validate type
    if (!body.type || !VALID_TYPES.includes(body.type as string)) {
        errors.push(
            `type must be one of: ${VALID_TYPES.join(', ')}`
        );
    }

    // Validate country
    if (!body.country || !VALID_COUNTRIES.includes(body.country as string)) {
        errors.push(
            `country must be one of: ${VALID_COUNTRIES.join(', ')}`
        );
    }

    // Validate sector (optional)
    if (body.sector !== undefined && body.sector !== null && typeof body.sector !== 'string') {
        errors.push('sector must be a string if provided');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Get all active sources with pagination
 */
export async function getAllSources(limit: number = 50, offset: number = 0): Promise<{
    data: Source[];
    total: number;
}> {
    const sources = await query<Source>(
        'SELECT id, name, url, type, country, sector, active, created_at, updated_at FROM sources WHERE active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );

    const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM sources WHERE active = true'
    );

    const total = parseInt(countResult[0]?.count ?? '0', 10);

    return { data: sources, total };
}

/**
 * Get single source by ID
 */
export async function getSourceById(id: string): Promise<Source | null> {
    return queryOne<Source>(
        'SELECT id, name, url, type, country, sector, active, created_at, updated_at FROM sources WHERE id = $1',
        [id]
    );
}

/**
 * Create new source
 */
export async function createSource(data: {
    name: string;
    url: string;
    type: string;
    country: string;
    sector?: string | null;
    extractionPrompt?: string | null;
}): Promise<Source> {
    const source = await queryOne<Source>(
        `INSERT INTO sources (name, url, type, country, sector, extraction_prompt, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
     RETURNING id, name, url, type, country, sector, extraction_prompt, active, created_at, updated_at`,
        [data.name, data.url, data.type, data.country, data.sector ?? null, data.extractionPrompt ?? null]
    );

    if (!source) {
        throw new Error('Failed to create source');
    }

    return source;
}

/**
 * Update source
 */
export async function updateSource(
    id: string,
    data: {
        name?: string;
        sector?: string | null;
        active?: boolean;
    }
): Promise<Source | null> {
    const updates: string[] = [];
    const values: unknown[] = [id];
    let paramIndex = 2;

    if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
    }

    if (data.sector !== undefined) {
        updates.push(`sector = $${paramIndex++}`);
        values.push(data.sector ?? null);
    }

    if (data.active !== undefined) {
        updates.push(`active = $${paramIndex++}`);
        values.push(data.active);
    }

    if (updates.length === 0) {
        return getSourceById(id);
    }

    updates.push(`updated_at = NOW()`);

    return queryOne<Source>(
        `UPDATE sources
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING id, name, url, type, country, sector, active, created_at, updated_at`,
        values
    );
}

/**
 * Soft delete source (mark inactive)
 */
export async function deleteSource(id: string): Promise<boolean> {
    const result = await query(
        'UPDATE sources SET active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
    );

    return result.length > 0;
}
