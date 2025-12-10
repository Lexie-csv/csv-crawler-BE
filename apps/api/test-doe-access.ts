#!/usr/bin/env tsx
/**
 * Quick test script to verify DOE site accessibility
 */

import { chromium } from 'playwright';

async function testDoeAccess() {
    console.log('🔍 Testing DOE site access...\n');

    const browser = await chromium.launch({
        headless: false, // Run in headed mode to see what happens
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
        ],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    try {
        console.log('📍 Navigating to https://doe.gov.ph/');

        const response = await page.goto('https://doe.gov.ph/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000, // 60 seconds
        });

        console.log(`✅ Page loaded! Status: ${response?.status()}`);
        console.log(`📄 Title: ${await page.title()}`);

        // Wait a bit
        await page.waitForTimeout(3000);

        // Try to find links
        const links = await page.$$eval('a', (anchors) =>
            anchors.slice(0, 10).map(a => ({
                text: a.textContent?.trim().substring(0, 50),
                href: a.href
            }))
        );

        console.log('\n📎 First 10 links found:');
        links.forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text} -> ${link.href}`);
        });

        // Look for PDF links
        const pdfLinks = await page.$$eval('a[href*=".pdf"]', (anchors) =>
            anchors.map(a => ({
                text: (a as HTMLAnchorElement).textContent?.trim(),
                href: (a as HTMLAnchorElement).href
            }))
        );

        console.log(`\n📄 Found ${pdfLinks.length} PDF links`);
        pdfLinks.slice(0, 5).forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text} -> ${link.href}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

testDoeAccess();
