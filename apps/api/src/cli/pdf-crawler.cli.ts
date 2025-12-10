#!/usr/bin/env tsx
/**
 * PDF RPA Crawler CLI
 * 
 * Usage:
 *   pnpm crawl-pdf --source DOE-main
 *   pnpm crawl-pdf --source DOE-legacy-ERC
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { Command } from 'commander';
import { PdfRpaCrawler } from '../services/pdf-rpa-crawler.js';
import PdfLlmProcessor from '../services/pdf-llm-processor.service.js';
import * as pdfParse from 'pdf-parse';
import type { PdfSourceConfig } from '@csv/types';

// Ensure we load the apps/api/.env even if CLI is run from repo root
const explicitEnvPath = path.resolve(process.cwd(), 'apps', 'api', '.env');
if (fs.existsSync(explicitEnvPath)) {
    // load explicitly to be sure (dotenv/config above will handle common cases)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config({ path: explicitEnvPath });
}

// Runtime check for the key (non-sensitive)
if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not found. LLM extraction (--use-llm) will be skipped. Add apps/api/.env or export OPENAI_API_KEY in your shell.');
} else {
    // do NOT print the key; just confirm presence
    console.log('✅ OPENAI_API_KEY loaded');
}

// Define source configurations
const SOURCE_CONFIGS: Record<string, PdfSourceConfig> = {
    'DOE-main': {
        name: 'DOE-main',
        startUrl: 'https://doe.gov.ph/',
        domainAllowlist: ['doe.gov.ph'],
        downloadDir: './storage/downloads/doe-main',
        maxDepth: 2,
        maxPages: 50,
        pdfLinkSelectorHints: [
            'a[href$=".pdf"]',
            'a[href$=".PDF"]',
            'a:has-text("PDF")',
            'a:has-text("Download")',
        ],
        scrollToBottom: true,
        headless: true,
        analyzeHtml: true,  // Enable HTML extraction
    },
    'DOE-legacy-ERC': {
        name: 'DOE-legacy-ERC',
        startUrl: 'https://legacy.doe.gov.ph/energy-information-resources?q=electric-power/coe-erc',
        domainAllowlist: ['legacy.doe.gov.ph', 'doe.gov.ph'],
        downloadDir: './storage/downloads/doe-legacy-erc',
        maxDepth: 2,
        maxPages: 30,
        pdfLinkSelectorHints: [
            'a[href$=".pdf"]',
            'a[href$=".PDF"]',
        ],
        scrollToBottom: true,
        headless: true,
        analyzeHtml: true,  // Enable HTML extraction
    },
    'DOE-circulars': {
        name: 'DOE-circulars',
        startUrl: 'https://legacy.doe.gov.ph/?q=laws-and-issuances/department-circular',
        domainAllowlist: ['legacy.doe.gov.ph', 'doe.gov.ph'],
        downloadDir: './storage/downloads/doe-circulars',
        maxDepth: 2,
        maxPages: 50,
        pdfLinkSelectorHints: [
            'a[href$=".pdf"]',
            'a[href$=".PDF"]',
            'a[href*=".pdf"]',
            'a[href*="/sites/default/files/pdf"]',
        ],
        scrollToBottom: true,
        headless: true,
        analyzeHtml: true,  // Enable HTML extraction
    },
    'DOE-circulars-test': {
        name: 'DOE-circulars-test',
        startUrl: 'https://legacy.doe.gov.ph/?q=laws-and-issuances/department-circular',
        domainAllowlist: ['legacy.doe.gov.ph', 'doe.gov.ph'],
        downloadDir: './storage/downloads/doe-circulars-test',
        maxDepth: 0,  // Only crawl the start page
        maxPages: 1,   // Only 1 page
        pdfLinkSelectorHints: [
            'a[href$=".pdf"]',
            'a[href$=".PDF"]',
        ],
        scrollToBottom: true,
        headless: true,
        analyzeHtml: true,  // Enable HTML extraction
    },
};

const program = new Command();

program
    .name('crawl-pdf')
    .description('PDF RPA Crawler - Discover, download, and extract policy data from PDFs')
    .version('1.0.0');

program
    .command('crawl')
    .description('Crawl a source and download PDFs')
    .requiredOption('-s, --source <name>', 'Source name (DOE-main, DOE-legacy-ERC)')
    .option('--no-headless', 'Run browser in headed mode (for debugging)')
    .option('--analyze-html', 'Analyze HTML page content in addition to PDFs', false)
    .action(async (options) => {
        const sourceName = options.source;

        if (!SOURCE_CONFIGS[sourceName]) {
            console.error(`❌ Unknown source: ${sourceName}`);
            console.log(`\nAvailable sources:`);
            Object.keys(SOURCE_CONFIGS).forEach(s => console.log(`  - ${s}`));
            process.exit(1);
        }

        const config = { ...SOURCE_CONFIGS[sourceName] };

        // Override headless if flag provided
        if (options.headless === false) {
            config.headless = false;
        }

        // Enable HTML analysis if flag provided
        if (options.analyzeHtml) {
            config.analyzeHtml = true;
            // Set default HTML config if not already configured
            if (!config.htmlConfig) {
                config.htmlConfig = {
                    contentSelector: 'main, article, .content, #content',
                    tableSelector: 'table',
                    announcementSelector: '.announcement, .news-item, .alert',
                    extractMetadata: true,
                    extractTables: true,
                    minTextLength: 200,
                };
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`PDF RPA CRAWLER`);
        console.log(`${'='.repeat(60)}\n`);

        const crawler = new PdfRpaCrawler();

        try {
            const result = await crawler.crawlPdfSource(config);

            // Print summary
            console.log(`\n${'='.repeat(60)}`);
            console.log(`CRAWL SUMMARY`);
            console.log(`${'='.repeat(60)}`);
            console.log(`Source:              ${result.sourceName}`);
            console.log(`Pages visited:       ${result.pagesVisited}`);
            console.log(`PDFs downloaded:     ${result.pdfsDownloaded}`);
            console.log(`PDFs processed:      ${result.pdfsProcessed}`);
            console.log(`Relevant documents:  ${result.relevantDocuments}`);
            if (result.htmlPagesAnalyzed !== undefined) {
                console.log(`HTML pages analyzed: ${result.htmlPagesAnalyzed}`);
                console.log(`Relevant HTML pages: ${result.relevantHtmlPages}`);
            }
            if (result.newDocuments !== undefined || result.updatedDocuments !== undefined) {
                console.log(`\n📊 CHANGE DETECTION:`);
                console.log(`New documents:       ${result.newDocuments || 0}`);
                console.log(`Updated documents:   ${result.updatedDocuments || 0}`);
                console.log(`Unchanged documents: ${result.unchangedDocuments || 0}`);
            }
            console.log(`Errors:              ${result.errors.length}`);
            console.log(`Duration:            ${Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000)}s`);

            if (result.errors.length > 0) {
                console.log(`\n⚠️  Errors encountered:`);
                result.errors.slice(0, 5).forEach(e => {
                    console.log(`   - ${e.url}: ${e.error}`);
                });

                if (result.errors.length > 5) {
                    console.log(`   ... and ${result.errors.length - 5} more`);
                }
            }

            // Save results to JSON
            const resultsDir = './storage/pdf-crawls';
            await fsp.mkdir(resultsDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
            const resultsPath = path.join(resultsDir, `${sourceName}_${timestamp}.json`);

            await fsp.writeFile(resultsPath, JSON.stringify(result, null, 2), 'utf8');

            console.log(`\n💾 Results saved to: ${resultsPath}`);

            if (result.relevantDocuments > 0) {
                console.log(`\n✅ Found ${result.relevantDocuments} relevant policy document(s)!`);
            }

            console.log('');
        } catch (error) {
            console.error(`\n❌ Crawl failed:`, error);
            process.exit(1);
        }
    });

program
    .command('list-sources')
    .description('List available PDF sources')
    .action(() => {
        console.log(`\nAvailable PDF sources:\n`);
        Object.entries(SOURCE_CONFIGS).forEach(([name, config]) => {
            console.log(`📁 ${name}`);
            console.log(`   URL: ${config.startUrl}`);
            console.log(`   Max pages: ${config.maxPages}`);
            console.log(`   Max depth: ${config.maxDepth}`);
            console.log(`   Download dir: ${config.downloadDir}\n`);
        });

        console.log(`\n📋 Available commands:\n`);
        console.log(`   crawl           - Crawl and extract documents`);
        console.log(`   reprocess       - Reprocess failed extractions`);
        console.log(`   export-csv      - Export to CSV`);
        console.log(`   digest          - Generate briefing digest`);
        console.log(`   changes         - View document changes`);
        console.log(`   versions        - View version history`);
        console.log(`   view-results    - View last crawl results\n`);
    });

program
    .command('view-results')
    .description('View results from last crawl')
    .requiredOption('-s, --source <name>', 'Source name')
    .action(async (options) => {
        const resultsDir = './storage/pdf-crawls';

        try {
            const files = await fsp.readdir(resultsDir);
            const sourceFiles = files
                .filter(f => f.startsWith(options.source) && f.endsWith('.json'))
                .sort()
                .reverse();

            if (sourceFiles.length === 0) {
                console.log(`❌ No results found for source: ${options.source}`);
                return;
            }

            const latestFile = sourceFiles[0];
            const filePath = path.join(resultsDir, latestFile);
            const content = await fsp.readFile(filePath, 'utf8');
            const result = JSON.parse(content);

            console.log(`\n📊 Results from: ${latestFile}\n`);
            console.log(`Source:              ${result.sourceName}`);
            console.log(`Pages visited:       ${result.pagesVisited}`);
            console.log(`PDFs downloaded:     ${result.pdfsDownloaded}`);
            console.log(`Relevant documents:  ${result.relevantDocuments}\n`);

            if (result.extractedDocuments && result.extractedDocuments.length > 0) {
                console.log(`Relevant Documents:\n`);
                result.extractedDocuments
                    .filter((d: any) => d.is_relevant)
                    .forEach((doc: any, i: number) => {
                        console.log(`${i + 1}. ${doc.title}`);
                        console.log(`   Category: ${doc.category}`);
                        console.log(`   Issuing body: ${doc.issuing_body}`);
                        console.log(`   Published: ${doc.published_date || 'Unknown'}`);
                        console.log(`   Summary: ${doc.summary.slice(0, 150)}...`);
                        console.log(`   URL: ${doc.source_url}\n`);
                    });
            }
        } catch (error) {
            console.error(`❌ Error reading results:`, error);
        }
    });

// Top-level 'process' command: process downloaded PDFs and optionally run LLM extraction
program
    .command('process')
    .description('Process already-downloaded PDFs and run LLM extraction')
    .requiredOption('-s, --source <name>', 'Source name (DOE-main, DOE-legacy-ERC)')
    .option('--use-llm', 'Use OpenAI LLM for extraction', false)
    .action(async (options) => {
        const sourceName = options.source;

        if (!SOURCE_CONFIGS[sourceName]) {
            console.error(`❌ Unknown source: ${sourceName}`);
            process.exit(1);
        }

        const config = { ...SOURCE_CONFIGS[sourceName] };
        const useLlm = !!options.useLlm;

        console.log(`\nProcessing downloaded PDFs for: ${sourceName} (useLLM=${useLlm})`);

        const processor = new PdfLlmProcessor();
        try {
            const extracted = await processor.processDownloads(config, useLlm);
            console.log(`\nProcessed ${extracted.length} documents.`);
        } catch (err) {
            console.error('❌ Processing failed:', err);
            process.exit(1);
        }
    });

// Top-level reprocess-failed: Re-run LLM extraction only for entries marked Not processed yet
program
    .command('reprocess-failed')
    .description('Re-run LLM extraction only for entries marked Not processed yet in the latest extracted JSON for a source')
    .requiredOption('-s, --source <name>', 'Source name')
    .action(async (options) => {
        const sourceName = options.source;
        if (!SOURCE_CONFIGS[sourceName]) {
            console.error(`❌ Unknown source: ${sourceName}`);
            process.exit(1);
        }

        const resultsDir = './storage/pdf-crawls';
        const files = await fsp.readdir(resultsDir).catch(() => []);
        const extractedFiles = files
            .filter((f: string) => f.startsWith(sourceName) && f.includes('extracted') && f.endsWith('.json'))
            .sort()
            .reverse();

        if (extractedFiles.length === 0) {
            console.log('❌ No extracted files found for source');
            return;
        }

        const latest = extractedFiles[0];
        const latestPath = path.join(resultsDir, latest);
        console.log(`Reprocessing failed entries from: ${latestPath}`);

        const content = await fsp.readFile(latestPath, 'utf8');
        const arr = JSON.parse(content) as any[];
        const toRetry = arr.filter(d => d.reason === 'Not processed yet' || d.reason === 'LLM failed' || !d.summary || d.summary === null);

        if (toRetry.length === 0) {
            console.log('No entries to reprocess.');
            return;
        }

        const processor = new PdfLlmProcessor();
        const results: any[] = [];

        for (const doc of arr) {
            if (!(doc.reason === 'Not processed yet' || doc.reason === 'LLM failed' || !doc.summary || doc.summary === null)) {
                results.push(doc);
                continue;
            }

            try {
                console.log(`\n🔁 Reprocessing: ${doc.title}`);
                const buf = await fsp.readFile(path.join(process.cwd(), doc.file_path)).catch(() => null);
                if (!buf) {
                    console.log(`  ❌ File not found: ${doc.file_path}`);
                    doc.reason = 'File missing';
                    results.push(doc);
                    continue;
                }

                // Use PDFParse class from pdf-parse to extract text (mirrors other services)
                const { PDFParse } = pdfParse as any;
                const parser = new PDFParse({ data: buf } as any);
                const textResult = await parser.getText();
                const text = (textResult && textResult.text) ? textResult.text : '';
                try { await parser.destroy(); } catch { }

                try {
                    const parsedResult = await (processor as any).processText(text, doc.source_url || '', sourceName);
                    if (parsedResult) {
                        const merged = { ...parsedResult, file_path: doc.file_path, raw_text_hash: doc.raw_text_hash };
                        merged.reason = 'Reprocessed';
                        results.push(merged);
                        console.log(`  ✅ Reprocessed: ${merged.title || doc.title}`);
                        continue;
                    }
                } catch (err) {
                    console.error('  ❌ LLM reprocess failed:', err instanceof Error ? err.message : String(err));
                    doc.reason = 'LLM failed';
                    results.push(doc);
                    continue;
                }
            } catch (err) {
                console.error('  ❌ Error reprocessing doc:', err instanceof Error ? err.message : String(err));
                doc.reason = 'Error';
                results.push(doc);
            }
        }

        const outPath = path.join(resultsDir, `${sourceName}_reprocessed_${new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')}.json`);
        await fsp.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
        console.log(`\n💾 Reprocessed results saved: ${outPath}`);
    });

// Top-level export-csv: export latest reprocessed JSON -> CSV
program
    .command('export-csv')
    .description('Export latest reprocessed JSON for a source to CSV (includes PDF and HTML content)')
    .requiredOption('-s, --source <name>', 'Source name (e.g., DOE-legacy-ERC, DOE-circulars_ocr)')
    .option('--all', 'Export all records including non-relevant ones', false)
    .action(async (options) => {
        const sourceName = options.source;

        const resultsDir = './storage/pdf-crawls';
        const outDir = './storage/exports';
        await fsp.mkdir(outDir, { recursive: true }).catch(() => { });

        const files = await fsp.readdir(resultsDir).catch(() => []);

        // Find reprocessed files (PDF OCR data)
        const reprocessedFiles = files
            .filter((f: string) => f.startsWith(sourceName.replace(/_ocr$/, '')) && f.includes('reprocessed') && f.endsWith('.json'))
            .sort()
            .reverse();

        // Find crawl result files (may contain HTML data)
        const crawlResultFiles = files
            .filter((f: string) => f.startsWith(sourceName.replace(/_ocr$/, '')) && !f.includes('reprocessed') && !f.includes('extracted') && f.endsWith('.json'))
            .sort()
            .reverse();

        let pdfDocuments: any[] = [];
        let htmlDocuments: any[] = [];

        // Load PDF documents from reprocessed files
        if (reprocessedFiles.length > 0) {
            const latest = reprocessedFiles[0];
            const latestPath = path.join(resultsDir, latest);
            console.log(`Loading PDF data: ${latestPath}`);
            const content = await fsp.readFile(latestPath, 'utf8');
            const data = JSON.parse(content);
            pdfDocuments = Array.isArray(data) ? data : (data.results || []);
        }

        // Load HTML documents from crawl result files
        if (crawlResultFiles.length > 0) {
            const latest = crawlResultFiles[0];
            const latestPath = path.join(resultsDir, latest);
            console.log(`Loading HTML data: ${latestPath}`);
            try {
                const content = await fsp.readFile(latestPath, 'utf8');
                const crawlResult = JSON.parse(content);
                if (crawlResult.extractedHtmlContent && Array.isArray(crawlResult.extractedHtmlContent)) {
                    htmlDocuments = crawlResult.extractedHtmlContent;
                    console.log(`  Found ${htmlDocuments.length} HTML documents`);
                }
            } catch (e) {
                console.log(`  No HTML content found in crawl results`);
            }
        }

        // Combine PDF and HTML documents
        const allDocuments = [...pdfDocuments, ...htmlDocuments];

        // Deduplicate based on title (case-insensitive)
        const seen = new Map<string, any>();
        const deduplicatedDocuments = allDocuments.filter(d => {
            const normalizedTitle = (d.title || '').toLowerCase().trim();
            if (!normalizedTitle || seen.has(normalizedTitle)) {
                return false;
            }
            seen.set(normalizedTitle, d);
            return true;
        });

        if (deduplicatedDocuments.length === 0) {
            console.log('❌ No documents found for source');
            return;
        }

        console.log(`Deduplicated: ${allDocuments.length} → ${deduplicatedDocuments.length} documents`);

        // filter relevant (default) or include all if --all flag
        const toExport = options.all ? deduplicatedDocuments : deduplicatedDocuments.filter(d => d.relevant === true || d.is_relevant === true);

        console.log(`Exporting ${toExport.length} documents (${pdfDocuments.length} PDFs + ${htmlDocuments.filter(d => options.all || d.is_relevant).length} HTML pages)`);

        const csvRows: string[] = [];
        const headers = ['source_name', 'content_type', 'file_path', 'source_url', 'relevance', 'type_or_category', 'title', 'issuing_body', 'effective_date_or_published_date', 'summary', 'topics_flattened', 'key_numbers_flattened'];
        csvRows.push(headers.join(','));

        const escape = (v: any) => {
            if (v === null || v === undefined) return '""';
            let s = String(v);
            s = s.replace(/"/g, '""');
            return `"${s}"`;
        };

        const flattenTopics = (doc: any) => {
            if (Array.isArray(doc.topics) && doc.topics.length) {
                return doc.topics.join('; ');
            }
            return '';
        };

        const flattenKeyNumbers = (doc: any) => {
            if (Array.isArray(doc.key_numbers) && doc.key_numbers.length) {
                return doc.key_numbers.map((k: any) => `${k.name}=${k.value}${k.unit ? ' ' + k.unit : ''}`).join('; ');
            }
            if (Array.isArray(doc.key_points) && doc.key_points.length) {
                return doc.key_points.join('; ');
            }
            if (Array.isArray(doc.procurement_activities) && doc.procurement_activities.length) {
                return doc.procurement_activities.map((p: any) => `${p.activity || p.title || 'item'}=${p.estimated_budget ?? p.contract_cost ?? ''}`).join('; ');
            }
            if (Array.isArray(doc.procurement_details) && doc.procurement_details.length) {
                return doc.procurement_details.map((p: any) => `${p.title || p.item || 'item'}=${p.contract_cost ?? ''}`).join('; ');
            }
            return '';
        };

        for (const doc of toExport) {
            const source_name = sourceName;
            const content_type = doc.content_type || (doc.file_path ? 'pdf' : 'html');
            const file_path = doc.file_path || '';
            const source_url = doc.source_url || doc.source || '';
            const relevance = (doc.relevant === true || doc.is_relevant === true) ? 'Yes' : 'No';
            const type_or_category = doc.type || doc.issuance_type || doc.category || '';
            const title = doc.title || '';
            const issuing_body = doc.issuing_body || doc.issuing_agency || doc.department || '';
            const effective_date_or_published_date = doc.effective_date || doc.date_effective || doc.published_date || doc.date_issued || doc.year || '';
            const summary = doc.summary || doc.description || '';
            const topics_flattened = flattenTopics(doc);
            const key_numbers = flattenKeyNumbers(doc);

            const row = [source_name, content_type, file_path, source_url, relevance, type_or_category, title, issuing_body, effective_date_or_published_date, summary, topics_flattened, key_numbers].map(escape).join(',');
            csvRows.push(row);
        }

        const outPath = path.join(outDir, `${sourceName}_reprocessed_latest.csv`);
        await fsp.writeFile(outPath, csvRows.join('\n'), 'utf8');
        console.log(`✅ CSV exported: ${outPath} (${toExport.length} rows)`);
    });

// Top-level digest: generate a 1-2 page Markdown briefing from reprocessed JSON
program
    .command('digest')
    .description('Generate a Markdown briefing from the latest reprocessed JSON for a source (includes PDF and HTML content)')
    .requiredOption('-s, --source <name>', 'Source name (e.g., DOE-legacy-ERC, DOE-circulars_ocr)')
    .action(async (options) => {
        const sourceName = options.source;

        const resultsDir = './storage/pdf-crawls';
        const files = await fsp.readdir(resultsDir).catch(() => []);

        // Find reprocessed files (PDF OCR data)
        const reprocessedFiles = files
            .filter((f: string) => f.startsWith(sourceName.replace(/_ocr$/, '')) && f.includes('reprocessed') && f.endsWith('.json'))
            .sort()
            .reverse();

        // Find crawl result files (may contain HTML data)
        const crawlResultFiles = files
            .filter((f: string) => f.startsWith(sourceName.replace(/_ocr$/, '')) && !f.includes('reprocessed') && !f.includes('extracted') && f.endsWith('.json'))
            .sort()
            .reverse();

        let pdfDocuments: any[] = [];
        let htmlDocuments: any[] = [];

        // Load PDF documents from reprocessed files
        if (reprocessedFiles.length > 0) {
            const latest = reprocessedFiles[0];
            const latestPath = path.join(resultsDir, latest);
            console.log(`Loading PDF data: ${latestPath}`);
            const content = await fsp.readFile(latestPath, 'utf8');
            const data = JSON.parse(content);
            pdfDocuments = Array.isArray(data) ? data : (data.results || []);
        }

        // Load HTML documents from crawl result files
        if (crawlResultFiles.length > 0) {
            const latest = crawlResultFiles[0];
            const latestPath = path.join(resultsDir, latest);
            console.log(`Loading HTML data: ${latestPath}`);
            try {
                const content = await fsp.readFile(latestPath, 'utf8');
                const crawlResult = JSON.parse(content);
                if (crawlResult.extractedHtmlContent && Array.isArray(crawlResult.extractedHtmlContent)) {
                    htmlDocuments = crawlResult.extractedHtmlContent;
                    console.log(`  Found ${htmlDocuments.length} HTML documents`);
                }
            } catch (e) {
                console.log(`  No HTML content found in crawl results`);
            }
        }

        // Combine PDF and HTML documents
        const allDocuments = [...pdfDocuments, ...htmlDocuments];

        // Deduplicate based on title (case-insensitive)
        const seen = new Map<string, any>();
        const deduplicatedDocuments = allDocuments.filter(d => {
            const normalizedTitle = (d.title || '').toLowerCase().trim();
            if (!normalizedTitle || seen.has(normalizedTitle)) {
                return false;
            }
            seen.set(normalizedTitle, d);
            return true;
        });

        console.log(`Deduplicated: ${allDocuments.length} → ${deduplicatedDocuments.length} documents`);

        // filter relevant
        const relevant = deduplicatedDocuments.filter(d => d.relevant === true || d.is_relevant === true);

        if (relevant.length === 0) {
            console.log('❌ No relevant documents found to generate digest');
            return;
        }

        console.log(`Found ${relevant.length} relevant documents (${pdfDocuments.filter(d => d.relevant || d.is_relevant).length} PDFs + ${htmlDocuments.filter(d => d.is_relevant).length} HTML pages)`);

        // Check OpenAI key
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY not set. Cannot generate digest.');
            return;
        }

        const processor = new PdfLlmProcessor();
        const openai = (processor as any).openai;
        if (!openai) {
            console.error('❌ OpenAI not configured. Cannot generate digest.');
            return;
        }

        console.log(`Found ${relevant.length} relevant documents`);

        // Sort by date (most recent first) and take top 10
        const sortedRelevant = relevant
            .map((d: any) => {
                const dateStr = d.effective_date || d.date_effective || d.published_date || d.date_issued || d.year || '';
                return { ...d, dateStr };
            })
            .sort((a: any, b: any) => {
                // Try to parse dates for sorting
                const dateA = new Date(a.dateStr);
                const dateB = new Date(b.dateStr);
                if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                    return dateB.getTime() - dateA.getTime(); // Most recent first
                }
                // If dates can't be parsed, sort by string comparison (descending)
                return b.dateStr.localeCompare(a.dateStr);
            })
            .slice(0, 10); // Take only top 10

        console.log(`Generating digest for the ${sortedRelevant.length} most recent documents...`);

        // Helper function to normalize date formats
        function normalizeDate(dateStr: string | null | undefined): string {
            if (!dateStr || dateStr === 'N/A') return 'N/A';

            // Try to parse the date
            const date = new Date(dateStr);

            // Check if valid date
            if (!isNaN(date.getTime())) {
                // Format as "Month DD, YYYY" (e.g., "January 28, 2025")
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // If it's a year range like "2023-2050", return as is
            if (/^\d{4}-\d{4}$/.test(dateStr)) {
                return dateStr;
            }

            // If it's just a year, return as is
            if (/^\d{4}$/.test(dateStr)) {
                return dateStr;
            }

            // Return original if can't parse
            return dateStr;
        }

        // Helper function to infer agency from source name if not provided
        function inferAgency(issuingBody: any, issuingAgency: any, department: any, sourceName: string): string {
            // Try existing fields first
            const agency = issuingBody || issuingAgency || department;
            if (agency && agency !== 'N/A') {
                const normalized = agency.trim();

                // Normalize DOE variations
                if (
                    normalized === 'Department of Energy' ||
                    normalized === 'DOE' ||
                    normalized.toLowerCase().includes('department of energy')
                ) {
                    return 'Department of Energy (DOE)';
                }

                // Normalize ERC variations
                if (
                    normalized === 'Energy Regulatory Commission' ||
                    normalized === 'ERC' ||
                    normalized.toLowerCase().includes('energy regulatory commission')
                ) {
                    return 'Energy Regulatory Commission (ERC)';
                }

                return normalized;
            }

            // Infer from source name
            const lowerSource = sourceName.toLowerCase();
            if (lowerSource.includes('doe')) return 'Department of Energy (DOE)';
            if (lowerSource.includes('erc')) return 'Energy Regulatory Commission (ERC)';

            return 'N/A';
        }

        // Prepare payload for LLM with file-based links
        const digestPayload = sortedRelevant.map((d: any) => {
            // Create proper links - use absolute file:// URLs that work when HTML is opened directly
            const filePath = d.file_path || '';
            const fileName = filePath ? path.basename(filePath) : '';
            const sourceFolder = sourceName.replace(/_ocr$/, '').toLowerCase();

            // Create absolute file path for local viewing
            const absoluteFilePath = filePath ? path.resolve(process.cwd(), filePath) : '';
            const pdfLink = absoluteFilePath ? `file://${absoluteFilePath}` : (d.source_url || d.source || '');

            // Get and normalize the date
            const rawDate = d.effective_date || d.date_effective || d.published_date || d.date_issued || d.year || 'N/A';
            const normalizedDate = normalizeDate(rawDate);

            // Infer agency if missing
            const agency = inferAgency(d.issuing_body, d.issuing_agency, d.department, sourceName);

            return {
                title: d.title || 'Untitled',
                type: d.type || d.issuance_type || d.category || 'N/A',
                issuing_body: agency,
                effective_date_or_published: normalizedDate,
                summary: d.summary || d.description || 'No summary available',
                key_numbers: d.key_numbers || d.key_points || d.procurement_activities || d.procurement_details || [],
                pdf_link: pdfLink,
            };
        });

        const systemPrompt = `You are an expert policy analyst summarizing Philippine energy and regulatory documents.

You will receive a list of relevant policy documents (issuances, circulars, reports, certificates, etc.) from DOE, ERC, or related bodies.

Your task:
1. Write a concise 1–2 page Markdown briefing with:
   - A short heading (e.g., "DOE Circulars – Recent Policy & Regulatory Updates" or "DOE–ERC Legacy Documents – Recent Policy/Program Updates")
   - 1–2 short paragraphs (3–5 sentences each) summarizing the overall picture and key themes
   - A Markdown table with columns:
     * Issuance (title)
     * Type
     * Agency
     * Effective / Date
     * Summary (3-4 sentences describing the key findings, purpose, and main provisions of each issuance)
     * Link (use pdf_link as a markdown link with text "View PDF")
   - IMPORTANT: Include ALL documents provided in the table - do not omit any
   - A section "## Why this matters" with 3–5 bullet points
   - A section "## What to watch next" with 3–5 bullet points

2. Keep language clear, professional, and concise.
3. Use only information from the provided documents. Do not invent details.
4. Each document has a unique pdf_link - use it correctly for each row in the table.
5. Include every single document in the table - the table should have exactly as many rows as there are documents provided.
6. Output only Markdown (no extra commentary).`;

        const userPayload = JSON.stringify({ source: sourceName, count: relevant.length, documents: digestPayload });

        try {
            const res = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPayload },
                ],
                temperature: 0.2,
                max_tokens: 4000,
            });

            const md = res.choices?.[0]?.message?.content || '(No digest generated)';

            // Convert Markdown to HTML properly
            function convertMarkdownToHtml(markdown: string): string {
                let html = markdown;

                // First, fix line breaks within table cells (join lines that don't start with | or #)
                const lines = html.split('\n');
                const fixedLines: string[] = [];
                let inTable = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const trimmed = line.trim();

                    if (line.startsWith('|')) {
                        inTable = true;
                        fixedLines.push(line);
                    } else if (trimmed.startsWith('##') || trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed === '') {
                        // This is a heading, list item, or empty line - don't join
                        inTable = false;
                        fixedLines.push(line);
                    } else if (inTable && fixedLines.length > 0 && fixedLines[fixedLines.length - 1].includes('|')) {
                        // This is a continuation of the previous table row
                        fixedLines[fixedLines.length - 1] += ' ' + trimmed;
                    } else {
                        inTable = false;
                        fixedLines.push(line);
                    }
                }
                html = fixedLines.join('\n');

                // Process tables
                const tableRegex = /\|(.+)\|\n\|([-:\s|]+)\|\n((?:\|.+\|\n?)+)/g;
                html = html.replace(tableRegex, (match, headerRow, separator, bodyRows) => {
                    const headers = headerRow.split('|').filter((h: string) => h.trim()).map((h: string) => h.trim());
                    const rows = bodyRows.trim().split('\n').map((row: string) =>
                        row.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim())
                    );

                    let table = '<table>\n<thead>\n<tr>\n';
                    table += headers.map((h: string) => `<th>${h}</th>`).join('\n');
                    table += '\n</tr>\n</thead>\n<tbody>\n';

                    rows.forEach((row: string[]) => {
                        table += '<tr>\n';
                        table += row.map((cell: string) => {
                            // Convert markdown links in cells
                            const cellHtml = cell.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
                            return `<td>${cellHtml}</td>`;
                        }).join('\n');
                        table += '\n</tr>\n';
                    });

                    table += '</tbody>\n</table>';
                    return table;
                });

                // Headings
                html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
                html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
                html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

                // Links (before lists to handle links within bullets)
                html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

                // Bold text
                html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

                // Lists - handle bullet points
                html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
                html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');

                // Wrap consecutive <li> tags in <ul> and handle properly
                const processedLines = html.split('\n');
                const result: string[] = [];
                let inList = false;

                for (const line of processedLines) {
                    const trimmed = line.trim();

                    if (trimmed.startsWith('<li>') && trimmed.endsWith('</li>')) {
                        if (!inList) {
                            result.push('<ul>');
                            inList = true;
                        }
                        result.push(trimmed);
                    } else {
                        if (inList) {
                            result.push('</ul>');
                            inList = false;
                        }
                        result.push(line);
                    }
                }

                if (inList) {
                    result.push('</ul>');
                }

                html = result.join('\n');

                // Paragraphs - wrap non-HTML lines in <p> tags
                const finalLines = html.split('\n');
                const withParagraphs: string[] = [];

                for (const line of finalLines) {
                    const trimmed = line.trim();
                    if (trimmed === '') {
                        withParagraphs.push('');
                    } else if (trimmed.startsWith('<') || trimmed.endsWith('>')) {
                        // Already HTML
                        withParagraphs.push(line);
                    } else {
                        // Plain text - wrap in <p>
                        withParagraphs.push(`<p>${trimmed}</p>`);
                    }
                }

                return withParagraphs.join('\n');
            }

            const htmlContent = convertMarkdownToHtml(md);

            // Convert Markdown to HTML with basic styling
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Energy Policy Digest - ${sourceName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #202020;
            border-bottom: 3px solid #202020;
            padding-bottom: 0.5rem;
            margin-bottom: 1.5rem;
        }
        h2, h3 {
            color: #202020;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }
        h3 {
            font-size: 1.2rem;
            font-weight: 600;
        }
        p {
            margin-bottom: 1rem;
            color: #444;
            line-height: 1.7;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            font-size: 0.85rem;
        }
        th {
            background-color: #202020;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            vertical-align: top;
        }
        td {
            padding: 12px 10px;
            border-bottom: 1px solid #ddd;
            vertical-align: top;
            line-height: 1.5;
        }
        tr:hover {
            background-color: #f9f9f9;
        }
        ul {
            margin: 1rem 0;
            padding-left: 1.5rem;
        }
        li {
            margin-bottom: 0.5rem;
            color: #444;
            line-height: 1.6;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .timestamp {
            color: #666;
            font-size: 0.9rem;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
${htmlContent}
        <div class="timestamp">
            Generated: ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}
        </div>
    </div>
</body>
</html>`;

            // Save both Markdown and HTML
            const digestDir = path.join('./storage/digests', sourceName);
            await fsp.mkdir(digestDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

            const mdPath = path.join(digestDir, `digest_${timestamp}.md`);
            const htmlPath = path.join(digestDir, `digest_${timestamp}.html`);

            await fsp.writeFile(mdPath, md, 'utf8');
            await fsp.writeFile(htmlPath, html, 'utf8');

            const htmlFilename = `digest_${timestamp}.html`;
            const httpUrl = `http://localhost:3001/digests/${sourceName}/${htmlFilename}`;

            console.log(`✅ Digest saved:`);
            console.log(`   Markdown: ${mdPath}`);
            console.log(`   HTML: ${htmlPath}`);
            console.log(`   \n🌐 Open in browser: ${httpUrl}`);
        } catch (err) {
            console.error('❌ Digest generation failed:', err instanceof Error ? err.message : String(err));
        }
    });

program
    .command('changes')
    .description('View document changes and version history')
    .requiredOption('-s, --source <name>', 'Source name')
    .option('--review', 'Show only changes requiring review', false)
    .option('--limit <number>', 'Limit number of changes to show', '20')
    .action(async (options) => {
        const { Pool } = await import('pg');
        const { DocumentChangeDetector } = await import('../services/document-change-detector.js');

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler'
        });

        const detector = new DocumentChangeDetector(pool);

        try {
            // Get source from configs
            const sourceName = options.source;
            if (!SOURCE_CONFIGS[sourceName]) {
                console.error(`❌ Unknown source: ${sourceName}`);
                process.exit(1);
            }

            // For now, use a mock source_id (in real usage, query from sources table)
            const sourceId = '00000000-0000-0000-0000-000000000001'; // TODO: Query from DB

            const changes = options.review
                ? await detector.getChangesForReview(sourceId)
                : await detector.getRecentChanges(sourceId, parseInt(options.limit));

            if (changes.length === 0) {
                console.log(`\n📭 No changes found for source: ${sourceName}`);
                await pool.end();
                return;
            }

            console.log(`\n${'='.repeat(80)}`);
            console.log(`DOCUMENT CHANGES - ${sourceName}`);
            console.log(`${'='.repeat(80)}\n`);

            changes.forEach((change, idx) => {
                const significance = change.significance_score
                    ? `${(change.significance_score * 100).toFixed(0)}%`
                    : 'N/A';

                const reviewFlag = change.requires_review ? '⚠️  REVIEW' : '';

                console.log(`[${idx + 1}] ${change.change_type.toUpperCase()} ${reviewFlag}`);
                console.log(`    Title: ${change.document_title}`);
                console.log(`    URL: ${change.document_url}`);
                console.log(`    Detected: ${new Date(change.detected_at).toLocaleString()}`);
                console.log(`    Significance: ${significance}`);

                if (change.change_summary) {
                    console.log(`    Summary: ${change.change_summary}`);
                }

                if (change.old_version_number && change.new_version_number) {
                    console.log(`    Version: ${change.old_version_number} → ${change.new_version_number}`);
                }

                console.log('');
            });

            console.log(`Showing ${changes.length} change(s)\n`);

        } catch (error) {
            console.error('❌ Failed to retrieve changes:', error);
        } finally {
            await pool.end();
        }
    });

program
    .command('versions')
    .description('View version history for a specific document')
    .requiredOption('-s, --source <name>', 'Source name')
    .requiredOption('-u, --url <url>', 'Document URL')
    .action(async (options) => {
        const { Pool } = await import('pg');
        const { DocumentChangeDetector } = await import('../services/document-change-detector.js');

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler'
        });

        const detector = new DocumentChangeDetector(pool);

        try {
            const sourceName = options.source;
            if (!SOURCE_CONFIGS[sourceName]) {
                console.error(`❌ Unknown source: ${sourceName}`);
                process.exit(1);
            }

            const sourceId = '00000000-0000-0000-0000-000000000001'; // TODO: Query from DB
            const versions = await detector.getVersionHistory(sourceId, options.url);

            if (versions.length === 0) {
                console.log(`\n📭 No versions found for URL: ${options.url}`);
                await pool.end();
                return;
            }

            console.log(`\n${'='.repeat(80)}`);
            console.log(`VERSION HISTORY`);
            console.log(`${'='.repeat(80)}\n`);
            console.log(`Document: ${versions[0].document_title}`);
            console.log(`URL: ${options.url}`);
            console.log(`Total versions: ${versions.length}\n`);

            versions.forEach(version => {
                const current = version.is_current ? '(CURRENT)' : '';
                console.log(`Version ${version.version_number} ${current}`);
                console.log(`  First seen: ${new Date(version.first_seen_at!).toLocaleString()}`);
                console.log(`  Last seen: ${new Date(version.last_seen_at!).toLocaleString()}`);
                console.log(`  Change type: ${version.change_type || 'N/A'}`);
                console.log(`  Content hash: ${version.content_hash.substring(0, 16)}...`);

                if (version.changes_detected && Object.keys(version.changes_detected).length > 0) {
                    console.log(`  Changes: ${JSON.stringify(version.changes_detected)}`);
                }

                console.log('');
            });

        } catch (error) {
            console.error('❌ Failed to retrieve version history:', error);
        } finally {
            await pool.end();
        }
    });

// If no command provided, show help
if (process.argv.length === 2) {
    program.help();
}

program.parse();

