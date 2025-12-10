#!/usr/bin/env tsx
/**
 * Generate digest from existing crawled news articles
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '../../.env.local') });

import { digestOrchestrator } from './src/services/digest-orchestration.service.js';
import { query } from '@csv/db';

const powerPhJobId = '2ba2dc39-1574-416a-b418-9058086b2f5b';
const powerPhSourceId = 'e78c1efc-a4c5-4e73-89ed-d3773873a681';

async function main() {
    try {
        console.log('📊 Generating News Intelligence digest...\n');

        // Check document count
        const docs = await query(
            'SELECT COUNT(*) as count FROM documents WHERE crawl_job_id = $1',
            [powerPhJobId]
        );
        console.log(`Found ${docs[0].count} documents from Power Philippines crawl\n`);

        // Generate digest
        const digest = await digestOrchestrator.processAndGenerateDigest(
            powerPhJobId,
            powerPhSourceId
        );

        if (digest) {
            console.log('✅ News Intelligence digest generated!');
            console.log(`Digest ID: ${digest.id}`);
            console.log(`Highlights: ${digest.highlights.length}`);
            console.log(`Datapoints: ${digest.datapoints.length}`);
            console.log(`\nMarkdown file: storage/digests/digest-${powerPhSourceId}-*.md`);
        } else {
            console.log('⚠️ No digest generated (no relevant articles found)');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

main();
