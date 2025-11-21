#!/usr/bin/env tsx
/**
 * Simple Viewer - View scan results in plain English
 * No SQL, no JSON knowledge needed - just run and read
 */

import * as fs from 'fs/promises';
import * as path from 'path';

async function findLatestFile(dir: string, pattern: string): Promise<string | null> {
    try {
        const files = await fs.readdir(dir);
        const matching = files
            .filter(f => f.includes(pattern))
            .map(f => ({
                name: f,
                path: path.join(dir, f),
                time: fs.stat(path.join(dir, f)).then(s => s.mtime)
            }));

        if (matching.length === 0) return null;

        const withStats = await Promise.all(
            matching.map(async m => ({
                path: m.path,
                time: await m.time
            }))
        );

        withStats.sort((a, b) => b.time.getTime() - a.time.getTime());
        return withStats[0].path;
    } catch {
        return null;
    }
}

async function viewScanResults() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SCAN RESULTS VIEWER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find latest scan results
    const scanFile = await findLatestFile('./storage/exports', 'scan_results');
    
    if (!scanFile) {
        console.log('❌ No scan results found.');
        console.log('\nRun a scan first:');
        console.log('  pnpm scanner scan --file example-urls.txt\n');
        return;
    }

    console.log(`📁 Reading: ${path.basename(scanFile)}\n`);

    const content = await fs.readFile(scanFile, 'utf8');
    const data = JSON.parse(content);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('OVERVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total pages scanned:   ${data.totalResults || data.results.length}`);
    console.log(`Relevant updates:      ${data.relevantResults || data.results.filter((r: any) => r.isRelevant).length}`);
    console.log(`Generated:             ${new Date(data.generatedAt).toLocaleString()}`);
    console.log('');

    // Group by relevance
    const relevant = data.results.filter((r: any) => r.isRelevant);
    const notRelevant = data.results.filter((r: any) => !r.isRelevant);

    if (relevant.length > 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ RELEVANT UPDATES (' + relevant.length + ')');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        for (let i = 0; i < relevant.length; i++) {
            const result = relevant[i];
            console.log(`${i + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Relevance Score: ${result.relevanceScore}/100`);
            console.log(`   Why relevant: ${result.relevanceReason}`);
            
            if (result.signals && result.signals.length > 0) {
                console.log(`\n   📋 Found ${result.signals.length} signal(s):`);
                
                for (const signal of result.signals) {
                    console.log(`\n   • Type: ${signal.type.toUpperCase()}`);
                    console.log(`     Title: ${signal.title}`);
                    console.log(`     Description: ${signal.description}`);
                    
                    if (signal.effectiveDate) {
                        console.log(`     Effective Date: ${new Date(signal.effectiveDate).toLocaleDateString()}`);
                    }
                    
                    if (signal.impactedParties && signal.impactedParties.length > 0) {
                        console.log(`     Who's affected: ${signal.impactedParties.join(', ')}`);
                    }
                    
                    console.log(`     Confidence: ${Math.round(signal.confidence * 100)}%`);
                }
            } else {
                console.log(`   ℹ️  No specific signals extracted yet`);
            }
            
            console.log('');
        }
    }

    if (notRelevant.length > 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚪ NOT RELEVANT (' + notRelevant.length + ')');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        for (let i = 0; i < notRelevant.length; i++) {
            const result = notRelevant[i];
            console.log(`${i + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Score: ${result.relevanceScore}/100`);
            console.log(`   Reason: ${result.relevanceReason}\n`);
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('NEXT STEPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Generate a digest (easier to read summary):');
    console.log(`  pnpm scanner digest --input ${scanFile}`);
    console.log('');
    console.log('View all exports:');
    console.log('  pnpm view list');
    console.log('');
}

async function viewDigest() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 EXECUTIVE DIGEST VIEWER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find latest digest markdown
    const digestFile = await findLatestFile('./storage/exports', 'digest_');
    
    if (!digestFile || !digestFile.endsWith('.md')) {
        console.log('❌ No digest found.');
        console.log('\nGenerate a digest first:');
        console.log('  pnpm scanner digest --input storage/exports/scan_results_*.json\n');
        return;
    }

    console.log(`📁 Reading: ${path.basename(digestFile)}\n`);

    const content = await fs.readFile(digestFile, 'utf8');
    
    // Just print the markdown content - it's already formatted for reading
    console.log(content);
    console.log('\n');
}

