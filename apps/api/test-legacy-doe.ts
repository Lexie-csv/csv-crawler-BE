#!/usr/bin/env tsx
/**
 * Test legacy DOE ERC page - should have PDF links
 */

import { chromium } from 'playwright';

async function testLegacyDoeErc() {
    console.log('🔍 Testing Legacy DOE ERC page...\n');

    const browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    try {
        console.log('📍 Navigating to legacy DOE ERC page...');

        const response = await page.goto('https://legacy.doe.gov.ph/energy-information-resources?q=electric-power/coe-erc', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        console.log(`✅ Page loaded! Status: ${response?.status()}`);
        console.log(`📄 Title: ${await page.title()}`);

        await page.waitForTimeout(3000);

        // Look for PDF links
        const pdfLinks = await page.$$eval('a[href*=".pdf"], a[href*="PDF"]', (anchors) =>
            anchors.map(a => ({
                text: (a as HTMLAnchorElement).textContent?.trim().substring(0, 100),
                href: (a as HTMLAnchorElement).href
            }))
        );

        console.log(`\n📄 Found ${pdfLinks.length} PDF links:`);
        pdfLinks.slice(0, 10).forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text}`);
            console.log(`     ${link.href}\n`);
        });

        // Also check for file download links
        const fileLinks = await page.$$eval('a[href*="/files/"], a.file', (anchors) =>
            anchors.map(a => ({
                text: (a as HTMLAnchorElement).textContent?.trim().substring(0, 100),
                href: (a as HTMLAnchorElement).href
            }))
        );

        console.log(`\n📁 Found ${fileLinks.length} file links:`);
        fileLinks.slice(0, 5).forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text}`);
            console.log(`     ${link.href}\n`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

testLegacyDoeErc();
