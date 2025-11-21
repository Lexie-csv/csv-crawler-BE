import crypto from 'crypto';

export interface CrawlJob {
    id: number;
    source_id: number;
    status: 'pending' | 'running' | 'done' | 'failed';
    started_at: string | null;
    completed_at: string | null;
    items_crawled: number;
    items_new: number;
    error_message: string | null;
    created_at: string;
}

export interface Source {
    id: number;
    name: string;
    url: string;
    type: 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news';
    country: string;
    sector: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

// Mock in-memory storage for demo (replace with DB calls)
const mockSources: Source[] = [
    {
        id: 1,
        name: 'Philippine Securities & Exchange Commission',
        url: 'https://www.sec.gov.ph',
        type: 'exchange',
        country: 'PH',
        sector: 'finance',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 2,
        name: 'WESM Market Operations',
        url: 'https://www.wesm.ph',
        type: 'exchange',
        country: 'PH',
        sector: 'energy',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const mockCrawlJobs: CrawlJob[] = [];
let jobIdCounter = 1;

export function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

export async function getAllSources(): Promise<Source[]> {
    // TODO: Replace with DB query
    return mockSources.filter((s) => s.active);
}

export async function createSource(data: Omit<Source, 'id' | 'created_at' | 'updated_at'>): Promise<Source> {
    // TODO: Replace with DB insert
    const source: Source = {
        ...data,
        id: mockSources.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    mockSources.push(source);
    return source;
}

export async function startCrawlJob(sourceId: number): Promise<CrawlJob> {
    // TODO: Replace with DB insert
    const job: CrawlJob = {
        id: jobIdCounter++,
        source_id: sourceId,
        status: 'pending',
        started_at: null,
        completed_at: null,
        items_crawled: 0,
        items_new: 0,
        error_message: null,
        created_at: new Date().toISOString(),
    };
    mockCrawlJobs.push(job);

    // Simulate crawl in background
    setImmediate(() => simulateCrawl(job.id));

    return job;
}

export async function getCrawlJobStatus(jobId: number): Promise<CrawlJob | null> {
    // TODO: Replace with DB query
    return mockCrawlJobs.find((j) => j.id === jobId) || null;
}

export async function getAllCrawlJobs(): Promise<CrawlJob[]> {
    // TODO: Replace with DB query
    return mockCrawlJobs;
}

async function simulateCrawl(jobId: number): Promise<void> {
    const job = mockCrawlJobs.find((j) => j.id === jobId);
    if (!job) return;

    job.status = 'running';
    job.started_at = new Date().toISOString();

    try {
        // Simulate crawling delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mock crawl results
        job.items_crawled = Math.floor(Math.random() * 10) + 3;
        job.items_new = Math.floor(job.items_crawled * 0.7);
        job.status = 'done';
        job.completed_at = new Date().toISOString();

        console.log(`✓ Crawl job ${jobId} completed: ${job.items_crawled} items, ${job.items_new} new`);
    } catch (error) {
        job.status = 'failed';
        job.error_message = error instanceof Error ? error.message : 'Unknown error';
        job.completed_at = new Date().toISOString();
        console.error(`✗ Crawl job ${jobId} failed:`, job.error_message);
    }
}
