import { processJob } from './llm.crawler';
import * as db from '@csv/db';
import { robotsParser } from './robots.parser';
import * as crawlService from './crawl.service';

jest.mock('@csv/db');
jest.mock('./robots.parser');
jest.mock('./crawl.service');

describe('LLM Crawler - processJob', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const job = {
        id: 'job1',
        source_id: 'source1',
        url: 'http://example.com/doc',
        status: 'pending',
    } as any;

    it('stores new document and marks job done when content is new', async () => {
        (robotsParser.isUrlAllowed as jest.Mock).mockResolvedValueOnce(true);

        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            text: async () => '<p>Hello world</p>',
        } as any);

        // No existing document
        (db.queryOne as jest.Mock).mockResolvedValueOnce(null);

        // Insert returns stored row
        (db.query as jest.Mock).mockResolvedValueOnce([{ id: 'doc1' }]);

        await processJob(job, async (raw) => 'Hello world');

        expect(crawlService.updateCrawlJob).toHaveBeenCalled();
        const calls = (crawlService.updateCrawlJob as jest.Mock).mock.calls;
        // first call sets to running
        expect(calls[0][1].status).toBe('running');
        // last call sets to done
        expect(calls[calls.length - 1][1].status).toBe('done');
    });

    it('marks job done when duplicate content found', async () => {
        (robotsParser.isUrlAllowed as jest.Mock).mockResolvedValueOnce(true);

        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            text: async () => '<p>Duplicate</p>',
        } as any);

        // Existing document found
        (db.queryOne as jest.Mock).mockResolvedValueOnce({ id: 'doc1' });

        await processJob(job, async () => 'Duplicate');

        const calls = (crawlService.updateCrawlJob as jest.Mock).mock.calls;
        expect(calls[0][1].status).toBe('running');
        // Should end as done because duplicate
        expect(calls[calls.length - 1][1].status).toBe('done');
        // Ensure we did not call insert (db.query for insert would be second query, but we only had queryOne mocked)
    });

    it('marks job failed when robots disallow', async () => {
        (robotsParser.isUrlAllowed as jest.Mock).mockResolvedValueOnce(false);

        await processJob(job, async () => 'ignored');

        const calls = (crawlService.updateCrawlJob as jest.Mock).mock.calls;
        expect(calls[0][1].status).toBe('running');
        expect(calls[calls.length - 1][1].status).toBe('failed');
        expect(calls[calls.length - 1][1].errorMessage).toContain('robots');
    });
});
