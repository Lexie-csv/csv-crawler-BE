import express, { type Express, type Request, type Response } from 'express';
import { setupGracefulShutdown, healthCheck } from '@csv/db';
import sourcesRouter from './routes/sources';
import crawlRouter from './routes/crawl';
import digestRouter from './routes/digest';
import { initializeDigestScheduler } from './jobs/weekly-digest';

const app: Express = express();
const port = process.env.PORT ?? 3001;

// Middleware
app.use(express.json());

// Setup graceful shutdown
setupGracefulShutdown();

// Health check
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
    const health = await healthCheck();
    res.json({
        status: health.ok ? 'ok' : 'unhealthy',
        message: health.message,
        timestamp: new Date().toISOString(),
    });
});

// Mount routes
app.use('/api/v1/sources', sourcesRouter);
app.use('/api/v1/crawl', crawlRouter);
app.use('/api/digest', digestRouter);

// Initialize scheduled jobs
initializeDigestScheduler();

// 404 handler
app.use((_req: Request, res: Response): void => {
    res.status(404).json({
        error: 'Not Found',
        timestamp: new Date().toISOString(),
    });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: unknown): void => {
    console.error('[API] Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
        timestamp: new Date().toISOString(),
    });
});

app.listen(port, () => {
    console.log(`✓ API server listening on port ${port}`);
    console.log(`  Health check: http://localhost:${port}/health`);
    console.log(`  Sources API: http://localhost:${port}/api/v1/sources`);
    console.log(`  Crawl API: http://localhost:${port}/api/v1/crawl`);
});

export { app };
