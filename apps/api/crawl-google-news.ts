#!/usr/bin/env tsx
/**
 * Crawl Google News PH to test prompt template system
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const googleNewsId = 'f1e4aa1c-6c33-42ad-bed7-f3432b2485ea';

async function main() {
    try {
        console.log('🚀 Testing Google News PH crawl with CSV Radar News Intelligence Analyst prompt...\n');

        const job = await createCrawlJob(googleNewsId, {
            maxPages: 5,    // Test with 5 pages
            maxDepth: 2,
            useMultiPage: true
        });

        console.log(`✅ Google News PH crawl started!`);
        console.log(`Job ID: ${job.id}`);
        console.log(`\nThis will test:`);
        console.log(`  - Source type 'news' → 'news_article' template`);
        console.log(`  - CSV Radar News Intelligence Analyst prompt`);
        console.log(`  - gpt-4o-mini model`);
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
