#!/usr/bin/env tsx
/**
 * Crawl Energy Live News to test prompt template system
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const energyLiveNewsId = '49a7e947-d044-49da-8d7c-d365a2efeabe';

async function main() {
    try {
        console.log('🚀 Testing Energy Live News crawl with CSV Radar News Intelligence Analyst prompt...\n');

        const job = await createCrawlJob(energyLiveNewsId, {
            maxPages: 5,    // Test with 5 pages
            maxDepth: 2,
            useMultiPage: true
        });

        console.log(`✅ Energy Live News crawl started!`);
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
