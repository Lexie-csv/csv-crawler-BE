#!/usr/bin/env tsx
/**
 * Crawl Power Philippines and BusinessWorld Online
 */

import { query } from '@csv/db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { randomUUID, createHash } from 'crypto';

const powerPhId = 'e78c1efc-a4c5-4e73-89ed-d3773873a681';
const bworldId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945';

async function crawlSource(sourceId: string, url: string, name: string, maxPages: number = 10) {
    console.log(`\n🚀 Starting crawl: ${name}`);
    console.log(`📍 URL: ${url}`);

    // Create crawl job
    const jobId = randomUUID();
    await query(
        `INSERT INTO crawl_jobs (id, source_id, status, started_at) 
         VALUES ($1, $2, 'running', NOW())`,
        [jobId, sourceId]
    );
    console.log(`✅ Job created: ${jobId}`);

    try {
        // Fetch the page
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        const links: string[] = [];

        // Find all article links
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && (
                href.includes('article') ||
                href.includes('news') ||
                href.includes('/20') || // Date pattern
                href.match(/\d{4}\/\d{2}\/\d{2}/) // Date pattern
            )) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();
                if (!links.includes(fullUrl)) {
                    links.push(fullUrl);
                }
            }
        });

        console.log(`📋 Found ${links.length} article links`);

        // Crawl each article (limit to maxPages)
        let crawled = 0;
        for (const link of links.slice(0, maxPages)) {
            try {
                console.log(`  Crawling: ${link.substring(0, 80)}...`);

                const articleResponse = await axios.get(link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    },
                    timeout: 30000
                });

                const article$ = cheerio.load(articleResponse.data);

                // Extract title
                const title = article$('h1').first().text().trim() ||
                    article$('title').text().trim() ||
                    'Untitled';

                // Extract content
                const contentSelectors = ['article', '.article-content', '.entry-content', 'main', '.content'];
                let content = '';
                for (const selector of contentSelectors) {
                    const text = article$(selector).text().trim();
                    if (text.length > content.length) {
                        content = text;
                    }
                }

                if (!content) {
                    content = article$('body').text().trim();
                }

                // Save to database
                const docId = randomUUID();
                const contentHash = createHash('sha256').update(content).digest('hex');
                await query(
                    `INSERT INTO documents (id, crawl_job_id, source_id, url, title, content, content_hash, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                    [docId, jobId, sourceId, link, title, content.substring(0, 50000), contentHash]
                );

                crawled++;
                console.log(`    ✅ Saved: ${title.substring(0, 50)}`);

                await new Promise(r => setTimeout(r, 1000)); // Rate limit

            } catch (err: any) {
                console.log(`    ⚠️ Failed: ${err.message}`);
            }
        }

        // Update job status
        await query(
            `UPDATE crawl_jobs 
             SET status = 'done', completed_at = NOW(), pages_crawled = $2
             WHERE id = $1`,
            [jobId, crawled]
        );

        console.log(`✅ Crawl complete: ${crawled} articles saved`);
        return { jobId, crawled };

    } catch (error: any) {
        console.error(`❌ Crawl failed: ${error.message}`);
        await query(
            `UPDATE crawl_jobs SET status = 'failed', completed_at = NOW() WHERE id = $1`,
            [jobId]
        );
        throw error;
    }
}

async function main() {
    try {
        // Crawl Power Philippines
        const result1 = await crawlSource(
            powerPhId,
            'https://powerphilippines.com/',
            'Power Philippines',
            10
        );

        // Crawl BusinessWorld
        const result2 = await crawlSource(
            bworldId,
            'https://www.bworldonline.com/',
            'BusinessWorld Online',
            10
        );

        console.log('\n✅ Both crawls complete!');
        console.log(`Power Philippines Job ID: ${result1.jobId} (${result1.crawled} articles)`);
        console.log(`BusinessWorld Job ID: ${result2.jobId} (${result2.crawled} articles)`);
        console.log(`\nNext: Run digest generation with these job IDs`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
