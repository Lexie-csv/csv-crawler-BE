#!/usr/bin/env tsx
/**
 * Crawl BusinessWorld Online
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const bworldId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945';

async function main() {
    try {
        console.log('🚀 Starting BusinessWorld Online crawl (VISIBLE BROWSER)...\n');

        const job = await createCrawlJob(bworldId, {
            maxPages: 10,   // More pages to see browser longer
            maxDepth: 3,    // More depth
            useMultiPage: true
        });

        console.log(`✅ BusinessWorld crawl started!`);
        console.log(`Job ID: ${job.id}`);
        console.log(`\nCrawl is running in the background...`);
        console.log(`Monitor progress in the database or wait for completion.\n`);

        // Keep the process alive for a bit to see initial progress
        await new Promise(r => setTimeout(r, 10000));

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
