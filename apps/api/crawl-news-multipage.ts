#!/usr/bin/env tsx
/**
 * Crawl news sources using the multi-page crawler
 */

import { createMultiPageCrawler } from './src/services/multi-page-crawler.service.js';
import { query } from '@csv/db';

const powerPhId = 'e78c1efc-a4c5-4e73-89ed-d3773873a681';
const bworldId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945';

async function crawlNewsSources() {
    console.log('🚀 Starting news crawls with multi-page crawler...\n');

    // Crawl Power Philippines
    console.log('📰 Crawling Power Philippines...');
    const powerPhCrawler = createMultiPageCrawler({
        sourceId: powerPhId,
        startUrl: 'https://powerphilippines.com/',
        maxPages: 15,
        followLinks: true,
        respectRobotsTxt: true,
    });

    const powerPhJob = await powerPhCrawler.crawl();
    console.log(`✅ Power Philippines complete!`);
    console.log(`   Job ID: ${powerPhJob.id}`);
    console.log(`   Pages crawled: ${powerPhJob.pages_crawled || 0}\n`);

    // Check documents
    const powerPhDocs = await query(
        'SELECT COUNT(*) as count FROM documents WHERE crawl_job_id = $1',
        [powerPhJob.id]
    );
    console.log(`   Documents saved: ${powerPhDocs.rows[0].count}\n`);

    // Crawl BusinessWorld
    console.log('📰 Crawling BusinessWorld...');
    const bworldCrawler = createMultiPageCrawler({
        sourceId: bworldId,
        startUrl: 'https://www.bworldonline.com/',
        maxPages: 15,
        followLinks: true,
        respectRobotsTxt: true,
    });

    const bworldJob = await bworldCrawler.crawl();
    console.log(`✅ BusinessWorld complete!`);
    console.log(`   Job ID: ${bworldJob.id}`);
    console.log(`   Pages crawled: ${bworldJob.pages_crawled || 0}\n`);

    // Check documents
    const bworldDocs = await query(
        'SELECT COUNT(*) as count FROM documents WHERE crawl_job_id = $1',
        [bworldJob.id]
    );
    console.log(`   Documents saved: ${bworldDocs.rows[0].count}\n`);

    console.log('✅ All news crawls complete!');
    console.log(`\nNext step: Generate digest from these job IDs:`);
    console.log(`  Power Philippines: ${powerPhJob.id}`);
    console.log(`  BusinessWorld: ${bworldJob.id}`);

    process.exit(0);
}

crawlNewsSources().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
