/**
 * Test the crawler service directly
 */
import { crawlUrl } from './apps/api/src/services/crawler.service.js';

const testUrl = process.argv[2] || 'https://www.sec.gov.ph/advisories/';

console.log(`🔍 Testing crawler service on: ${testUrl}\n`);

async function test() {
    try {
        const result = await crawlUrl(testUrl);
        
        console.log('\n📊 CRAWL RESULTS:\n');
        console.log('━'.repeat(60));
        console.log(`📄 Title: ${result.title || 'No title'}`);
        console.log(`🔗 URL: ${result.url}`);
        console.log(`📏 Content Length: ${result.contentText?.length || 0} characters`);
        console.log(`🔗 Links Found: ${result.links?.length || 0}`);
        
        if (result.links && result.links.length > 0) {
            console.log('\n🔗 First 10 Links:');
            result.links.slice(0, 10).forEach((link, i) => {
                console.log(`   ${i + 1}. ${link.text || '(no text)'}`);
                console.log(`      → ${link.url.substring(0, 80)}${link.url.length > 80 ? '...' : ''}`);
            });
        }
        
        if (result.contentText) {
            console.log('\n📝 Content Preview (first 500 chars):');
            console.log(result.contentText.substring(0, 500) + '...');
        }
        
        console.log('\n━'.repeat(60));
        console.log('✅ Crawl successful!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

test();
