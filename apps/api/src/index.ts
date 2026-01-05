import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { setupGracefulShutdown, healthCheck } from '@csv/db';
import sourcesRouter from './routes/sources';
import crawlRouter from './routes/crawl';
import digestRouter from './routes/digest';
import digestsRouter from './routes/digests';
import datapointsRouter from './routes/datapoints';
import extractionRouter from './routes/extraction';
import documentsRouter from './routes/documents';
import promptsRouter from './routes/prompts';
import { initializeDigestScheduler } from './jobs/weekly-digest';

const app: Express = express();
const port = Number(process.env.PORT ?? 3001);
const host = '0.0.0.0';

// Middleware
app.use(
    cors({
        origin: process.env.WEB_URL ?? 'http://localhost:3000',
        credentials: true,
    })
);
app.use(express.json());

// Setup graceful shutdown
setupGracefulShutdown();

// Simple ping endpoint (no database)
app.get('/ping', (_req: Request, res: Response): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/ping', (_req: Request, res: Response): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check endpoints
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
    const health = await healthCheck();
    res.json({
        status: health.ok ? 'ok' : 'unhealthy',
        message: health.message,
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/v1/health', async (_req: Request, res: Response): Promise<void> => {
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
app.use('/api/v1/datapoints', datapointsRouter);
app.use('/api/v1/digest', digestRouter);
app.use('/api/v1/digests', digestsRouter);
app.use('/api/v1/extraction', extractionRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/prompts', promptsRouter);

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

app.listen(port, host, () => {
    console.log(`✓ API server listening on ${host}:${port}`);
    console.log(`  Health check: http://localhost:${port}/health`);
    console.log(`  Health check (API): http://localhost:${port}/api/v1/health`);
    console.log(`  Sources API: http://localhost:${port}/api/v1/sources`);
    console.log(`  Crawl API: http://localhost:${port}/api/v1/crawl`);
    console.log(`  Datapoints API: http://localhost:${port}/api/v1/datapoints`);
    console.log(`  Digests API: http://localhost:${port}/api/v1/digests`);
});

export { app };
