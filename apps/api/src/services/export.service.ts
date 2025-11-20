/**
 * Export Service
 * 
 * Multi-format export: CSV, JSON, and PostgreSQL storage
 * Analyst-friendly, readable formats
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { stringify } from 'csv-stringify/sync';
import { query } from '@csv/db';
import { ScanResult, PolicySignal } from './policy.scanner';
import { ExecutiveDigest, DatapointSummary } from './digest.generator';

export interface ExportOptions {
    outputDir?: string;
    formats?: ('csv' | 'json' | 'db')[];
    includeMetadata?: boolean;
}

export interface ExportResult {
    files: string[];
    dbRecords?: number;
    success: boolean;
    errors: string[];
}

export class ExportService {
    private defaultOutputDir: string;

    constructor(outputDir?: string) {
        this.defaultOutputDir = outputDir || path.join(process.cwd(), 'storage', 'exports');
    }

    /**
     * Export scan results in multiple formats
     */
    async exportScanResults(
        scanResults: ScanResult[],
        options: ExportOptions = {}
    ): Promise<ExportResult> {
        const {
            outputDir = this.defaultOutputDir,
            formats = ['csv', 'json', 'db'],
            includeMetadata = true,
        } = options;

        const files: string[] = [];
        const errors: string[] = [];
        let dbRecords = 0;

        try {
            // Ensure output directory exists
            await fs.mkdir(outputDir, { recursive: true });

            const timestamp = this.getTimestamp();

            // Export to CSV
            if (formats.includes('csv')) {
                try {
                    const csvFile = await this.exportToCSV(scanResults, outputDir, timestamp);
                    files.push(csvFile);
                } catch (error) {
                    errors.push(`CSV export failed: ${error}`);
                }
            }

            // Export to JSON
            if (formats.includes('json')) {
                try {
                    const jsonFile = await this.exportToJSON(scanResults, outputDir, timestamp, includeMetadata);
                    files.push(jsonFile);
                } catch (error) {
                    errors.push(`JSON export failed: ${error}`);
                }
            }

            // Export to database
            if (formats.includes('db')) {
                try {
                    dbRecords = await this.exportToDB(scanResults);
                } catch (error) {
                    errors.push(`DB export failed: ${error}`);
                }
            }

            return {
                files,
                dbRecords: formats.includes('db') ? dbRecords : undefined,
                success: errors.length === 0,
                errors,
            };
        } catch (error) {
            errors.push(`Export failed: ${error}`);
            return { files, dbRecords, success: false, errors };
        }
    }

    /**
     * Export digest in multiple formats
     */
    async exportDigest(
        digest: ExecutiveDigest,
        markdownContent: string,
        options: ExportOptions = {}
    ): Promise<ExportResult> {
        const {
            outputDir = this.defaultOutputDir,
            formats = ['json', 'db'],
        } = options;

        const files: string[] = [];
        const errors: string[] = [];
        let dbRecords = 0;

        try {
            await fs.mkdir(outputDir, { recursive: true });

            const timestamp = this.getTimestamp();

            // Export digest as Markdown
            const mdPath = path.join(outputDir, `digest_${timestamp}.md`);
            await fs.writeFile(mdPath, markdownContent, 'utf8');
            files.push(mdPath);

            // Export digest as JSON
            if (formats.includes('json')) {
                const jsonPath = path.join(outputDir, `digest_${timestamp}.json`);
                await fs.writeFile(jsonPath, JSON.stringify(digest, null, 2), 'utf8');
                files.push(jsonPath);
            }

            // Export digest to database
            if (formats.includes('db')) {
                try {
                    dbRecords = await this.exportDigestToDB(digest);
                } catch (error) {
                    errors.push(`DB export failed: ${error}`);
                }
            }

            return {
                files,
                dbRecords: formats.includes('db') ? dbRecords : undefined,
                success: errors.length === 0,
                errors,
            };
        } catch (error) {
            errors.push(`Digest export failed: ${error}`);
            return { files, dbRecords, success: false, errors };
        }
    }

    /**
     * Export datapoints to CSV
     */
    async exportDatapointsToCSV(
        datapoints: DatapointSummary[],
        outputDir?: string
    ): Promise<string> {
        const dir = outputDir || this.defaultOutputDir;
        await fs.mkdir(dir, { recursive: true });

        const timestamp = this.getTimestamp();
        const filePath = path.join(dir, `datapoints_${timestamp}.csv`);

        const records = datapoints.map(dp => ({
            category: dp.category,
            key: dp.key,
            old_value: dp.oldValue || 'N/A',
            new_value: dp.newValue,
            effective_date: dp.effectiveDate ? dp.effectiveDate.toISOString().split('T')[0] : 'TBD',
            source: dp.source,
            impact: dp.impact,
        }));

        const csvContent = stringify(records, {
            header: true,
            columns: ['category', 'key', 'old_value', 'new_value', 'effective_date', 'source', 'impact'],
        });

        await fs.writeFile(filePath, csvContent, 'utf8');
        return filePath;
    }

    /**
     * Export scan results to CSV format
     */
    private async exportToCSV(
        scanResults: ScanResult[],
        outputDir: string,
        timestamp: string
    ): Promise<string> {
        const filePath = path.join(outputDir, `scan_results_${timestamp}.csv`);

        const records = scanResults.map(result => ({
            url: result.url,
            title: result.title,
            is_relevant: result.isRelevant ? 'Yes' : 'No',
            relevance_score: result.relevanceScore,
            relevance_reason: result.relevanceReason,
            signals_count: result.signals.length,
            content_length: result.metadata.contentLength,
            method: result.metadata.method,
            has_javascript: result.metadata.hasJavaScript ? 'Yes' : 'No',
            scraped_at: result.metadata.scrapedAt.toISOString(),
        }));

        const csvContent = stringify(records, {
            header: true,
            columns: [
                'url',
                'title',
                'is_relevant',
                'relevance_score',
                'relevance_reason',
                'signals_count',
                'content_length',
                'method',
                'has_javascript',
                'scraped_at',
            ],
        });

        await fs.writeFile(filePath, csvContent, 'utf8');
        return filePath;
    }

    /**
     * Export scan results to JSON format
     */
    private async exportToJSON(
        scanResults: ScanResult[],
        outputDir: string,
        timestamp: string,
        includeMetadata: boolean
    ): Promise<string> {
        const filePath = path.join(outputDir, `scan_results_${timestamp}.json`);

        const exportData = {
            generatedAt: new Date().toISOString(),
            totalResults: scanResults.length,
            relevantResults: scanResults.filter(r => r.isRelevant).length,
            results: scanResults.map(result => {
                const data: any = {
                    url: result.url,
                    title: result.title,
                    isRelevant: result.isRelevant,
                    relevanceScore: result.relevanceScore,
                    relevanceReason: result.relevanceReason,
                    signals: result.signals,
                };

                if (includeMetadata) {
                    data.metadata = result.metadata;
                    data.contentHash = result.contentHash;
                }

                return data;
            }),
        };

        await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
        return filePath;
    }

    /**
     * Export scan results to PostgreSQL database
     */
    private async exportToDB(scanResults: ScanResult[]): Promise<number> {
        let count = 0;

        for (const result of scanResults) {
            try {
                // Insert into crawled_documents table
                const docSql = `
                    INSERT INTO crawled_documents (
                        source_id,
                        url,
                        title,
                        content,
                        content_hash,
                        relevance_score,
                        is_relevant,
                        extracted_at,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    ON CONFLICT (content_hash) DO UPDATE SET
                        relevance_score = EXCLUDED.relevance_score,
                        is_relevant = EXCLUDED.is_relevant,
                        extracted_at = EXCLUDED.extracted_at
                    RETURNING id
                `;

                const docResult = await query(docSql, [
                    1, // Default source_id (TODO: map from URL)
                    result.url,
                    result.title,
                    result.extractedText,
                    result.contentHash,
                    result.relevanceScore,
                    result.isRelevant,
                    result.metadata.scrapedAt,
                ]);

                if (docResult.length > 0) {
                    count++;

                    // Insert signals as datapoints
                    const documentId = String(docResult[0].id);
                    await this.insertSignalsAsDatapoints(documentId, result.signals);
                }
            } catch (error) {
                console.error(`[ExportService] Failed to insert ${result.url}:`, error);
            }
        }

        return count;
    }

    /**
     * Insert policy signals as datapoints
     */
    private async insertSignalsAsDatapoints(
        documentId: string,
        signals: PolicySignal[]
    ): Promise<void> {
        for (const signal of signals) {
            try {
                const sql = `
                    INSERT INTO datapoints (
                        source_id,
                        document_id,
                        category,
                        subcategory,
                        key,
                        value,
                        effective_date,
                        source_reference,
                        confidence,
                        metadata,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                `;

                await query(sql, [
                    1, // Default source_id
                    documentId,
                    'policy_signal',
                    signal.type,
                    signal.title,
                    signal.description,
                    signal.effectiveDate || null,
                    'PolicyScanner',
                    signal.confidence,
                    JSON.stringify({
                        impactedParties: signal.impactedParties,
                        changeDescription: signal.changeDescription,
                    }),
                ]);
            } catch (error) {
                console.error(`[ExportService] Failed to insert signal ${signal.title}:`, error);
            }
        }
    }

    /**
     * Export digest to database
     */
    private async exportDigestToDB(digest: ExecutiveDigest): Promise<number> {
        try {
            const sql = `
                INSERT INTO digests (
                    title,
                    period,
                    summary,
                    content,
                    metadata,
                    generated_at,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id
            `;

            const result = await query(sql, [
                digest.title,
                digest.period,
                digest.summary,
                JSON.stringify(digest.sections),
                JSON.stringify(digest.metadata),
                digest.generatedAt,
            ]);

            return result.length > 0 ? 1 : 0;
        } catch (error) {
            console.error('[ExportService] Failed to insert digest:', error);
            throw error;
        }
    }

    /**
     * Generate timestamp for filenames
     */
    private getTimestamp(): string {
        const now = new Date();
        return now.toISOString()
            .replace(/:/g, '-')
            .replace(/\..+/, '')
            .replace('T', '_');
    }

    /**
     * List all exports in output directory
     */
    async listExports(outputDir?: string): Promise<string[]> {
        const dir = outputDir || this.defaultOutputDir;
        
        try {
            const files = await fs.readdir(dir);
            return files.map(f => path.join(dir, f));
        } catch (error) {
            return [];
        }
    }
}
