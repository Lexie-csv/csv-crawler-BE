#!/usr/bin/env tsx
/**
 * Crawl recent news from Power Philippines and BusinessWorld
 * Focused on articles from the past 2 days
 */

import { createCrawlJob } from './src/services/crawl.service.js';

const powerPhilippinesId = 'e78c1efc-a4c5-4e73-89ed-d3773873a681';
const businessWorldId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945';

async function main() {
    try {
        console.log('🚀 Starting crawls for recent news articles...\n');
        console.log('Target: Articles from the past 2 days (Dec 3-5, 2025)\n');

        // Crawl Power Philippines
        console.log('📰 Crawling Power Philippines...');
        const ppJob = await createCrawlJob(powerPhilippinesId, {
            maxPages: 50,
            maxDepth: 3,
            useMultiPage: true
        });
        console.log(`✓ Power Philippines job started: ${ppJob.id}\n`);

        // Crawl BusinessWorld (December 2025 only)
        console.log('📰 Crawling BusinessWorld (Dec 2025 only)...');
        const bwJob = await createCrawlJob(businessWorldId, {
            maxPages: 50,
            maxDepth: 4,
            useMultiPage: true
        });
        console.log(`✓ BusinessWorld job started: ${bwJob.id}\n`);

        console.log('⏳ Crawls running in background...');
        console.log('   Power Philippines:', ppJob.id);
        console.log('   BusinessWorld:', bwJob.id);
        console.log('\nWait ~60 seconds then check results.');

        // Keep process alive briefly
        await new Promise(r => setTimeout(r, 15000));

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
