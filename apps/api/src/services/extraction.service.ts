import { query, queryOne } from '@csv/db';
import { parse } from 'csv-parse/sync';
import * as cheerio from 'cheerio';

interface Document {
    id: string;
    source_id: string;
    title: string;
    url: string;
    content: string | null;
}

interface Datapoint {
    source_id: string;
    document_id: string;
    category: string | null;
    subcategory: string | null;
    key: string;
    value: string;
    unit: string | null;
    effective_date: Date | null;
    source_reference: string | null;
    confidence: number;
    metadata: Record<string, unknown> | null;
}

export interface ExtractionResult {
    datapoints: number;
    errors: string[];
}

export async function extractDatapoints(documentId: string): Promise<ExtractionResult> {
    const doc = await queryOne<Document>(
        'SELECT * FROM documents WHERE id = $1',
        [documentId]
    );

    if (!doc || !doc.content) {
        return { datapoints: 0, errors: ['No content to extract from'] };
    }

    const errors: string[] = [];
    let totalDatapoints = 0;

    try {
        const csvDatapoints = await extractFromCSV(doc);
        totalDatapoints += csvDatapoints;

        if (csvDatapoints === 0) {
            const tableDatapoints = await extractFromTables(doc);
            totalDatapoints += tableDatapoints;
        }

        if (totalDatapoints === 0) {
            const patternDatapoints = await extractFromPatterns(doc);
            totalDatapoints += patternDatapoints;
        }

        await query(
            'UPDATE documents SET extracted_data = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify({ extracted: true, datapoints: totalDatapoints }), documentId]
        );

        console.log(`[Extraction] Extracted ${totalDatapoints} datapoints from document ${documentId}`);
        return { datapoints: totalDatapoints, errors };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        console.error(`[Extraction] Failed:`, errorMsg);
        return { datapoints: totalDatapoints, errors };
    }
}

async function extractFromCSV(doc: Document): Promise<number> {
    if (!doc.content) return 0;
    
    const content = doc.content.trim();
    const firstLine = content.split('\n')[0];
    
    if (!firstLine.includes(',') && !firstLine.includes('\t')) {
        return 0;
    }

    try {
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            delimiter: [',', '\t'],
            relax_quotes: true,
            relax_column_count: true,
        }) as Record<string, string>[];

        if (records.length === 0) return 0;

        let count = 0;
        for (const record of records) {
            const datapoint = parseRecordToDatapoint(doc, record);
            if (datapoint) {
                await insertDatapoint(datapoint);
                count++;
            }
        }
        return count;
    } catch (error) {
        console.error(`[Extraction] CSV parse error:`, error);
        return 0;
    }
}

async function extractFromTables(doc: Document): Promise<number> {
    if (!doc.content) return 0;

    const $ = cheerio.load(doc.content);
    const tables = $('table');

    if (tables.length === 0) return 0;

    let count = 0;

    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const rows = $(table).find('tr');
        const headers: string[] = [];

        $(rows[0]).find('th, td').each((_, cell) => {
            headers.push($(cell).text().trim());
        });

        if (headers.length === 0) continue;

        for (let j = 1; j < rows.length; j++) {
            const row = rows[j];
            const cells: string[] = [];
            
            $(row).find('td').each((_, cell) => {
                cells.push($(cell).text().trim());
            });

            if (cells.length === 0) continue;

            const record: Record<string, string> = {};
            headers.forEach((header, index) => {
                if (cells[index]) {
                    record[header] = cells[index];
                }
            });

            const datapoint = parseRecordToDatapoint(doc, record);
            if (datapoint) {
                await insertDatapoint(datapoint);
                count++;
            }
        }
    }

    return count;
}

async function extractFromPatterns(doc: Document): Promise<number> {
    if (!doc.content) return 0;

    const patterns = [
        { regex: /([A-Z]{3})\/([A-Z]{3}):\s*([\d.,]+)/gi, type: 'exchange_rate' },
        { regex: /([\d.]+)%\s+effective\s+(\w+\s+\d{1,2},?\s+\d{4})/gi, type: 'interest_rate' },
        { regex: /Circular No\.\s*(\d+)\s+dated\s+(\w+\s+\d{1,2},?\s+\d{4})/gi, type: 'policy' },
        { regex: /HS Code\s+([\d.]+):\s*([\d.]+)%/gi, type: 'tariff' },
    ];

    let count = 0;
    const content = doc.content;

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.regex.exec(content)) !== null) {
            const datapoint = parsePatternMatch(doc, pattern.type, match);
            if (datapoint) {
                await insertDatapoint(datapoint);
                count++;
            }
        }
    }

    return count;
}

function parseRecordToDatapoint(doc: Document, record: Record<string, string>): Omit<Datapoint, 'created_at' | 'updated_at'> | null {
    const category = inferCategory(record);
    if (!category) return null;

    const valueKey = Object.keys(record).find(
        (key) => /value|amount|rate|price|level|quantity/i.test(key) && record[key]
    );

    if (!valueKey || !record[valueKey]) return null;

    const dateKey = Object.keys(record).find((key) =>
        /date|effective|period|from|to/i.test(key)
    );

    const effectiveDate = dateKey ? parseDate(record[dateKey]) : null;
    const unitKey = Object.keys(record).find((key) => /unit|currency|denomination/i.test(key));

    return {
        source_id: doc.source_id,
        document_id: doc.id,
        category,
        subcategory: inferSubcategory(record),
        key: valueKey,
        value: record[valueKey],
        unit: unitKey ? record[unitKey] : null,
        effective_date: effectiveDate,
        source_reference: doc.url,
        confidence: 0.8,
        metadata: record,
    };
}

