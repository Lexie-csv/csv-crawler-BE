#!/usr/bin/env node
/**
 * Test digest generation with new normalized tables
 * This will test that highlights and datapoints are properly inserted into the new tables
 */

import { digestOrchestrator } from './src/services/digest-orchestration.service.js';

const jobId = '2b8fecb7-bc78-4ef5-ae75-66ec7ef343cd'; // Has 7 documents
const sourceId = 'ad6b097f-befe-4ef9-8e9f-715d3a3c2945'; // BusinessWorld

console.log('🧪 Testing digest generation with normalized tables...');
console.log(`Job ID: ${jobId}`);
console.log(`Source ID: ${sourceId}`);
console.log('---');

digestOrchestrator.processAndGenerateDigest(jobId, sourceId)
    .then(digest => {
        if (digest) {
            console.log('\n✅ Digest generated successfully!');
            console.log(`Digest ID: ${digest.id}`);
            console.log(`Highlights: ${digest.highlights?.length || 0} (JSONB)`);
            console.log(`Datapoints: ${digest.datapoints?.length || 0} (JSONB)`);
            console.log('\n📊 Next: Check database for normalized data...');
            console.log(`Query highlights: SELECT COUNT(*) FROM digest_highlights WHERE digest_id = '${digest.id}';`);
            console.log(`Query datapoints: SELECT COUNT(*) FROM digest_datapoints WHERE digest_id = '${digest.id}';`);
        } else {
            console.log('⚠️ No digest generated');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    });
