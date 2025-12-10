#!/usr/bin/env tsx
/**
 * Generate combined News Intelligence digest from Power Philippines and BusinessWorld
 */

import { digestOrchestrator } from './src/services/digest-orchestration.service.js';
import { query } from '@csv/db';

const powerPhJobId = '2ba2dc39-1574-416a-b418-9058086b2f5b';
const powerPhSourceId = 'e78c1efc-a4c5-4e73-89ed-d3773873a681';

async function main() {
    try {
        console.log('📊 Generating combined News Intelligence digest...\n');

        // Count documents from both sources
        const powerPhCount = await query(
            'SELECT COUNT(*) as count FROM documents WHERE source_id = $1',
            [powerPhSourceId]
        );
        console.log(`Power Philippines documents: ${powerPhCount[0].count}`);

        // Generate digest from Power Philippines (the one with actual articles)
        console.log('\n🔄 Processing Power Philippines articles...\n');
        const digest = await digestOrchestrator.processAndGenerateDigest(
            powerPhJobId,
            powerPhSourceId
        );

        if (digest) {
            console.log('\n✅ News Intelligence digest generated!');
            console.log(`Digest ID: ${digest.id}`);
            console.log(`Highlights: ${digest.highlights.length}`);
            console.log(`Datapoints: ${digest.datapoints.length}`);
            console.log(`\nMarkdown file: storage/digests/digest-${powerPhSourceId}-*.md`);
        } else {
            console.log('\n⚠️ No digest generated (no relevant articles found)');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
