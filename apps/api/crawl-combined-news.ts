#!/usr/bin/env tsx
/**
 * Crawl Reuters and BusinessWorld, then generate combined CSV Market Intelligence Newsletter
 */

import { createCrawlJob } from './src/services/crawl.service.js';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler'
});

const reutersId = 'f21d1de4-47a7-476e-8b10-16b91ebc2986';
const bworldId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945';

async function main() {
    try {
        console.log('🚀 CSV Market Intelligence Newsletter - Combined Crawl\n');
        console.log('Date:', new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Crawl BusinessWorld
        console.log('📰 [1/2] Crawling BusinessWorld Online...');
        const bworldJob = await createCrawlJob(bworldId, {
            maxPages: 10,
            maxDepth: 2,
            useMultiPage: true
        });
        console.log(`   ✓ Job ID: ${bworldJob.id}`);
        
        // Crawl Reuters
        console.log('\n📰 [2/2] Crawling Reuters...');
        const reutersJob = await createCrawlJob(reutersId, {
            maxPages: 10,
            maxDepth: 2,
            useMultiPage: true
        });
        console.log(`   ✓ Job ID: ${reutersJob.id}`);

        console.log('\n⏳ Waiting for crawls to complete...');
        console.log('   This may take 30-60 seconds...\n');

        // Wait for both jobs to complete
        let bworldDone = false;
        let reutersDone = false;
        let attempts = 0;
        const maxAttempts = 60;

        while ((!bworldDone || !reutersDone) && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;

            if (!bworldDone) {
                const result = await pool.query(
                    'SELECT status, pages_crawled FROM crawl_jobs WHERE id = $1',
                    [bworldJob.id]
                );
                if (result.rows[0]?.status === 'done') {
                    bworldDone = true;
                    console.log(`   ✅ BusinessWorld complete (${result.rows[0].pages_crawled} pages)`);
                }
            }

            if (!reutersDone) {
                const result = await pool.query(
                    'SELECT status, pages_crawled FROM crawl_jobs WHERE id = $1',
                    [reutersJob.id]
                );
                if (result.rows[0]?.status === 'done') {
                    reutersDone = true;
                    console.log(`   ✅ Reuters complete (${result.rows[0].pages_crawled} pages)`);
                }
            }
        }

        if (!bworldDone || !reutersDone) {
            console.log('\n⚠️  Crawls taking longer than expected. Check database for status.');
            console.log(`   BusinessWorld: ${bworldDone ? 'DONE' : 'RUNNING'}`);
            console.log(`   Reuters: ${reutersDone ? 'DONE' : 'RUNNING'}`);
        }

        console.log('\n📊 Combined crawl job IDs for digest generation:');
        console.log(`   BusinessWorld: ${bworldJob.id}`);
        console.log(`   Reuters: ${reutersJob.id}`);
        console.log('\n✅ Crawls initiated! Digests will be generated automatically.\n');

        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

main();
