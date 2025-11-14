/**
 * Story #4 Integration Tests: Sources CRUD API
 */

import { app } from './index';
import { query } from '@csv/db';
import type { Source } from '@csv/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Sources CRUD API (integration)', () => {
    jest.setTimeout(30000);

    beforeAll(async () => {
        // Ensure test data exists
        const existing = await query('SELECT COUNT(*) as count FROM sources WHERE name = $1', [
            'Test Source',
        ]);

        if (existing.length === 0 || parseInt((existing[0] as Record<string, string>).count, 10) === 0) {
            // Insert test source if it doesn't exist
            await query(
                `INSERT INTO sources (name, url, type, country, sector, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         ON CONFLICT (url) DO NOTHING`,
                ['Test Source', 'https://example.com', 'policy', 'PH', 'finance']
            );
        }
    });

    describe('GET /api/v1/sources', () => {
        it('should return list of active sources', async () => {
            const res = await request(app).get('/api/v1/sources');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should support pagination', async () => {
            const res = await request(app).get('/api/v1/sources?limit=10&offset=0');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('limit', 10);
            expect(res.body).toHaveProperty('offset', 0);
        });

        it('should return timestamp', async () => {
            const res = await request(app).get('/api/v1/sources');

            expect(res.body).toHaveProperty('timestamp');
            expect(new Date(res.body.timestamp)).toBeInstanceOf(Date);
        });
    });

    describe('GET /api/v1/sources/:id', () => {
        let sourceId: string;

        beforeAll(async () => {
            // Get first source ID
            const sources = await query<Source>('SELECT id FROM sources WHERE active = true LIMIT 1');
            if (sources.length > 0) {
                sourceId = sources[0].id as unknown as string;
            }
        });

        it('should return single source', async () => {
            if (!sourceId) {
                console.warn('Skipping test: no source ID available');
                return;
            }

            const res = await request(app).get(`/api/v1/sources/${sourceId}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('id', sourceId);
            expect(res.body.data).toHaveProperty('name');
            expect(res.body.data).toHaveProperty('url');
        });

        it('should return 404 for non-existent source', async () => {
            const res = await request(app).get('/api/v1/sources/00000000-0000-0000-0000-000000000000');

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('POST /api/v1/sources', () => {
        it('should create new source', async () => {
            const newSource = {
                name: `Test Source ${Date.now()}`,
                url: `https://example-${Date.now()}.com`,
                type: 'policy',
                country: 'PH',
                sector: 'finance',
            };

            const res = await request(app).post('/api/v1/sources').send(newSource);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.name).toBe(newSource.name);
            expect(res.body.data.active).toBe(true);
        });

        it('should validate required fields', async () => {
            const invalidSource = {
                name: 'Test',
                // missing url, type, country
            };

            const res = await request(app).post('/api/v1/sources').send(invalidSource);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('errors');
            expect(Array.isArray(res.body.errors)).toBe(true);
        });

        it('should validate URL format', async () => {
            const invalidSource = {
                name: 'Test',
                url: 'not-a-url',
                type: 'policy',
                country: 'PH',
            };

            const res = await request(app).post('/api/v1/sources').send(invalidSource);

            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: string) => e.includes('valid URL'))).toBe(true);
        });

        it('should validate type enum', async () => {
            const invalidSource = {
                name: 'Test',
                url: 'https://example.com',
                type: 'invalid-type',
                country: 'PH',
            };

            const res = await request(app).post('/api/v1/sources').send(invalidSource);

            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: string) => e.includes('type'))).toBe(true);
        });

        it('should validate country enum', async () => {
            const invalidSource = {
                name: 'Test',
                url: 'https://example.com',
                type: 'policy',
                country: 'XX',
            };

            const res = await request(app).post('/api/v1/sources').send(invalidSource);

            expect(res.status).toBe(400);
            expect(res.body.errors.some((e: string) => e.includes('country'))).toBe(true);
        });
    });

    describe('PUT /api/v1/sources/:id', () => {
        let sourceId: string;

        beforeAll(async () => {
            const sources = await query<Source>('SELECT id FROM sources WHERE active = true LIMIT 1');
            if (sources.length > 0) {
                sourceId = sources[0].id as unknown as string;
            }
        });

        it('should update source', async () => {
            if (!sourceId) {
                console.warn('Skipping test: no source ID available');
                return;
            }

            const updates = {
                sector: 'energy',
                active: true,
            };

            const res = await request(app).put(`/api/v1/sources/${sourceId}`).send(updates);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.sector).toBe('energy');
        });

        it('should return 404 for non-existent source', async () => {
            const res = await request(app)
                .put('/api/v1/sources/00000000-0000-0000-0000-000000000000')
                .send({ sector: 'energy' });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('DELETE /api/v1/sources/:id', () => {
        let sourceId: string;

        beforeAll(async () => {
            // Create a source to delete
            const result = await query<Source>(
                `INSERT INTO sources (name, url, type, country, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         RETURNING id`,
                [`Delete Test ${Date.now()}`, `https://delete-test-${Date.now()}.com`, 'policy', 'PH']
            );
            if (result.length > 0) {
                sourceId = result[0].id as unknown as string;
            }
        });

        it('should soft delete source', async () => {
            if (!sourceId) {
                console.warn('Skipping test: no source ID available');
                return;
            }

            const res = await request(app).delete(`/api/v1/sources/${sourceId}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');

            // Verify source is still in DB but marked inactive
            const checkRes = await query<Source>('SELECT active FROM sources WHERE id = $1', [sourceId]);
            expect(checkRes.length).toBe(1);
            expect(checkRes[0].active).toBe(false);
        });

        it('should return 404 for non-existent source', async () => {
            const res = await request(app).delete(
                '/api/v1/sources/00000000-0000-0000-0000-000000000000'
            );

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('Error handling', () => {
        it('should return 404 for unknown endpoint', async () => {
            const res = await request(app).get('/api/v1/unknown');

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });

        it('should include timestamp in all responses', async () => {
            const res = await request(app).get('/api/v1/sources');

            expect(res.body).toHaveProperty('timestamp');
        });
    });
});
