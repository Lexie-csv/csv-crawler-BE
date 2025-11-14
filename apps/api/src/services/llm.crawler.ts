import { createHash } from 'crypto';
import * as db from '@csv/db';
import { robotsParser } from './robots.parser';
import * as crawlService from './crawl.service';

type CrawlJob = {
    id: string;
    source_id: string;
    url: string;
    status: string;
    created_at?: Date;
};

const POLL_INTERVAL_MS = Number(process.env.LLM_CRAWLER_POLL_MS || 5000);
const MAX_BATCH = Number(process.env.LLM_CRAWLER_BATCH || 5);

function sha256Hex(input: string): string {
    return createHash('sha256').update(input, 'utf8').digest('hex');
}

async function fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
    return await res.text();
}

async function pollPendingJobs(): Promise<CrawlJob[]> {
    const rows = await db.query<CrawlJob>(
        "SELECT id, source_id, url, status, created_at FROM crawl_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1",
        [MAX_BATCH]
    );
    return rows;
}

async function insertCrawledDocument(params: {
    source_id: string;
    url: string;
    content: string;
    content_hash: string;
}) {
    const sql = `INSERT INTO crawled_documents (source_id, url, content, content_hash, extracted_at, created_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`;
    const rows = await db.query(sql, [params.source_id, params.url, params.content, params.content_hash]);
    return rows[0] ?? null;
}

// Small mockable LLM extraction function. In production this would call an LLM client.
async function defaultExtractor(rawHtml: string): Promise<string> {
    // For now, a simple heuristic: strip tags and return text. Replaceable by LLM call.
    return rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Process a single crawl job. An extractor function can be provided for testing or
 * to plug in a real LLM client. Returns void and updates job status via crawlService.
 */
export async function processJob(
    job: CrawlJob,
    extractor: (rawHtml: string) => Promise<string> = defaultExtractor
) {
    await crawlService.updateCrawlJob(job.id, { status: 'running' });

    try {
        // Check robots
        const allowed = await robotsParser.isUrlAllowed(job.url);
        if (!allowed) {
            await crawlService.updateCrawlJob(job.id, { status: 'failed', errorMessage: 'URL disallowed by robots.txt' });
            return;
        }

        // Fetch
        const raw = await fetchText(job.url);

        // LLM / extraction (injected)
        const extracted = await extractor(raw);

        // Hash and duplicate check
        const hash = sha256Hex(extracted);
        const existing = await db.queryOne('SELECT id FROM crawled_documents WHERE content_hash = $1', [hash]);
        if (existing) {
            // Duplicate detected, mark job as done (document already exists)
            await crawlService.updateCrawlJob(job.id, { status: 'done' });
            return;
        }

        // Insert
        const stored = await insertCrawledDocument({
            source_id: job.source_id,
            url: job.url,
            content: extracted,
            content_hash: hash,
        });

        await crawlService.updateCrawlJob(job.id, { status: 'done' });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await crawlService.updateCrawlJob(job.id, { status: 'failed', errorMessage: message });
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLLMCrawlerLoop(stopSignal?: { stop: boolean }) {
    // Run until stopSignal.stop === true (if provided)
    // This function is intentionally simple and single-threaded. For horizontal scaling,
    // run multiple instances and rely on DB-based job claiming (not implemented here).
    while (!stopSignal?.stop) {
        try {
            const jobs = await pollPendingJobs();
            for (const job of jobs) {
                // Process jobs sequentially to keep implementation simple. This can be parallelized.
                // We don't claim jobs in the DB in this minimal implementation; the crawl_jobs
                // table is updated to 'running' immediately in processJob.
                // Fire and forget per-job processing to avoid long loops blocking new polls.
                // But keep sequential here to preserve ordering and avoid racing inserts.
                // If you'd like parallelism, use Promise.allSettled on a mapped array.
                // eslint-disable-next-line no-await-in-loop
                await processJob(job);
            }
        } catch (err) {
            console.error('[LLM CRAWLER] Poll error:', err);
        }

        // Wait a bit before next poll
        // eslint-disable-next-line no-await-in-loop
        await sleep(POLL_INTERVAL_MS);
    }
}

if (require.main === module) {
    // Basic CLI runner
    console.log('[LLM CRAWLER] Starting loop. Poll interval:', POLL_INTERVAL_MS);
    runLLMCrawlerLoop().catch((err) => {
        console.error('[LLM CRAWLER] Fatal error:', err);
        process.exit(1);
    });
}

export default { runLLMCrawlerLoop };
