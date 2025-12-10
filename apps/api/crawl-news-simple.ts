#!/usr/bin/env tsx
/**
 * Simple script to crawl news sources sequentially
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const sources = [
    { id: 'e78c1efc-a4c5-4e73-89ed-d3773873a681', name: 'Power Philippines' },
    { id: 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945', name: 'BusinessWorld Online' }
];

async function main() {
    for (const source of sources) {
        console.log(`\n📰 Starting crawl for ${source.name}...`);

        const job = await createCrawlJob(source.id, {
            maxPages: 10,
            useMultiPage: true
        });

        console.log(`✅ Crawl job created: ${job.id}`);
        console.log(`⏳ Waiting for crawl to complete (this runs in background)...\n`);

        // Wait 3 minutes for crawl to complete
        await new Promise(r => setTimeout(r, 180000));
    }

    console.log('\n✅ All crawls initiated. Check database for results.');
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
