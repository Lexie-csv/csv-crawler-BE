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

// Stats endpoint for dashboard
app.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
    try {
        const { query } = await import('@csv/db');
        
        const [sources, jobs, documents, weekly] = await Promise.all([
            query('SELECT COUNT(*) FROM sources'),
            query("SELECT COUNT(*) FROM crawl_jobs WHERE status = 'running'"),
            query('SELECT COUNT(*) FROM documents'),
            query(`
                SELECT COUNT(*) FROM documents 
                WHERE created_at >= NOW() - INTERVAL '7 days'
            `),
        ]);

        res.json({
            totalSources: parseInt((sources[0] as any).count),
            activeJobs: parseInt((jobs[0] as any).count),
            totalDocuments: parseInt((documents[0] as any).count),
            weeklyDocuments: parseInt((weekly[0] as any).count),
        });
    } catch (error) {
        console.error('[API] Failed to fetch stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Crawl jobs listing endpoint
app.get('/api/crawl-jobs', async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = await import('@csv/db');
        const limit = parseInt(req.query.limit as string) || 10;
        
        const result = await query(
            'SELECT * FROM crawl_jobs ORDER BY created_at DESC LIMIT $1',
            [limit]
        );

        res.json(result);
    } catch (error) {
        console.error('[API] Failed to fetch crawl jobs:', error);
        res.status(500).json({ error: 'Failed to fetch crawl jobs' });
    }
});

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
