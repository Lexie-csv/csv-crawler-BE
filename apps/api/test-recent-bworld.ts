#!/usr/bin/env tsx

import { query, queryOne } from '@csv/db';
import { createMultiPageCrawler } from './src/services/multi-page-crawler.service.js';

async function testBusinessWorldCrawl() {
    try {
        console.log('🔍 Fetching BusinessWorld source config...');

        const source = await queryOne<any>(
            'SELECT id, name, url, crawler_config FROM sources WHERE id = $1',
            ['ad6b097f-befe-4ef9-8e9f-715d3a3c2945']
        );

        if (!source) {
            throw new Error('BusinessWorld source not found');
        }

        console.log('✓ Source:', source.name);
        console.log('✓ Config:', JSON.stringify(source.crawler_config, null, 2));

        const config = {
            baseUrl: source.url,
            maxDepth: 6,
            maxPages: 20,
        };

        console.log('\n🚀 Starting crawl from /corporate/ page...');
        const crawler = createMultiPageCrawler(config, source.crawler_config);
        const job = await crawler.crawlSource(source.id, 'https://www.bworldonline.com/corporate/');

        console.log('\n✅ Crawl complete!');
        console.log('Job ID:', job.id);
        console.log('Pages crawled:', job.pages_crawled);
        console.log('Items found:', job.items_crawled);

        // Check what articles were found
        console.log('\n📰 Recent articles crawled:');
        const articles = await query(
            `SELECT title, url, created_at 
             FROM documents 
             WHERE crawl_job_id = $1 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [job.id]
        );

        articles.forEach((article: any, idx: number) => {
            console.log(`${idx + 1}. ${article.title}`);
            console.log(`   ${article.url}`);
        });

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testBusinessWorldCrawl();