async function listAllExports() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📂 ALL EXPORTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        const files = await fs.readdir('./storage/exports');
        
        if (files.length === 0) {
            console.log('No exports found yet.\n');
            return;
        }

        const fileStats = await Promise.all(
            files.map(async f => {
                const filePath = path.join('./storage/exports', f);
                const stat = await fs.stat(filePath);
                return {
                    name: f,
                    size: stat.size,
                    time: stat.mtime,
                    type: f.includes('scan_results') ? '📊 Scan' : 
                          f.includes('digest') ? '📄 Digest' :
                          f.includes('datapoints') ? '📈 Data' : '📁 Other'
                };
            })
        );

        fileStats.sort((a, b) => b.time.getTime() - a.time.getTime());

        for (const file of fileStats) {
            console.log(`${file.type} ${file.name}`);
            console.log(`   Size: ${(file.size / 1024).toFixed(1)} KB`);
            console.log(`   Created: ${file.time.toLocaleString()}\n`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TO VIEW:');
        console.log('  pnpm view scan    - View latest scan results');
        console.log('  pnpm view digest  - View latest digest');
        console.log('');
    } catch (error) {
        console.log('No exports directory found. Run a scan first.\n');
    }
}

async function exportToCSV() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXPORT TO CSV');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find latest scan results
    const scanFile = await findLatestFile('./storage/exports', 'scan_results');
    
    if (!scanFile) {
        console.log('❌ No scan results found.');
        console.log('\nRun a scan first:');
        console.log('  pnpm scanner scan --file example-urls.txt\n');
        return;
    }

    console.log(`📁 Reading: ${path.basename(scanFile)}\n`);

    const content = await fs.readFile(scanFile, 'utf8');
    const data = JSON.parse(content);

    // Create CSV content
    let csv = 'URL,Title,Relevant,Score,Reason,Signals,Method,JavaScript,Scraped At\n';

    for (const result of data.results) {
        const row = [
            `"${result.url}"`,
            `"${result.title.replace(/"/g, '""')}"`,
            result.isRelevant ? 'Yes' : 'No',
            result.relevanceScore,
            `"${result.relevanceReason.replace(/"/g, '""')}"`,
            result.signals?.length || 0,
            result.metadata?.method || 'unknown',
            result.metadata?.hasJavaScript ? 'Yes' : 'No',
            new Date(result.metadata?.scrapedAt || Date.now()).toLocaleString(),
        ];
        csv += row.join(',') + '\n';
    }

    // Also create signals CSV
    let signalsCsv = 'URL,Title,Signal Type,Signal Title,Description,Effective Date,Affected Parties,Confidence\n';
    
    for (const result of data.results) {
        if (result.signals && result.signals.length > 0) {
            for (const signal of result.signals) {
                const row = [
                    `"${result.url}"`,
                    `"${result.title.replace(/"/g, '""')}"`,
                    signal.type,
                    `"${signal.title.replace(/"/g, '""')}"`,
                    `"${signal.description.replace(/"/g, '""')}"`,
                    signal.effectiveDate ? new Date(signal.effectiveDate).toLocaleDateString() : 'N/A',
                    signal.impactedParties ? `"${signal.impactedParties.join(', ')}"` : 'N/A',
                    Math.round(signal.confidence * 100) + '%',
                ];
                signalsCsv += row.join(',') + '\n';
            }
        }
    }

    // Save CSV files
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
    const csvPath = path.join('./storage/exports', `results_${timestamp}.csv`);
    const signalsPath = path.join('./storage/exports', `signals_${timestamp}.csv`);

    await fs.writeFile(csvPath, csv, 'utf8');
    await fs.writeFile(signalsPath, signalsCsv, 'utf8');

    console.log('✅ CSV files created!\n');
    console.log(`📄 Results: ${csvPath}`);
    console.log(`📄 Signals: ${signalsPath}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('OPEN IN EXCEL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  open ${csvPath}`);
    console.log(`  open ${signalsPath}\n`);
}

async function viewHelp() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📖 VIEWER HELP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('View your scan results in plain English:\n');
    
    console.log('Commands:');
    console.log('  pnpm view scan     - View latest scan results with details');
    console.log('  pnpm view digest   - View latest executive digest');
    console.log('  pnpm view list     - List all exported files');
    console.log('  pnpm view csv      - Export latest results to CSV (Excel-ready)');
    console.log('  pnpm view help     - Show this help\n');
    
    console.log('Examples:');
    console.log('  1. Run a scan:');
    console.log('     pnpm scanner scan --file example-urls.txt\n');
    
    console.log('  2. View the results:');
    console.log('     pnpm view scan\n');
    
    console.log('  3. Export to Excel:');
    console.log('     pnpm view csv\n');
    
    console.log('  4. Generate a digest:');
    console.log('     pnpm scanner digest --input storage/exports/scan_results_*.json\n');
    
    console.log('  5. Read the digest:');
    console.log('     pnpm view digest\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main
const command = process.argv[2] || 'help';

switch (command) {
    case 'scan':
        viewScanResults();
        break;
    case 'digest':
        viewDigest();
        break;
    case 'list':
        listAllExports();
        break;
    case 'csv':
        exportToCSV();
        break;
    case 'help':
    default:
        viewHelp();
        break;
}
