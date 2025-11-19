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
import { initializeDigestScheduler } from './jobs/weekly-digest';

const app: Express = express();
const port = process.env.PORT ?? 3001;

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
app.use('/api/sources', sourcesRouter);
app.use('/api/crawl', crawlRouter);
app.use('/api/datapoints', datapointsRouter);
app.use('/api/digest', digestRouter);
app.use('/api/digests', digestsRouter); // New digest listing endpoint
app.use('/api/extraction', extractionRouter);

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
    console.log(`  Sources API: http://localhost:${port}/api/sources`);
    console.log(`  Crawl API: http://localhost:${port}/api/crawl`);
    console.log(`  Datapoints API: http://localhost:${port}/api/datapoints`);
});

export { app };
