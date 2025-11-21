/**
 * Simple test script to crawl a URL and extract data
 * Run with: node test-crawl.js <URL>
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const testUrl = process.argv[2] || 'https://www.sec.gov.ph/advisories/';

console.log(`🔍 Testing crawl for: ${testUrl}\n`);

async function crawlPage(url) {
    try {
        console.log('📡 Fetching page...');
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CSV-Crawler/1.0)',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        console.log(`✅ Downloaded ${html.length} bytes\n`);

        console.log('🔍 Parsing HTML...');
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract basic info
        const title = document.querySelector('title')?.textContent?.trim() || 'No title';
        const h1 = document.querySelector('h1')?.textContent?.trim() || 'No H1';
        
        // Find all links
        const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({
                text: a.textContent?.trim(),
                href: a.href,
            }))
            .filter(link => link.href && link.text)
            .slice(0, 10); // First 10 links

        // Find all headings
        const headings = Array.from(document.querySelectorAll('h2, h3, h4'))
            .map(h => h.textContent?.trim())
            .filter(Boolean)
            .slice(0, 5);

        // Find paragraphs with dates or numbers (potential datapoints)
        const paragraphs = Array.from(document.querySelectorAll('p, div.content, article'))
            .map(p => p.textContent?.trim())
            .filter(text => text && (
                /\d{4}/.test(text) || // Has year
                /\d+%/.test(text) ||   // Has percentage
                /\$\d+/.test(text) ||  // Has dollar amount
                /₱\d+/.test(text)      // Has peso amount
            ))
            .slice(0, 5);

        console.log('\n📊 EXTRACTION RESULTS:\n');
        console.log('━'.repeat(60));
        console.log(`📄 Page Title: ${title}`);
        console.log(`📌 Main Heading: ${h1}`);
        console.log('\n🔗 Links Found:', links.length > 0 ? '' : 'None');
        links.forEach((link, i) => {
            console.log(`   ${i + 1}. ${link.text}`);
            console.log(`      → ${link.href.substring(0, 80)}${link.href.length > 80 ? '...' : ''}`);
        });

        console.log('\n📑 Headings:');
        headings.forEach((heading, i) => {
            console.log(`   ${i + 1}. ${heading.substring(0, 80)}${heading.length > 80 ? '...' : ''}`);
        });

        console.log('\n💰 Potential Datapoints (text with numbers/dates):');
        if (paragraphs.length === 0) {
            console.log('   None found');
        } else {
            paragraphs.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.substring(0, 100)}${p.length > 100 ? '...' : ''}`);
            });
        }

        console.log('\n━'.repeat(60));
        console.log('\n✅ Crawl test complete!');
        console.log(`\n💡 This URL is ${links.length > 5 ? 'GOOD' : 'LIMITED'} for multi-page crawling`);
        console.log(`   - Found ${links.length} internal links`);
        console.log(`   - Found ${paragraphs.length} potential datapoints`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

crawlPage(testUrl);
