import express from 'express';
import type { Express } from 'express';
import path from 'path';

export function createApp(): Express {
    const app = express();
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    // Serve digest files (HTML and Markdown)
    app.use('/digests', express.static(path.join(process.cwd(), 'storage', 'digests')));

    return app;
}
