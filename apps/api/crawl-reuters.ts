#!/usr/bin/env tsx
/**
 * Crawl Asian Power to test prompt template system
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const asianPowerId = 'f21d1de4-47a7-476e-8b10-16b91ebc2986';

async function main() {
    try {
        console.log('🚀 Testing Asian Power crawl with CSV Radar News Intelligence Analyst prompt...\n');

        const job = await createCrawlJob(asianPowerId, {
            maxPages: 5,    // Test with 5 pages
            maxDepth: 2,
            useMultiPage: true
        });

        console.log(`✅ Asian Power crawl started!`);
        console.log(`Job ID: ${job.id}`);
        console.log(`\nThis will test:`);
        console.log(`  - Source type 'news' → 'news_article' template`);
        console.log(`  - CSV Radar News Intelligence Analyst prompt`);
        console.log(`  - gpt-4o-mini model (fixed from gpt-4-turbo)`);
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
