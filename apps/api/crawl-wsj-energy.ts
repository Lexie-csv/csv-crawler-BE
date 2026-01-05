#!/usr/bin/env tsx
/**
 * Crawl WSJ Energy section to test prompt template system
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const wsjEnergyId = 'c08c15e7-1701-4366-aaf7-6fb3e1971c3a';

async function main() {
    try {
        console.log('🚀 Testing WSJ Energy crawl with CSV Radar News Intelligence Analyst prompt...\n');

        const job = await createCrawlJob(wsjEnergyId, {
            maxPages: 30,
            maxDepth: 3,
            useMultiPage: true
        });

        console.log(`✅ WSJ Energy crawl started!`);
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
