#!/usr/bin/env tsx
/**
 * Generate BusinessWorld digest
 */

import { digestOrchestrator } from './src/services/digest-orchestration.service.js';

const jobId = '35567cdd-89ef-4711-8a6b-2bee2a1ccd5f';
const sourceId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945';

async function main() {
    try {
        console.log('🔄 Generating BusinessWorld digest...\n');

        const digest = await digestOrchestrator.processAndGenerateDigest(jobId, sourceId);

        if (digest) {
            console.log('\n✅ BusinessWorld digest generated!');
            console.log('Digest ID:', digest.id);
            console.log('Highlights:', digest.highlights.length);
            console.log('Datapoints:', digest.datapoints.length);
            console.log('Summary path:', digest.summaryMarkdownPath);
        } else {
            console.log('⚠️ No digest generated');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
