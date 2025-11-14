import { createHash } from 'crypto';
import * as db from '@csv/db';
import { CrawledDocument, DataPoint } from '@csv/types';

/**
 * Extraction service: Processes crawled documents and extracts structured datapoints.
 *
 * Workflow:
 * 1. Query unprocessed documents (where processed_at is null)
 * 2. Call extractor function (mockable for testing) to extract key-value pairs
 * 3. Validate extracted data (type checking, confidence scoring)
 * 4. Store datapoints in the datapoints table
 * 5. Mark document as processed
 */

export interface ExtractedDataPoint {
    key: string;
    value: string | number;
    unit?: string;
    effectiveDate?: Date;
    confidence?: number;
    source?: string;
}

export interface ExtractionResult {
    datapoints: ExtractedDataPoint[];
    classification?: string;
    country?: string;
    sector?: string;
    themes?: string[];
    confidence?: number;
    verified?: boolean;
}

/**
 * Default mockable extractor: Placeholder that returns empty results.
 * In production, replace with a real LLM client.
 */
async function defaultExtractor(content: string): Promise<ExtractionResult> {
    // Placeholder: In production, call an LLM API to extract structured data
    // For now, return a simple extraction heuristic (e.g., parse dates, percentages)
    const datapoints: ExtractedDataPoint[] = [];

    // Simple heuristic: Look for patterns like "Q1 2025: 15%", "Date: 2025-01-15", etc.
    const datePattern = /(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})/gi;
    const percentPattern = /(\d+(?:\.\d+)?)\s*%/g;

    let dateMatch;
    while ((dateMatch = datePattern.exec(content)) !== null) {
        datapoints.push({
            key: 'announcement_date',
            value: dateMatch[0],
            confidence: 0.5,
        });
    }

    let percentMatch;
    while ((percentMatch = percentPattern.exec(content)) !== null) {
        datapoints.push({
            key: 'percentage_metric',
            value: percentMatch[1],
            unit: '%',
            confidence: 0.4,
        });
    }

    return {
        datapoints,
        classification: 'unclassified',
        confidence: 0.3,
        verified: false,
    };
}

/**
 * Query unprocessed documents
 */
async function getUnprocessedDocuments(
    limit: number = 10
): Promise<CrawledDocument[]> {
    const rows = await db.query<CrawledDocument>(
        `SELECT id, source_id, url, content, content_hash, classification, 
            country, sector, themes, extracted_data, confidence, verified, 
            published_at, crawled_at, created_at, updated_at
     FROM documents 
     WHERE processed_at IS NULL 
     ORDER BY created_at ASC 
     LIMIT $1`,
        [limit]
    );
    return rows;
}

/**
 * Insert datapoints for a document
 */
async function insertDataPoints(
    documentId: string,
    datapoints: ExtractedDataPoint[]
): Promise<DataPoint[]> {
    if (datapoints.length === 0) return [];

    const placeholders = datapoints
        .map(
            (_, i) =>
                `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
        )
        .join(',');

    const params: unknown[] = [];
    datapoints.forEach((dp) => {
        params.push(
            documentId,
            dp.key,
            String(dp.value),
            dp.unit ?? null,
            dp.effectiveDate ?? null,
            dp.source ?? null,
            dp.confidence ?? 0
        );
    });

    const sql = `
    INSERT INTO datapoints (document_id, key, value, unit, effective_date, source, confidence, created_at)
    VALUES ${placeholders}
    RETURNING id, document_id, key, value, unit, effective_date, source, confidence, created_at, updated_at
  `;

    const rows = await db.query<DataPoint>(sql, params);
    return rows;
}

/**
 * Mark document as processed
 */
async function markDocumentProcessed(documentId: string): Promise<void> {
    await db.query(
        `UPDATE documents 
     SET processed_at = NOW(), updated_at = NOW() 
     WHERE id = $1`,
        [documentId]
    );
}

/**
 * Update document with extraction metadata
 */
async function updateDocumentMetadata(
    documentId: string,
    metadata: Partial<ExtractionResult>
): Promise<void> {
    const { classification, country, sector, themes, confidence, verified } =
        metadata;

    await db.query(
        `UPDATE documents 
     SET classification = COALESCE($1, classification),
         country = COALESCE($2, country),
         sector = COALESCE($3, sector),
         themes = COALESCE($4, themes),
         confidence = COALESCE($5, confidence),
         verified = COALESCE($6, verified),
         updated_at = NOW()
     WHERE id = $7`,
        [classification, country, sector, themes, confidence, verified, documentId]
    );
}

/**
 * Process a single document: extract, validate, and store datapoints
 */
export async function processDocument(
    doc: CrawledDocument,
    extractor: (content: string) => Promise<ExtractionResult> = defaultExtractor
): Promise<{ success: boolean; datapointsCount: number; error?: string }> {
    try {
        if (!doc.content) {
            throw new Error('Document has no content');
        }

        // Extract datapoints
        const result = await extractor(doc.content);

        // Validate and filter
        const validDatapoints = (result.datapoints || []).filter((dp) => {
            // Basic validation: key and value must exist
            return dp.key && dp.value;
        });

        // Store datapoints
        const stored = await insertDataPoints(doc.id, validDatapoints);

        // Update document metadata
        await updateDocumentMetadata(doc.id, result);

        // Mark as processed
        await markDocumentProcessed(doc.id);

        console.log(
            `[EXTRACTION] Processed doc=${doc.id}, datapoints=${stored.length}`
        );

        return { success: true, datapointsCount: stored.length };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[EXTRACTION] Error processing doc=${doc.id}: ${message}`);
        return { success: false, datapointsCount: 0, error: message };
    }
}

/**
 * Main extraction loop: Poll for unprocessed documents and extract datapoints
 */
export async function runExtractionLoop(
    stopSignal?: { stop: boolean },
    extractor: (content: string) => Promise<ExtractionResult> = defaultExtractor
): Promise<void> {
    const POLL_INTERVAL_MS = Number(process.env.EXTRACTION_POLL_MS || 5000);
    const BATCH_SIZE = Number(process.env.EXTRACTION_BATCH || 5);

    console.log(
        `[EXTRACTION] Starting loop. Poll interval: ${POLL_INTERVAL_MS}ms, batch size: ${BATCH_SIZE}`
    );

    while (!stopSignal?.stop) {
        try {
            const docs = await getUnprocessedDocuments(BATCH_SIZE);

            if (docs.length === 0) {
                // No documents to process, just wait
                await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
                continue;
            }

            // Process each document sequentially
            for (const doc of docs) {
                // eslint-disable-next-line no-await-in-loop
                await processDocument(doc, extractor);
            }
        } catch (err) {
            console.error('[EXTRACTION] Poll error:', err);
        }

        // Wait before next poll
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}

if (require.main === module) {
    // CLI runner
    console.log('[EXTRACTION] Starting extraction worker...');
    runExtractionLoop().catch((err) => {
        console.error('[EXTRACTION] Fatal error:', err);
        process.exit(1);
    });
}

export default { runExtractionLoop, processDocument };
