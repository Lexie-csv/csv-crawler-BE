import { digestOrchestrator } from './src/services/digest-orchestration.service';

const jobId = '663833c9-bb4b-4d02-ac3f-adc88745ee2d'; // Using first crawl with documents
const sourceId = '93498e3f-38b0-498f-bcd9-a3f7027a6ed0';

console.log('Starting digest generation with custom DOE Laws prompt...');
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);

digestOrchestrator.processAndGenerateDigest(jobId, sourceId)
    .then(digest => {
        if (digest) {
            console.log('\n✓✓✓ Digest generated successfully! ✓✓✓');
            console.log('Digest ID:', digest.id);
            console.log('Highlights:', digest.highlights.length);
            console.log('Datapoints:', digest.datapoints.length);
            console.log('\nFirst few highlights:');
            digest.highlights.slice(0, 3).forEach((h, i) => {
                console.log(`${i + 1}. [${h.category}] ${h.title}`);
            });
        } else {
            console.log('⚠️ No digest generated');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    });
