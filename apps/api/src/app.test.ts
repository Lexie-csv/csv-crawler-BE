import { createApp } from './app';
import type { Request, Response } from 'express';

describe('App', () => {
    it('should return 200 on health check', async () => {
        const app = createApp();
        const response = await (await import('supertest')).default(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
