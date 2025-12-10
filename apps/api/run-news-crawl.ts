#!/usr/bin/env tsx
/**
 * Crawl news sources and generate digest
 */

import { createCrawlJob } from './src/services/crawl.service.js';
import { digestOrchestrator } from './src/services/digest-orchestration.service.js';
import { query } from '@csv/db';

const powerPhId = 'e78c1efc-a4c5-4e73-89ed-d3773873a681';
const bworldId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945';

async function main() {
    try {
        console.log('🚀 Starting news source crawls...\n');

        // Crawl Power Philippines
        console.log('📰 Crawling Power Philippines...');
        const powerPhJob = await createCrawlJob(powerPhId, {
            maxPages: 15,
            useMultiPage: true
        });
        console.log(`✅ Power Philippines Job ID: ${powerPhJob.id}\n`);

        // Wait a bit for the crawl to process
        await new Promise(r => setTimeout(r, 30000)); // 30 seconds

        // Crawl BusinessWorld
        console.log('📰 Crawling BusinessWorld...');
        const bworldJob = await createCrawlJob(bworldId, {
            maxPages: 15,
            useMultiPage: true
        });
        console.log(`✅ BusinessWorld Job ID: ${bworldJob.id}\n`);

        // Wait for both crawls to complete
        console.log('⏳ Waiting for crawls to complete (60 seconds)...\n');
        await new Promise(r => setTimeout(r, 60000));

        // Check results
        const powerPhDocs = await query(
            'SELECT COUNT(*) as count FROM documents WHERE crawl_job_id = $1',
            [powerPhJob.id]
        );
        console.log(`Power Philippines: ${powerPhDocs[0].count} documents\n`);

        const bworldDocs = await query(
            'SELECT COUNT(*) as count FROM documents WHERE crawl_job_id = $1',
            [bworldJob.id]
        );
        console.log(`BusinessWorld: ${bworldDocs[0].count} documents\n`);

        // Generate combined digest
        console.log('📊 Generating News Intelligence digest...\n');

        // Use Power Philippines job for the digest (it will pull from both sources)
        const digest = await digestOrchestrator.processAndGenerateDigest(
            powerPhJob.id,
            powerPhId
        );

        if (digest) {
            console.log('✅ News Intelligence digest generated!');
            console.log(`Digest ID: ${digest.id}`);
            console.log(`Highlights: ${digest.highlights.length}`);
            console.log(`Datapoints: ${digest.datapoints.length}`);
            console.log(`\nMarkdown saved to: storage/digests/digest-${powerPhId}-*.md`);
        } else {
            console.log('⚠️ No digest generated (no relevant articles found)');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
