#!/usr/bin/env tsx
/**
 * NEA Crawler with Manual Cloudflare Verification
 * 
 * This script opens a visible browser window where you can manually
 * complete the Cloudflare verification. Once done, the crawler continues
 * automatically.
 */

import { chromium } from 'playwright';
import * as readline from 'readline';

async function crawlNeaWithManualVerification() {
    console.log('🚀 Starting NEA crawler with manual verification...\n');

    // Launch browser in HEADED mode (visible)
    const browser = await chromium.launch({
        headless: false, // 🔑 Visible browser window
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    try {
        console.log('📍 Navigating to https://nea.gov.ph/...');
        console.log('👉 A browser window will open. Please complete the Cloudflare verification manually.\n');

        await page.goto('https://nea.gov.ph/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        // Check if Cloudflare challenge is present
        const title = await page.title();
        const bodyText = await page.textContent('body');

        if (bodyText?.includes('Cloudflare') || bodyText?.includes('Just a moment') || title.includes('Just a moment')) {
            console.log('⚠️  Cloudflare challenge detected!');
            console.log('👉 Please complete the verification in the browser window.');
            console.log('⏳ Waiting for you to verify...\n');

            // Wait for user to complete verification
            await waitForUserConfirmation('Press Enter once you have completed the Cloudflare verification...');

            console.log('✅ Continuing crawl...\n');
        } else {
            console.log('✅ No Cloudflare challenge detected!\n');
        }

        // Now the page should be loaded
        await page.waitForTimeout(3000);

        console.log('📄 Page Title:', await page.title());
        console.log('📍 Current URL:', page.url());

        // Look for advisory/issuance links
        console.log('\n🔍 Looking for advisory/issuance links...');

        const advisoryLinks = await page.$$eval('a', (anchors) =>
            anchors
                .filter(a => {
                    const text = a.textContent?.toLowerCase() || '';
                    const href = a.href?.toLowerCase() || '';
                    return text.includes('advisory') ||
                        text.includes('issuance') ||
                        text.includes('circular') ||
                        text.includes('memorandum') ||
                        href.includes('advisory') ||
                        href.includes('issuance');
                })
                .map(a => ({
                    text: (a as HTMLAnchorElement).textContent?.trim(),
                    href: (a as HTMLAnchorElement).href
                }))
        );

        console.log(`\n📋 Found ${advisoryLinks.length} advisory/issuance links:`);
        advisoryLinks.slice(0, 10).forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text}`);
            console.log(`     ${link.href}\n`);
        });

        // Look for PDF links
        const pdfLinks = await page.$$eval('a[href*=".pdf"], a[href*="PDF"]', (anchors) =>
            anchors.map(a => ({
                text: (a as HTMLAnchorElement).textContent?.trim(),
                href: (a as HTMLAnchorElement).href
            }))
        );

        console.log(`\n📄 Found ${pdfLinks.length} PDF links`);
        pdfLinks.slice(0, 5).forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text}`);
            console.log(`     ${link.href}\n`);
        });

        // Save screenshot
        await page.screenshot({ path: 'storage/nea-verified.png', fullPage: true });
        console.log('📸 Screenshot saved to: storage/nea-verified.png\n');

        // Ask if user wants to navigate to advisories page
        const shouldNavigate = await askYesNo('Would you like to navigate to the Advisories page? (y/n): ');

        if (shouldNavigate && advisoryLinks.length > 0) {
            const advisoryLink = advisoryLinks[0].href;
            console.log(`\n📍 Navigating to: ${advisoryLink}`);

            await page.goto(advisoryLink, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });

            await page.waitForTimeout(3000);

            // Get all links on the advisories page
            const pageLinks = await page.$$eval('a', (anchors) =>
                anchors.slice(0, 20).map(a => ({
                    text: (a as HTMLAnchorElement).textContent?.trim().substring(0, 100),
                    href: (a as HTMLAnchorElement).href
                }))
            );

            console.log('\n📋 Links on Advisories page:');
            pageLinks.forEach((link, i) => {
                console.log(`  ${i + 1}. ${link.text}`);
                console.log(`     ${link.href}\n`);
            });

            await page.screenshot({ path: 'storage/nea-advisories.png', fullPage: true });
            console.log('📸 Screenshot saved to: storage/nea-advisories.png\n');
        }

        console.log('✅ Crawl complete! Browser will close in 10 seconds...');
        await page.waitForTimeout(10000);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

function waitForUserConfirmation(prompt: string): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(prompt, () => {
            rl.close();
            resolve();
        });
    });
}

function askYesNo(prompt: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

crawlNeaWithManualVerification();
