#!/usr/bin/env tsx
/**
 * Policy Scanner CLI
 * 
 * Backend Alpha - Command-line interface for policy & market scanner
 * 
 * Usage:
 *   pnpm scanner scan --url https://example.com
 *   pnpm scanner scan --file urls.txt
 *   pnpm scanner digest --period "Nov 15-19, 2025"
 *   pnpm scanner export --format csv,json,db
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import { PolicyScanner, ScanResult } from '../services/policy.scanner';
import { DigestGenerator, ExecutiveDigest } from '../services/digest.generator';
import { ExportService } from '../services/export.service';

const program = new Command();

program
    .name('policy-scanner')
    .description('CSV Policy & Market Scanner - Backend Alpha')
    .version('1.0.0');

/**
 * Scan command
 */
program
    .command('scan')
    .description('Scan URL(s) for policy & market signals')
    .option('-u, --url <url>', 'Single URL to scan')
    .option('-f, --file <path>', 'File containing URLs (one per line)')
    .option('--headless', 'Force headless browser for all URLs')
    .option('--timeout <ms>', 'Page load timeout in milliseconds', '30000')
    .option('--export <formats>', 'Export formats (csv,json,db)', 'json')
    .option('--output <dir>', 'Output directory', './storage/exports')
    .action(async (options) => {
        console.log('🚀 CSV Policy Scanner - Starting scan...\n');

        try {
            const urls = await getUrls(options);

            if (urls.length === 0) {
                console.error('❌ No URLs provided. Use --url or --file option.');
                process.exit(1);
            }

            console.log(`📋 Scanning ${urls.length} URL(s)...\n`);

            const scanner = new PolicyScanner();
            const results: ScanResult[] = [];

            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                console.log(`[${i + 1}/${urls.length}] Scanning: ${url}`);

                try {
                    const result = await scanner.scan(url, {
                        useHeadless: options.headless,
                        timeout: parseInt(options.timeout, 10),
                    });

                    results.push(result);

                    console.log(`  ✓ ${result.isRelevant ? '✅ RELEVANT' : '⚠️  NOT RELEVANT'} (Score: ${result.relevanceScore})`);
                    console.log(`  📊 Signals: ${result.signals.length}`);
                    console.log(`  🔧 Method: ${result.metadata.method}\n`);
                } catch (error) {
                    console.error(`  ❌ Failed: ${error}\n`);
                }
            }

            await scanner.closeBrowser();

            // Summary
            const relevantCount = results.filter(r => r.isRelevant).length;
            const totalSignals = results.reduce((sum, r) => sum + r.signals.length, 0);

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📊 SCAN SUMMARY');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Total scanned:     ${results.length}`);
            console.log(`Relevant:          ${relevantCount} (${Math.round((relevantCount / results.length) * 100)}%)`);
            console.log(`Signals detected:  ${totalSignals}`);
            console.log('');

            // Export
            const formats = options.export.split(',').map((f: string) => f.trim()) as ('csv' | 'json' | 'db')[];

            console.log(`💾 Exporting results (${formats.join(', ')})...`);

            const exportService = new ExportService(options.output);
            const exportResult = await exportService.exportScanResults(results, {
                formats,
                includeMetadata: true,
            });

            if (exportResult.success) {
                console.log('✅ Export successful!\n');
                exportResult.files.forEach(file => {
                    console.log(`  📄 ${file}`);
                });
                if (exportResult.dbRecords !== undefined) {
                    console.log(`  🗄️  Database: ${exportResult.dbRecords} records`);
                }
            } else {
                console.log('⚠️  Export completed with errors:\n');
                exportResult.errors.forEach(err => {
                    console.error(`  ❌ ${err}`);
                });
            }

            console.log('\n✅ Scan complete!');
        } catch (error) {
            console.error('❌ Scan failed:', error);
            process.exit(1);
        }
    });

/**
 * Digest command
 */
