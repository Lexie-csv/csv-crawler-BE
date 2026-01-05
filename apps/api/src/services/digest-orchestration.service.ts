import { query, queryOne } from '@csv/db';
import { DigestHighlight, DigestDatapoint, DigestHighlightRow, DigestDatapointRow, CrawlDigest, PromptTemplate } from '@csv/types';
import { llmExtractor } from './llm-extraction.service';
import { getPromptByTemplate, getDefaultTemplate, isValidTemplate } from '../prompts/extraction-prompts';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Document {
    id: string;
    source_id: string;
    url: string;
    title: string;
    content: string;
    crawl_job_id: string;
}

export class DigestOrchestrationService {
    private digestStoragePath: string;

    constructor() {
        // Store digests in a dedicated directory
        this.digestStoragePath = process.env.DIGEST_STORAGE_PATH ||
            path.join(process.cwd(), '../../storage/digests');
    }

    /**
     * Main orchestration: Process all documents from a crawl job and generate digest
     */
    async processAndGenerateDigest(
        crawlJobId: string,
        sourceId: string
    ): Promise<CrawlDigest | null> {
        try {
            console.log(`[DigestOrchestration] === Starting digest generation ===`);
            console.log(`[DigestOrchestration] Job ID: ${crawlJobId}`);
            console.log(`[DigestOrchestration] Source ID: ${sourceId}`);

            // Ensure storage directory exists
            await fs.mkdir(this.digestStoragePath, { recursive: true });
            console.log(`[DigestOrchestration] Storage directory: ${this.digestStoragePath}`);

            // Get source info (including prompt template and custom prompt)
            const source = await queryOne<{ 
                name: string; 
                url: string; 
                type: string; 
                prompt_template: string | null;
                extraction_prompt: string | null;
            }>(
                'SELECT name, url, type, prompt_template, extraction_prompt FROM sources WHERE id = $1',
                [sourceId]
            );

            if (!source) {
                console.error(`[DigestOrchestration] ❌ Source ${sourceId} not found`);
                throw new Error(`Source ${sourceId} not found`);
            }

            // Determine which prompt to use (priority: custom > template > default)
            let effectivePrompt: string | undefined;
            let promptSource: string;

            if (source.extraction_prompt) {
                // Custom prompt takes highest priority
                effectivePrompt = source.extraction_prompt;
                promptSource = 'custom';
                console.log(`[DigestOrchestration] Using source-specific custom prompt`);
            } else if (source.prompt_template && isValidTemplate(source.prompt_template)) {
                // Use template from library
                effectivePrompt = getPromptByTemplate(source.prompt_template as PromptTemplate);
                promptSource = `template:${source.prompt_template}`;
                console.log(`[DigestOrchestration] Using prompt template: ${source.prompt_template}`);
            } else {
                // Fallback to default template
                const defaultTemplate = getDefaultTemplate();
                effectivePrompt = getPromptByTemplate(defaultTemplate);
                promptSource = `template:${defaultTemplate} (default)`;
                console.log(`[DigestOrchestration] Using default prompt template: ${defaultTemplate}`);
            }

            console.log(`[DigestOrchestration] Source: ${source.name} | Prompt: ${promptSource}`);

            // Get all documents from this crawl job
            const documents = await query<Document>(
                `SELECT id, source_id, url, title, content, crawl_job_id
                 FROM documents 
                 WHERE crawl_job_id = $1 AND content IS NOT NULL
                 ORDER BY created_at ASC`,
                [crawlJobId]
            );

            console.log(`[DigestOrchestration] Found ${documents.length} documents to process`);

            if (documents.length === 0) {
                console.warn(`[DigestOrchestration] ⚠️ No documents to process, skipping digest`);
                return null;
            }

            // Step 1: Classify and extract from each document
            const allHighlights: DigestHighlight[] = [];
            const allDatapoints: DigestDatapoint[] = [];
            let relevantCount = 0;
            let processedCount = 0;

            for (const doc of documents) {
                try {
                    console.log(`[DigestOrchestration] Processing document ${doc.id}: ${doc.title?.substring(0, 50)}...`);
                    // First: try a lightweight, deterministic extraction of "Key Rates"
                    // This captures critical numeric datapoints (interest/policy rates) even when
                    // the LLM later considers the page as a generic navigation page.
                    const keyRateDatapoints = this.extractKeyRatesFromContent(doc.content, doc);
                    if (keyRateDatapoints.length > 0) {
                        console.log(`[DigestOrchestration] ✓ Found ${keyRateDatapoints.length} key rate datapoint(s) via heuristic parser`);
                        allDatapoints.push(...keyRateDatapoints);

                        // Add a highlight summarizing the rates
                        const summaryLines = keyRateDatapoints.map((d: DigestDatapoint) => `${d.description}: ${d.value}${d.unit ? ` ${d.unit}` : ''}`);
                        allHighlights.push({
                            title: 'Key rates update',
                            summary: summaryLines.join('; '),
                            category: 'data_report' as any,
                            documentId: doc.id,
                            sourceUrl: doc.url,
                            effectiveDate: keyRateDatapoints[0].effectiveDate || null,
                            confidence: 0.95,
                        });
                    }

                    // Classify relevance (use determined effective prompt)
                    const classification = await llmExtractor.classifyRelevance(
                        doc,
                        effectivePrompt,
                        source.type // Pass source type for dynamic schema
                    );
                    console.log(`[DigestOrchestration] Classification: relevant=${classification.isRelevant}, category=${classification.category}, confidence=${classification.confidence}`);

                    // Update document classification in DB
                    await query(
                        'UPDATE documents SET classification = $1, confidence = $2 WHERE id = $3',
                        [classification.category, classification.confidence, doc.id]
                    );

                    if (!classification.isRelevant || classification.category === 'irrelevant') {
                        console.log(`[DigestOrchestration] ✗ Document marked irrelevant, skipping extraction`);
                        continue;
                    }

                    relevantCount++;
                    console.log(`[DigestOrchestration] ✓ Document is relevant, extracting...`);

                    // Extract events and datapoints (use determined effective prompt)
                    const extraction = await llmExtractor.extractEventsAndDatapoints(doc, effectivePrompt);
                    console.log(`[DigestOrchestration] Extracted: ${extraction.events.length} events, ${extraction.datapoints.length} datapoints`);

                    // Convert events to highlights
                    for (const event of extraction.events) {
                        allHighlights.push({
                            title: event.title,
                            summary: event.summary,
                            category: event.category as any,
                            documentId: doc.id,
                            sourceUrl: doc.url,
                            effectiveDate: event.effectiveDate || null,
                            confidence: extraction.confidence,
                        });
                    }

                    // Add datapoints
                    allDatapoints.push(...extraction.datapoints);

                    processedCount++;
                    console.log(`[DigestOrchestration] ✓ Document processed successfully`);

                    // Small delay to avoid rate limits
                    await this.sleep(500);

                } catch (error) {
                    console.error(`[DigestOrchestration] ❌ Error processing document ${doc.id}:`, error);
                    // Continue with other documents
                }
            }

            console.log(`[DigestOrchestration] Processing complete:`);
            console.log(`[DigestOrchestration] - Total documents: ${documents.length}`);
            console.log(`[DigestOrchestration] - Processed: ${processedCount}`);
            console.log(`[DigestOrchestration] - Relevant: ${relevantCount}`);
            console.log(`[DigestOrchestration] - Total highlights: ${allHighlights.length}`);
            console.log(`[DigestOrchestration] - Total datapoints: ${allDatapoints.length}`);

            if (allHighlights.length === 0 && allDatapoints.length === 0) {
                console.warn(`[DigestOrchestration] ⚠️ No highlights or datapoints extracted, skipping digest`);
                return null;
            }

            // Step 2: Validate and normalize datapoints
            console.log(`[DigestOrchestration] Validating datapoints...`);
            const validatedDatapoints = this.validateAndNormalizeDatapoints(allDatapoints);
            console.log(`[DigestOrchestration] ✓ Validated ${validatedDatapoints.length} datapoints`);

            // Step 3: Generate Markdown digest
            console.log(`[DigestOrchestration] Generating Markdown summary...`);
            const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const periodEnd = new Date().toISOString();

            const markdownContent = await llmExtractor.generateDigestMarkdown(
                allHighlights,
                validatedDatapoints,
                source.name,
                periodStart,
                periodEnd
            );

            console.log(`[DigestOrchestration] ✓ Markdown generated (${markdownContent.length} chars)`);

            // Step 4: Save Markdown file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `digest-${sourceId}-${timestamp}.md`;
            const filePath = path.join(this.digestStoragePath, filename);

            await fs.writeFile(filePath, markdownContent, 'utf-8');
            console.log(`[DigestOrchestration] ✓ Markdown saved to: ${filePath}`);

            // Step 5: Save digest to database
            console.log(`[DigestOrchestration] Saving digest to database...`);
            const digest = await queryOne<CrawlDigest>(
                `INSERT INTO crawl_digests (
                    crawl_job_id, source_id, period_start, period_end,
                    summary_markdown, summary_markdown_path,
                    highlights, datapoints, metadata,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING 
                    id, crawl_job_id as "crawlJobId", source_id as "sourceId",
                    period_start as "periodStart", period_end as "periodEnd",
                    summary_markdown as "summaryMarkdown",
                    summary_markdown_path as "summaryMarkdownPath",
                    highlights, datapoints, metadata,
                    created_at as "createdAt", updated_at as "updatedAt"`,
                [
                    crawlJobId,
                    sourceId,
                    periodStart,
                    periodEnd,
                    markdownContent,
                    filePath,
                    JSON.stringify(allHighlights),
                    JSON.stringify(validatedDatapoints),
                    JSON.stringify({
                        totalDocuments: documents.length,
                        relevantDocuments: relevantCount,
                        highlightsCount: allHighlights.length,
                        datapointsCount: validatedDatapoints.length,
                    }),
                ]
            );

            if (!digest) {
                throw new Error('Failed to insert digest record');
            }

            console.log(`[DigestOrchestration] ✓ Digest record created: ${digest.id}`);

            // Step 6: Populate normalized digest_highlights table
            console.log(`[DigestOrchestration] Populating digest_highlights table...`);
            if (allHighlights.length > 0) {
                for (const highlight of allHighlights) {
                    try {
                        await query(
                            `INSERT INTO digest_highlights (
                                digest_id, text, type, source_url, category, metadata
                            ) VALUES ($1, $2, $3, $4, $5, $6)`,
                            [
                                digest.id,
                                highlight.summary || highlight.title || '', // text field
                                highlight.category || null, // type
                                highlight.sourceUrl || null, // source_url
                                highlight.category || null, // category (duplicate for now)
                                JSON.stringify({
                                    title: highlight.title,
                                    documentId: highlight.documentId,
                                    effectiveDate: highlight.effectiveDate,
                                    confidence: highlight.confidence
                                })
                            ]
                        );
                    } catch (highlightError) {
                        console.error(`[DigestOrchestration] Warning: Failed to insert highlight:`, highlightError);
                        // Don't fail the whole digest if one highlight fails
                    }
                }
                console.log(`[DigestOrchestration] ✓ Inserted ${allHighlights.length} highlights`);
            }

            // Step 7: Populate normalized digest_datapoints table
            console.log(`[DigestOrchestration] Populating digest_datapoints table...`);
            if (validatedDatapoints.length > 0) {
                for (const datapoint of validatedDatapoints) {
                    try {
                        await query(
                            `INSERT INTO digest_datapoints (
                                digest_id, field, value, unit, context, source_url, effective_date, metadata
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [
                                digest.id,
                                datapoint.indicatorCode || 'unknown', // field
                                String(datapoint.value), // value (convert to string)
                                datapoint.unit || null, // unit
                                datapoint.description || null, // context
                                datapoint.sourceUrl || null, // source_url
                                datapoint.effectiveDate || null, // effective_date
                                JSON.stringify({
                                    country: datapoint.country,
                                    sourceDocumentId: datapoint.sourceDocumentId
                                })
                            ]
                        );
                    } catch (datapointError) {
                        console.error(`[DigestOrchestration] Warning: Failed to insert datapoint:`, datapointError);
                        // Don't fail the whole digest if one datapoint fails
                    }
                }
                console.log(`[DigestOrchestration] ✓ Inserted ${validatedDatapoints.length} datapoints`);
            }

            // Step 8: Update denormalized counts on crawl_digests
            console.log(`[DigestOrchestration] Updating denormalized counts...`);
            await query(
                `UPDATE crawl_digests 
                 SET highlights_count = $1, datapoints_count = $2, updated_at = NOW()
                 WHERE id = $3`,
                [allHighlights.length, validatedDatapoints.length, digest.id]
            );
            console.log(`[DigestOrchestration] ✓ Updated counts: ${allHighlights.length} highlights, ${validatedDatapoints.length} datapoints`);

            console.log(`[DigestOrchestration] ✓✓✓ Digest created successfully ✓✓✓`);
            console.log(`[DigestOrchestration] Digest ID: ${digest.id}`);

            return digest;

        } catch (error) {
            console.error('[DigestOrchestration] ❌ Digest generation failed:', error);
            console.error('[DigestOrchestration] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            throw error;
        }
    }

    /**
     * Heuristic parser to extract key rates (interest / policy rates) from plain text content.
     * Returns an array of DigestDatapoint objects which will be added to the digest even
     * if the LLM later marks the page irrelevant.
     */
    private extractKeyRatesFromContent(content: string, doc: Document): DigestDatapoint[] {
        const results: DigestDatapoint[] = [];
        if (!content || content.length < 20) return results;

        // Common labels to look for near numeric rates
        const labels = [
            'policy rate', 'interest rate', 'overnight', 'repurchase', 'reverse repurchase',
            'deposit rate', 'lending rate', 'reference rate', 'key rate', 'key rates', 'repo rate'
        ];

        // Regex: look for label followed within 40 chars by a percentage number
        const labelPattern = labels.map(l => l.replace(/\s+/g, '\\s+')).join('|');
        const re = new RegExp(`(?:${labelPattern})[^\n\r]{0,60}?([0-9]+(?:\.[0-9]+)?)\s*%`, 'gi');

        const seen = new Set<string>();
        let m: RegExpExecArray | null;
        while ((m = re.exec(content)) !== null) {
            try {
                // m[0] contains the matched snippet; extract a short label from it
                const snippet = m[0];
                // get label text before the number
                const labelMatch = snippet.match(new RegExp(`(${labelPattern})`, 'i'));
                const label = (labelMatch && labelMatch[1]) ? labelMatch[1].trim() : 'Key rate';
                const value = parseFloat(m[1]);
                if (isNaN(value)) continue;
                // Try to find an effective date near the matched snippet (100 chars window)
                const matchIndex = (m as any).index ?? content.indexOf(m[0]);
                const windowStart = Math.max(0, matchIndex - 100);
                const windowEnd = Math.min(content.length, matchIndex + 100);
                const nearby = content.slice(windowStart, windowEnd);
                const parsedDate = this.parseDateFromText(nearby);

                const indicatorCode = `BSP_RATE_${label.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`;
                const dedupKey = `${indicatorCode}:${value}:${parsedDate || 'null'}`;
                if (seen.has(dedupKey)) continue;
                seen.add(dedupKey);
                results.push({
                    indicatorCode,
                    description: label,
                    value,
                    unit: 'percent',
                    effectiveDate: parsedDate,
                    country: 'PH',
                    metadata: { sourceTitle: doc.title, snippet: snippet.trim().slice(0, 200) },
                    sourceDocumentId: doc.id,
                    sourceUrl: doc.url,
                    confidence: 0.95,
                });
            } catch (err) {
                // ignore and continue
            }
        }

        // Also scan lines for patterns like "Policy Rate — 6.25%" not caught above
        const lineRe = new RegExp(`(${labelPattern}).{0,40}?(?:[:–—\-\\s]){0,6}([0-9]+(?:\.[0-9]+)?)\s*%`, 'im');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
            const lm = line.match(lineRe);
            if (lm && lm[2]) {
                const label = lm[1].trim();
                const value = parseFloat(lm[2]);
                if (isNaN(value)) continue;
                // Attempt to parse a date from the same line
                const parsedDate = this.parseDateFromText(line);
                const indicatorCode = `BSP_RATE_${label.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`;
                const dedupKey = `${indicatorCode}:${value}:${parsedDate || 'null'}`;
                if (seen.has(dedupKey)) continue;
                seen.add(dedupKey);

                results.push({
                    indicatorCode,
                    description: label,
                    value,
                    unit: 'percent',
                    effectiveDate: parsedDate,
                    country: 'PH',
                    metadata: { sourceTitle: doc.title, line: line.trim().slice(0, 200) },
                    sourceDocumentId: doc.id,
                    sourceUrl: doc.url,
                    confidence: 0.95,
                });
            }
        }

        return results;
    }

    /**
     * Attempt to parse a date string from a piece of text. Returns ISO date (YYYY-MM-DD) or null.
     */
    private parseDateFromText(text: string): string | null {
        if (!text) return null;

        // 1) ISO YYYY-MM-DD
        const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (isoMatch) {
            const d = new Date(isoMatch[1]);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }

        // 2) Month name formats e.g. "November 18, 2025" or "18 November 2025"
        const monthMatch = text.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\,?\s+\d{4})\b/i);
        if (monthMatch) {
            const parsed = new Date(monthMatch[1]);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        }

        // 3) Month name with leading month (e.g., "November 18, 2025")
        const monthMatch2 = text.match(/\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/i);
        if (monthMatch2) {
            const parsed = new Date(monthMatch2[1]);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        }

        // 4) Numeric dates like DD/MM/YYYY or DD-MM-YYYY (assume day-first for PH sites)
        const numericMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
        if (numericMatch) {
            let day = parseInt(numericMatch[1], 10);
            let month = parseInt(numericMatch[2], 10);
            let year = parseInt(numericMatch[3], 10);
            if (year < 100) year += 2000;

            // Assume DD/MM/YYYY (day-first). If month > 12, swap.
            if (month > 12 && day <= 12) {
                const tmp = day; day = month; month = tmp;
            }

            const d = new Date(Date.UTC(year, month - 1, day));
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }

        // 5) "as of" patterns
        const asOfMatch = text.match(/as of\s+([A-Za-z0-9 ,\-\/]+\d{4})/i);
        if (asOfMatch) {
            const parsed = new Date(asOfMatch[1]);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        }

        return null;
    }

    /**
     * Validate and normalize extracted datapoints
     */
    private validateAndNormalizeDatapoints(datapoints: DigestDatapoint[]): DigestDatapoint[] {
        const validated: DigestDatapoint[] = [];
        const seen = new Set<string>();

        for (const dp of datapoints) {
            try {
                // Normalize effective date
                let effectiveDate = dp.effectiveDate;
                if (effectiveDate) {
                    const date = new Date(effectiveDate);
                    if (!isNaN(date.getTime())) {
                        effectiveDate = date.toISOString().split('T')[0];
                    } else {
                        effectiveDate = null;
                    }
                }

                // Normalize units
                let unit = dp.unit;
                if (unit) {
                    unit = unit.trim().toLowerCase();
                    // Standardize common units
                    const unitMap: Record<string, string> = {
                        '%': 'percent',
                        'pct': 'percent',
                        'percentage': 'percent',
                        'php': 'PHP',
                        'peso': 'PHP',
                        'pesos': 'PHP',
                        'mw': 'MW',
                        'megawatt': 'MW',
                        'megawatts': 'MW',
                        'kwh': 'kWh',
                        'kilowatt-hour': 'kWh',
                    };
                    unit = unitMap[unit] || unit;
                }

                // Create deduplication key
                const dedupKey = `${dp.indicatorCode}:${dp.value}:${effectiveDate || 'null'}`;
                if (seen.has(dedupKey)) {
                    continue; // Skip duplicate
                }
                seen.add(dedupKey);

                // Add normalized datapoint
                validated.push({
                    ...dp,
                    effectiveDate,
                    unit: unit || null,
                    confidence: dp.confidence ?? 0.8,
                });

            } catch (error) {
                console.warn('[DigestOrchestration] Failed to validate datapoint:', error);
                continue;
            }
        }

        return validated;
    }

    /**
     * Get digest by crawl job ID
     * Now includes highlights and datapoints from normalized tables
     */
    async getDigestByJobId(crawlJobId: string): Promise<CrawlDigest | null> {
        // First get the main digest record
        const digest = await queryOne<any>(
            `SELECT 
                cd.id, 
                cd.crawl_job_id, 
                cd.source_id,
                s.name as source_name,
                cd.period_start, 
                cd.period_end,
                cd.summary_markdown,
                cd.summary_markdown_path,
                cd.highlights_count,
                cd.datapoints_count,
                cd.metadata,
                cj.completed_at,
                cd.created_at, 
                cd.updated_at
             FROM crawl_digests cd
             LEFT JOIN sources s ON s.id = cd.source_id
             LEFT JOIN crawl_jobs cj ON cj.id = cd.crawl_job_id
             WHERE cd.crawl_job_id = $1`,
            [crawlJobId]
        );

        if (!digest) {
            return null;
        }

        // Fetch highlights from normalized table
        const highlightRows = await query<DigestHighlightRow>(
            `SELECT 
                id, digest_id, text, type, source_url, document_id, 
                category, importance, metadata, created_at
             FROM digest_highlights
             WHERE digest_id = $1
             ORDER BY importance DESC, created_at ASC`,
            [digest.id]
        );

        // Fetch datapoints from normalized table
        const datapointRows = await query<DigestDatapointRow>(
            `SELECT 
                id, digest_id, field, value, unit, context, source_url, 
                document_id, effective_date, metadata, created_at
             FROM digest_datapoints
             WHERE digest_id = $1
             ORDER BY effective_date DESC NULLS LAST, created_at ASC`,
            [digest.id]
        );

        // Map database rows to API format (DigestHighlight and DigestDatapoint)
        const highlights: DigestHighlight[] = (highlightRows || []).map(row => ({
            title: row.text.split('\n')[0] || row.text.substring(0, 100), // First line as title
            summary: row.text,
            category: row.category as any || 'other',
            documentId: row.document_id || null,
            sourceUrl: row.source_url || '',
            effectiveDate: (row.metadata?.effective_date as string) || null,
            confidence: typeof row.importance === 'number' ? row.importance : 0.8,
        }));

        const datapoints: DigestDatapoint[] = (datapointRows || []).map(row => ({
            indicatorCode: row.field.toUpperCase().replace(/\s+/g, '_'),
            description: row.context || row.field,
            value: row.value,
            unit: row.unit || null,
            effectiveDate: row.effective_date || null,
            country: 'Philippines',
            metadata: row.metadata || {},
            sourceDocumentId: row.document_id || '',
            sourceUrl: row.source_url || '',
            confidence: 0.9,
        }));

        // Return complete digest with normalized data
        return {
            ...digest,
            highlights,
            datapoints,
        } as CrawlDigest;
    }

    /**
     * List digests with pagination
     */
    async listDigests(options: {
        sourceId?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        items: CrawlDigest[];
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    }> {
        const page = options.page ?? 1;
        const pageSize = options.pageSize ?? 20;
        const offset = (page - 1) * pageSize;

        let whereClause = '';
        const params: any[] = [];
        let paramIndex = 1;

        if (options.sourceId) {
            whereClause = `WHERE source_id = $${paramIndex}`;
            params.push(options.sourceId);
            paramIndex++;
        }

        // Get total count
        const countResult = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM crawl_digests ${whereClause}`,
            params
        );
        const totalItems = parseInt(countResult?.count || '0', 10);

        // Get paginated results with denormalized counts
        params.push(pageSize, offset);
        const digests = await query<CrawlDigest>(
            `SELECT 
                cd.id, 
                cd.crawl_job_id, 
                cd.source_id,
                s.name as source_name,
                cd.period_start, 
                cd.period_end,
                cd.summary_markdown,
                cd.summary_markdown_path,
                COALESCE(cd.highlights_count, 0) as highlights_count,
                COALESCE(cd.datapoints_count, 0) as datapoints_count,
                cd.metadata,
                cj.completed_at,
                cd.created_at, 
                cd.updated_at
             FROM crawl_digests cd
             LEFT JOIN sources s ON s.id = cd.source_id
             LEFT JOIN crawl_jobs cj ON cj.id = cd.crawl_job_id
             ${whereClause}
             ORDER BY cd.created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        // Add empty highlights/datapoints arrays for list view (full data in getDigestByJobId)
        const mappedDigests = digests.map(d => ({
            ...d,
            highlights: [],
            datapoints: [],
        })) as CrawlDigest[];

        return {
            items: mappedDigests,
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const digestOrchestrator = new DigestOrchestrationService();
