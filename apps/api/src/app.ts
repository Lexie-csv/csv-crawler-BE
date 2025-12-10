import express from 'express';
import type { Express } from 'express';
import path from 'path';
import cors from 'cors';
import sourcesRouter from './routes/sources.js';
import crawlRouter from './routes/crawl.js';
import datapointsRouter from './routes/datapoints.js';
import digestsRouter from './routes/digests.js';
import documentsRouter from './routes/documents.js';

export function createApp(): Express {
    const app = express();

    // Enable CORS for frontend
    app.use(cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }));

    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    // API routes
    app.use('/api/v1/sources', sourcesRouter);
    app.use('/api/v1/crawl', crawlRouter);
    app.use('/api/v1/datapoints', datapointsRouter);
    app.use('/api/v1/digests', digestsRouter);
    app.use('/api/v1/documents', documentsRouter);

    // Serve digest files (HTML and Markdown)
    app.use('/digests', express.static(path.join(process.cwd(), 'storage', 'digests')));

    // Serve downloaded PDF files
    app.use('/downloads', express.static(path.join(process.cwd(), 'storage', 'downloads')));

    return app;
}
