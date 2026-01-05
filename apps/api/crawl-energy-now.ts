#!/usr/bin/env tsx
/**
 * Crawl Energy Now to test prompt template system
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const energyNowId = 'accd6d14-92b9-41e7-a776-8c91a61e1d84';

async function main() {
    try {
        console.log('🚀 Testing Energy Now crawl with CSV Radar News Intelligence Analyst prompt...\n');

        const job = await createCrawlJob(energyNowId, {
            maxPages: 5,
            maxDepth: 2,
            useMultiPage: true
        });

        console.log(`✅ Energy Now crawl started!`);
        console.log(`Job ID: ${job.id}`);
        console.log(`\nCrawl is running in the background...\n`);

        await new Promise(r => setTimeout(r, 10000));
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