program
    .command('digest')
    .description('Generate executive digest from scan results')
    .option('-i, --input <path>', 'Input JSON file with scan results')
    .option('-p, --period <string>', 'Period description (e.g., "Nov 15-19, 2025")')
    .option('--export <formats>', 'Export formats (json,db,md)', 'md,json')
    .option('--output <dir>', 'Output directory', './storage/exports')
    .action(async (options) => {
        console.log('📝 Generating executive digest...\n');

        try {
            // Load scan results
            let scanResults: ScanResult[];

            if (options.input) {
                const content = await fs.readFile(options.input, 'utf8');
                const data = JSON.parse(content);
                scanResults = data.results || data;
            } else {
                console.error('❌ No input file provided. Use --input option.');
                process.exit(1);
            }

            console.log(`📊 Processing ${scanResults.length} scan results...`);

            const generator = new DigestGenerator();
            const digest = await generator.generate(scanResults, options.period);

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📄 EXECUTIVE DIGEST');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Period:            ${digest.period}`);
            console.log(`Total documents:   ${digest.metadata.totalDocuments}`);
            console.log(`Relevant docs:     ${digest.metadata.relevantDocuments}`);
            console.log(`Signals detected:  ${digest.metadata.signalsDetected}`);
            console.log(`Key datapoints:    ${digest.keyDatapoints.length}`);
            console.log('');

            // Generate markdown
            const markdown = generator.formatAsMarkdown(digest);

            // Export
            const formats = options.export.split(',').map((f: string) => f.trim()) as ('json' | 'db' | 'md')[];

            console.log(`💾 Exporting digest (${formats.join(', ')})...`);

            const exportService = new ExportService(options.output);
            const exportResult = await exportService.exportDigest(digest, markdown, {
                formats: formats.filter(f => f !== 'md') as ('json' | 'db')[],
            });

            if (exportResult.success) {
                console.log('✅ Export successful!\n');
                exportResult.files.forEach(file => {
                    console.log(`  📄 ${file}`);
                });
                if (exportResult.dbRecords !== undefined) {
                    console.log(`  🗄️  Database: ${exportResult.dbRecords} records`);
                }
            } else {
                console.log('⚠️  Export completed with errors:\n');
                exportResult.errors.forEach(err => {
                    console.error(`  ❌ ${err}`);
                });
            }

            // Print summary to console
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('EXECUTIVE SUMMARY');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(digest.summary);
            console.log('');

            console.log('✅ Digest generation complete!');
        } catch (error) {
            console.error('❌ Digest generation failed:', error);
            process.exit(1);
        }
    });

/**
 * Export command
 */
program
    .command('export')
    .description('Export datapoints to analyst-friendly formats')
    .option('-i, --input <path>', 'Input JSON file with scan results or digest')
    .option('--format <formats>', 'Export formats (csv,json,db)', 'csv')
    .option('--output <dir>', 'Output directory', './storage/exports')
    .action(async (options) => {
        console.log('💾 Exporting datapoints...\n');

        try {
            const content = await fs.readFile(options.input, 'utf8');
            const data = JSON.parse(content);

            const exportService = new ExportService(options.output);

            if (data.keyDatapoints) {
                // Export from digest
                console.log(`📊 Exporting ${data.keyDatapoints.length} datapoints from digest...`);
                const filePath = await exportService.exportDatapointsToCSV(data.keyDatapoints);
                console.log(`✅ Exported to: ${filePath}`);
            } else if (data.results) {
                // Export from scan results
                const formats = options.format.split(',').map((f: string) => f.trim()) as ('csv' | 'json' | 'db')[];
                const result = await exportService.exportScanResults(data.results, { formats });

                console.log('✅ Export successful!\n');
                result.files.forEach(file => console.log(`  📄 ${file}`));
            } else {
                console.error('❌ Invalid input format');
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Export failed:', error);
            process.exit(1);
        }
    });

/**
 * List exports command
 */
program
    .command('list')
    .description('List all exported files')
    .option('--output <dir>', 'Output directory', './storage/exports')
    .action(async (options) => {
        const exportService = new ExportService(options.output);
        const files = await exportService.listExports();

        if (files.length === 0) {
            console.log('No exports found.');
        } else {
            console.log(`Found ${files.length} export file(s):\n`);
            files.forEach(file => console.log(`  📄 ${file}`));
        }
    });

// Helper functions

async function getUrls(options: any): Promise<string[]> {
    if (options.url) {
        return [options.url];
    }

    if (options.file) {
        const content = await fs.readFile(options.file, 'utf8');
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    }

    return [];
}

// Parse CLI arguments
program.parse();
