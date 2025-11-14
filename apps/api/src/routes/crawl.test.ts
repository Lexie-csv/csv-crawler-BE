import request from 'supertest';
import express, { type Express } from 'express';
import crawlRouter from './crawl';

// Mock the entire service module
jest.mock('../services/crawl.service', () => ({
    validateCrawlJob: jest.fn(),
    createCrawlJob: jest.fn(),
    getCrawlJobById: jest.fn(),
    listCrawlJobs: jest.fn(),
    updateCrawlJob: jest.fn(),
    cancelCrawlJob: jest.fn(),
}));

import * as crawlService from '../services/crawl.service';

describe('Crawl Jobs API', () => {
    let app: Express;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/v1/crawl', crawlRouter);
        jest.clearAllMocks();
    });

    describe('POST /api/v1/crawl/start', () => {
        it('should create a new crawl job', async () => {
            const mockJob = {
                id: '550e8400-e29b-41d4-a716-446655440001',
                source_id: '550e8400-e29b-41d4-a716-446655440000',
                status: 'pending' as const,
                items_crawled: 0,
                items_new: 0,
                started_at: null,
                completed_at: null,
                error_message: null,
                created_at: '2025-11-13T10:30:00Z',
                updated_at: '2025-11-13T10:30:00Z',
            };

            (crawlService.validateCrawlJob as jest.Mock).mockReturnValueOnce({
                valid: true,
                errors: {},
                data: { sourceId: '550e8400-e29b-41d4-a716-446655440000' },
            });

            (crawlService.createCrawlJob as jest.Mock).mockResolvedValueOnce(mockJob);

            const response = await request(app)
                .post('/api/v1/crawl/start')
                .send({ sourceId: '550e8400-e29b-41d4-a716-446655440000' });

            expect(response.status).toBe(201);
            expect(response.body.data).toEqual(mockJob);
            expect(response.body.message).toBe('Crawl job created');
            expect(response.body.timestamp).toBeDefined();
        });

        it('should return 400 if sourceId is missing', async () => {
            (crawlService.validateCrawlJob as jest.Mock).mockReturnValueOnce({
                valid: false,
                errors: { sourceId: 'sourceId is required' },
            });

            const response = await request(app)
                .post('/api/v1/crawl/start')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation failed');
            expect(response.body.errors.sourceId).toBeDefined();
        });

        it('should return 400 if sourceId is not a valid UUID', async () => {
            (crawlService.validateCrawlJob as jest.Mock).mockReturnValueOnce({
                valid: false,
                errors: { sourceId: 'sourceId must be a valid UUID' },
            });

            const response = await request(app)
                .post('/api/v1/crawl/start')
                .send({ sourceId: 'not-a-uuid' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation failed');
            expect(response.body.errors.sourceId).toContain('valid UUID');
        });

        it('should return 404 if source does not exist', async () => {
            (crawlService.validateCrawlJob as jest.Mock).mockReturnValueOnce({
                valid: true,
                errors: {},
                data: { sourceId: '550e8400-e29b-41d4-a716-446655440099' },
            });

            (crawlService.createCrawlJob as jest.Mock).mockRejectedValueOnce(
                new Error('Source not found')
            );

            const response = await request(app)
                .post('/api/v1/crawl/start')
                .send({ sourceId: '550e8400-e29b-41d4-a716-446655440099' });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Source not found');
        });

        it('should return 500 on database error', async () => {
            (crawlService.validateCrawlJob as jest.Mock).mockReturnValueOnce({
                valid: true,
                errors: {},
                data: { sourceId: '550e8400-e29b-41d4-a716-446655440000' },
            });

            (crawlService.createCrawlJob as jest.Mock).mockRejectedValueOnce(
                new Error('Database connection failed')
            );

            const response = await request(app)
                .post('/api/v1/crawl/start')
                .send({ sourceId: '550e8400-e29b-41d4-a716-446655440000' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to create crawl job');
        });
    });

    describe('GET /api/v1/crawl/jobs/:jobId', () => {
        it('should return a single crawl job', async () => {
            const createdAt = '2025-11-13T10:30:00Z';
            const startedAt = '2025-11-13T10:30:00Z';
            const updatedAt = '2025-11-13T10:35:00Z';

            const mockJob = {
                id: '550e8400-e29b-41d4-a716-446655440001',
                source_id: '550e8400-e29b-41d4-a716-446655440000',
                status: 'running' as const,
                items_crawled: 5,
                items_new: 3,
                started_at: startedAt,
                completed_at: null,
                error_message: null,
                created_at: createdAt,
                updated_at: updatedAt,
            };

            (crawlService.getCrawlJobById as jest.Mock).mockResolvedValueOnce(mockJob);

            const response = await request(app)
                .get('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440001');

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockJob);
            expect(response.body.timestamp).toBeDefined();
        });

        it('should return 404 if job does not exist', async () => {
            (crawlService.getCrawlJobById as jest.Mock).mockResolvedValueOnce(null);

            const response = await request(app)
                .get('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440099');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Crawl job not found');
        });

        it('should return 500 on database error', async () => {
            (crawlService.getCrawlJobById as jest.Mock).mockRejectedValueOnce(
                new Error('Database error')
            );

            const response = await request(app)
                .get('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440001');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch crawl job');
        });
    });

    describe('GET /api/v1/crawl/jobs', () => {
        it('should list all crawl jobs', async () => {
            const mockJobs = [
                {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    source_id: '550e8400-e29b-41d4-a716-446655440000',
                    status: 'pending' as const,
                    items_crawled: 0,
                    items_new: 0,
                    started_at: null,
                    completed_at: null,
                    error_message: null,
                    created_at: '2025-11-13T10:30:00Z',
                    updated_at: '2025-11-13T10:30:00Z',
                },
            ];

            (crawlService.listCrawlJobs as jest.Mock).mockResolvedValueOnce({
                jobs: mockJobs,
                total: 1,
            });

            const response = await request(app)
                .get('/api/v1/crawl/jobs')
                .query({ limit: 20, offset: 0 });

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockJobs);
            expect(response.body.total).toBe(1);
            expect(response.body.limit).toBe(20);
            expect(response.body.offset).toBe(0);
        });

        it('should filter by sourceId', async () => {
            const mockJobs: never[] = [];

            (crawlService.listCrawlJobs as jest.Mock).mockResolvedValueOnce({
                jobs: mockJobs,
                total: 0,
            });

            const response = await request(app)
                .get('/api/v1/crawl/jobs')
                .query({ sourceId: '550e8400-e29b-41d4-a716-446655440000' });

            expect(response.status).toBe(200);
            expect(crawlService.listCrawlJobs).toHaveBeenCalledWith(
                expect.objectContaining({
                    sourceId: '550e8400-e29b-41d4-a716-446655440000',
                })
            );
        });

        it('should filter by status', async () => {
            const mockJobs: never[] = [];

            (crawlService.listCrawlJobs as jest.Mock).mockResolvedValueOnce({
                jobs: mockJobs,
                total: 0,
            });

            const response = await request(app)
                .get('/api/v1/crawl/jobs')
                .query({ status: 'running' });

            expect(response.status).toBe(200);
            expect(crawlService.listCrawlJobs).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'running',
                })
            );
        });

        it('should respect limit cap of 100', async () => {
            (crawlService.listCrawlJobs as jest.Mock).mockResolvedValueOnce({
                jobs: [],
                total: 0,
            });

            await request(app)
                .get('/api/v1/crawl/jobs')
                .query({ limit: 500 });

            expect(crawlService.listCrawlJobs).toHaveBeenCalledWith(
                expect.objectContaining({
                    limit: 100,
                })
            );
        });

        it('should return 500 on database error', async () => {
            (crawlService.listCrawlJobs as jest.Mock).mockRejectedValueOnce(
                new Error('Database error')
            );

            const response = await request(app)
                .get('/api/v1/crawl/jobs');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch crawl jobs');
        });
    });

    describe('PUT /api/v1/crawl/jobs/:jobId', () => {
        it('should update a crawl job', async () => {
            const mockJob = {
                id: '550e8400-e29b-41d4-a716-446655440001',
                source_id: '550e8400-e29b-41d4-a716-446655440000',
                status: 'running' as const,
                items_crawled: 10,
                items_new: 5,
                started_at: '2025-11-13T10:30:00Z',
                completed_at: null,
                error_message: null,
                created_at: '2025-11-13T10:30:00Z',
                updated_at: '2025-11-13T10:35:00Z',
            };

            (crawlService.updateCrawlJob as jest.Mock).mockResolvedValueOnce(mockJob);

            const response = await request(app)
                .put('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440001')
                .send({
                    status: 'running',
                    items_crawled: 10,
                    items_new: 5,
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockJob);
            expect(response.body.message).toBe('Crawl job updated');
        });

        it('should return 404 if job does not exist', async () => {
            (crawlService.updateCrawlJob as jest.Mock).mockRejectedValueOnce(
                new Error('Crawl job not found')
            );

            const response = await request(app)
                .put('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440099')
                .send({ status: 'done' });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Crawl job not found');
        });
    });

    describe('DELETE /api/v1/crawl/jobs/:jobId', () => {
        it('should cancel a crawl job', async () => {
            (crawlService.cancelCrawlJob as jest.Mock).mockResolvedValueOnce({});

            const response = await request(app)
                .delete('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440001');

            expect(response.status).toBe(204);
        });

        it('should return 404 if job does not exist', async () => {
            (crawlService.cancelCrawlJob as jest.Mock).mockRejectedValueOnce(
                new Error('Crawl job not found')
            );

            const response = await request(app)
                .delete('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440099');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Crawl job not found');
        });

        it('should return 400 if job cannot be cancelled', async () => {
            (crawlService.cancelCrawlJob as jest.Mock).mockRejectedValueOnce(
                new Error("Cannot cancel job with status 'done'")
            );

            const response = await request(app)
                .delete('/api/v1/crawl/jobs/550e8400-e29b-41d4-a716-446655440001');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Cannot cancel');
        });
    });
});
