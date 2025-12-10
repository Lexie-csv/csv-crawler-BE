#!/usr/bin/env tsx
/**
 * Test downloading a PDF from legacy DOE
 */

import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testPdfDownload() {
    console.log('🔍 Testing PDF download from legacy DOE...\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox'],
    });

    const context = await browser.newContext({
        acceptDownloads: true,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });

    const page = await context.newPage();

    try {
        console.log('📍 Navigating to legacy DOE ERC page...');

        await page.goto('https://legacy.doe.gov.ph/energy-information-resources?q=electric-power/coe-erc', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        console.log('✅ Page loaded!');
        await page.waitForTimeout(2000);

        // Find first PDF link
        const firstPdfLink = await page.$eval('a[href*=".pdf"]', (a) => ({
            text: (a as HTMLAnchorElement).textContent?.trim(),
            href: (a as HTMLAnchorElement).href,
        }));

        console.log(`\n📄 Found PDF: ${firstPdfLink.text}`);
        console.log(`🔗 URL: ${firstPdfLink.href}\n`);

        // Create downloads directory
        const downloadDir = path.join(process.cwd(), 'storage', 'test-downloads');
        await fs.mkdir(downloadDir, { recursive: true });

        // Set up download listener
        const downloadPromise = page.waitForEvent('download');

        // Click the PDF link
        console.log('⬇️  Clicking to download...');
        await page.click('a[href*=".pdf"]');

        // Wait for download
        const download = await downloadPromise;
        const fileName = download.suggestedFilename();
        const savePath = path.join(downloadDir, fileName);

        console.log(`💾 Saving to: ${savePath}`);
        await download.saveAs(savePath);

        // Check file size
        const stats = await fs.stat(savePath);
        console.log(`✅ Download complete! Size: ${(stats.size / 1024).toFixed(2)} KB`);

        // Try to parse PDF
        console.log('\n📖 Parsing PDF...');
        const dataBuffer = await fs.readFile(savePath);

        // Use PDFParse from pdf-parse
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();

        console.log(`📄 Pages: ${textResult.pages.length}`);
        console.log(`📝 Text length: ${textResult.text.length} characters`);
        console.log(`\n📋 First 500 characters:\n`);
        console.log(textResult.text.substring(0, 500));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

testPdfDownload();