function parsePatternMatch(doc: Document, patternType: string, match: RegExpExecArray): Omit<Datapoint, 'created_at' | 'updated_at'> | null {
    if (patternType === 'exchange_rate') {
        return {
            source_id: doc.source_id,
            document_id: doc.id,
            category: 'exchange_rate',
            subcategory: `${match[1]}/${match[2]}`,
            key: `${match[1]}_${match[2]}_rate`,
            value: match[3],
            unit: match[2],
            effective_date: null,
            source_reference: doc.url,
            confidence: 0.7,
            metadata: { pattern: 'exchange_rate', from: match[1], to: match[2] },
        };
    }

    if (patternType === 'interest_rate') {
        return {
            source_id: doc.source_id,
            document_id: doc.id,
            category: 'interest_rate',
            subcategory: null,
            key: 'policy_rate',
            value: match[1],
            unit: 'percent',
            effective_date: parseDate(match[2]),
            source_reference: doc.url,
            confidence: 0.7,
            metadata: { pattern: 'interest_rate' },
        };
    }

    if (patternType === 'policy') {
        return {
            source_id: doc.source_id,
            document_id: doc.id,
            category: 'policy',
            subcategory: 'circular',
            key: 'circular_number',
            value: match[1],
            unit: null,
            effective_date: parseDate(match[2]),
            source_reference: doc.url,
            confidence: 0.9,
            metadata: { pattern: 'policy_circular', circular_number: match[1] },
        };
    }

    if (patternType === 'tariff') {
        return {
            source_id: doc.source_id,
            document_id: doc.id,
            category: 'tariff',
            subcategory: `HS_${match[1]}`,
            key: 'import_duty',
            value: match[2],
            unit: 'percent',
            effective_date: null,
            source_reference: doc.url,
            confidence: 0.8,
            metadata: { pattern: 'tariff', hs_code: match[1] },
        };
    }

    return null;
}

async function insertDatapoint(datapoint: Omit<Datapoint, 'created_at' | 'updated_at'>): Promise<void> {
    const existing = await queryOne<{ id: string }>(
        `SELECT id FROM datapoints 
         WHERE source_id = $1 
         AND category = $2 
         AND key = $3
         AND value = $4 
         AND (effective_date = $5 OR (effective_date IS NULL AND $5 IS NULL))`,
        [datapoint.source_id, datapoint.category, datapoint.key, datapoint.value, datapoint.effective_date]
    );

    if (existing) return;

    await query(
        `INSERT INTO datapoints (
          source_id, document_id, category, subcategory, key, value, unit, 
          effective_date, source_reference, confidence, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
            datapoint.source_id,
            datapoint.document_id,
            datapoint.category,
            datapoint.subcategory,
            datapoint.key,
            datapoint.value,
            datapoint.unit,
            datapoint.effective_date,
            datapoint.source_reference,
            datapoint.confidence,
            JSON.stringify(datapoint.metadata),
        ]
    );
}

function inferCategory(record: Record<string, string>): string | null {
    const keys = Object.keys(record).map((k) => k.toLowerCase()).join(' ');

    if (keys.includes('exchange') || keys.includes('forex') || keys.includes('currency'))
        return 'exchange_rate';
    if (keys.includes('interest') || keys.includes('rate') || keys.includes('policy rate'))
        return 'interest_rate';
    if (keys.includes('tariff') || keys.includes('duty') || keys.includes('hs code'))
        return 'tariff';
    if (keys.includes('policy') || keys.includes('regulation') || keys.includes('circular'))
        return 'policy';
    if (keys.includes('price') || keys.includes('commodity')) return 'commodity_price';
    if (keys.includes('stock') || keys.includes('share') || keys.includes('equity'))
        return 'market_data';

    return 'other';
}

function inferSubcategory(record: Record<string, string>): string | null {
    const subcatKey = Object.keys(record).find((key) =>
        /type|category|subcategory|name|instrument/i.test(key)
    );
    return subcatKey ? record[subcatKey] : null;
}

function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date;
    } catch {
        return null;
    }
}

export async function extractAllForSource(sourceId: string): Promise<ExtractionResult> {
    const documents = await query<Document>(
        `SELECT * FROM documents 
         WHERE source_id = $1 
         AND (extracted_data IS NULL OR extracted_data->>'extracted' != 'true')`,
        [sourceId]
    );

    let totalDatapoints = 0;
    const allErrors: string[] = [];

    for (const doc of documents) {
        const result = await extractDatapoints(doc.id);
        totalDatapoints += result.datapoints;
        allErrors.push(...result.errors);
    }

    return {
        datapoints: totalDatapoints,
        errors: allErrors,
    };
}
