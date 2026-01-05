#!/usr/bin/env tsx
/**
 * Crawl The Guardian Energy section to test prompt template system
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const guardianEnergyId = 'd0a32cde-142f-46cd-b11f-5610ba700b0b';

async function main() {
    try {
        console.log('� Testing The Guardian Energy crawl with CSV Radar News Intelligence Analyst prompt...\n');

        const job = await createCrawlJob(guardianEnergyId, {
            maxPages: 30,
            maxDepth: 3,
            useMultiPage: true
        });

        console.log(`✅ The Guardian Energy crawl started!`);
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
