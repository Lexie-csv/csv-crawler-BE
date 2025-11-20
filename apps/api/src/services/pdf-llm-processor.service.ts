import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import type { PdfSourceConfig, ExtractedPolicyDocument, HtmlPageContent, ExtractedHtmlContent } from '@csv/types';

export class PdfLlmProcessor {
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) this.openai = new OpenAI({ apiKey });
        else console.warn('[PdfLlmProcessor] OPENAI_API_KEY not set — LLM extraction will be skipped');
    }

    /**
     * Process all PDFs in a source download directory and optionally run LLM extraction
     */
    async processDownloads(config: PdfSourceConfig, useLlm = true): Promise<ExtractedPolicyDocument[]> {
        const downloadsDir = config.downloadDir;
        const resultsDir = './storage/pdf-crawls';
        await fs.mkdir(resultsDir, { recursive: true });

        // Load previously extracted raw_text_hashes to skip
        const existingHashes = new Set<string>();
        try {
            const files = await fs.readdir(resultsDir);
            for (const f of files) {
                if (f.startsWith(config.name) && f.includes('extracted') && f.endsWith('.json')) {
                    try {
                        const content = await fs.readFile(path.join(resultsDir, f), 'utf8');
                        const arr = JSON.parse(content) as ExtractedPolicyDocument[];
                        for (const it of arr) if (it.raw_text_hash) existingHashes.add(it.raw_text_hash);
                    } catch {}
                }
            }
        } catch {}

        // List PDFs in downloads dir
        const files = await fs.readdir(downloadsDir).catch(() => []);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

        const extracted: ExtractedPolicyDocument[] = [];

        for (const fileName of pdfFiles) {
            const filePath = path.join(downloadsDir, fileName);
            try {
                console.log(`\n🗂️  Parsing PDF: ${fileName}`);
                const fileBuffer = await fs.readFile(filePath);

                // PDFParse
                const { PDFParse } = pdfParse as any;
                const parser = new PDFParse({ data: fileBuffer } as any);
                const textResult = await parser.getText();
                const text = (textResult && textResult.text) ? textResult.text : '';
                try { await parser.destroy(); } catch {}

                const hash = crypto.createHash('sha256').update(text).digest('hex');
                if (existingHashes.has(hash)) {
                    console.log('  ↩️  Skipping — already processed (hash match)');
                    continue;
                }

                // Build base result
                const base: ExtractedPolicyDocument = {
                    is_relevant: false,
                    reason: 'Not processed yet',
                    category: 'other',
                    title: fileName,
                    source_url: null as any,
                    issuing_body: null,
                    published_date: null,
                    effective_date: null,
                    jurisdiction: 'Philippines',
                    summary: null,
                    key_numbers: [],
                    topics: [],
                    raw_text_hash: hash,
                    file_path: filePath,
                    raw_text_excerpt: text.substring(0, 2000),
                } as any;

                // Run LLM if enabled and available
                if (useLlm && this.openai) {
                    try {
                        const llmRes = await this.extractPolicyFromPdf({
                            text,
                            sourceUrl: base.source_url || '',
                            sourceName: config.name,
                        });

                        if (llmRes) {
                            // merge fields
                            const out: any = { ...llmRes };
                            out.file_path = filePath;
                            out.raw_text_hash = hash;
                            extracted.push(out as ExtractedPolicyDocument);
                            existingHashes.add(hash);
                            console.log(`  ✅ Extracted: ${out.title || fileName} (relevant=${out.is_relevant})`);
                            continue;
                        }
                    } catch (e) {
                        console.error('  ❌ LLM extraction failed:', e);
                    }
                }

                // fallback store base
                extracted.push(base);
                existingHashes.add(hash);
            } catch (err) {
                console.error(`  ❌ Failed to process ${fileName}:`, err instanceof Error ? err.message : String(err));
            }
        }

        // Save extracted results
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const outPath = path.join(resultsDir, `${config.name}_extracted_${timestamp}.json`);
        await fs.writeFile(outPath, JSON.stringify(extracted, null, 2), 'utf8');
        console.log(`\n💾 Extracted results saved: ${outPath}`);

        return extracted;
    }

    /**
     * Call OpenAI to extract structured policy JSON from PDF text
     */
    private async extractPolicyFromPdf(args: { text: string; sourceUrl: string; sourceName: string; }) {
        if (!this.openai) return null;

        const system = `You are an expert analyst of Philippine energy and regulatory policy.
You receive the full text of a PDF document from DOE, ERC, or a related Philippine government body.
The document may be a circular, order, resolution, tariff decision, or other regulatory issuance.

Your job:
Decide if this document is relevant to energy policy, regulation, tariffs, rate changes, or market rules.

If relevant, extract structured information about the issuance.

Always include the original source_url so a human can verify the information.

Respond only with a single JSON object matching the schema. Do not output any surrounding text.`;

        const userPayload = JSON.stringify({
            source_name: args.sourceName,
            source_url: args.sourceUrl,
            raw_text: args.text.slice(0, 15000),
        });

        const res = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: userPayload },
            ],
            temperature: 0.1,
            max_tokens: 2000,
        });

        const content = res.choices?.[0]?.message?.content;
        if (!content) {
            console.error('[PdfLlmProcessor] Empty response from OpenAI');
            return null;
        }

        // Save raw response for debugging/audit
        try {
            const rawDir = path.join('./storage/pdf-crawls/raw-responses', args.sourceName);
            await fs.mkdir(rawDir, { recursive: true }).catch(() => {});
            const stamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
            const outFile = path.join(rawDir, `${stamp}_${crypto.createHash('sha1').update(content).digest('hex')}.txt`);
            await fs.writeFile(outFile, content, 'utf8').catch(() => {});
        } catch (e) {
            // non-blocking
        }

        // Try strict parse first, then fall back to tolerant cleaning heuristics
        const tryParse = (s: string) => {
            try {
                return JSON.parse(s);
            } catch (_e) {
                return null;
            }
        };

        // 1) strict
        let parsed = tryParse(content);
        if (parsed) return parsed;

        // 2) strip triple/backtick fences if present
        let cleaned = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        parsed = tryParse(cleaned);
        if (parsed) return parsed;

        // 3) replace smart quotes and stray backticks, remove common leading text
        cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/`/g, '');
        // remove any non-json prefix/suffix that commonly appears (e.g., "Result:\n")
        const firstBrace = cleaned.indexOf('{');
        const firstBracket = cleaned.indexOf('[');
        const startIdx = (firstBrace === -1) ? firstBracket : (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));
        if (startIdx > 0) cleaned = cleaned.slice(startIdx);

        // remove trailing commas before closing braces/brackets
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

        parsed = tryParse(cleaned);
        if (parsed) return parsed;

        // 4) attempt to fix common unescaped newlines in strings by removing literal newlines inside quotes
        const fixNewlinesInStrings = (s: string) => s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (m) => m.replace(/\n/g, '\\n'));
        cleaned = fixNewlinesInStrings(cleaned);
        parsed = tryParse(cleaned);
        if (parsed) return parsed;

        // If all attempts failed, log and return null (caller will handle)
        console.error('[PdfLlmProcessor] Failed to parse JSON from LLM after cleaning; saved raw response to storage/pdf-crawls/raw-responses');
        return null;
    }

    /**
     * Public wrapper to process a block of text through the LLM extractor.
     * Useful for re-processing individual PDFs from CLI or scripts.
     */
    async processText(text: string, sourceUrl: string, sourceName: string) {
        return this.extractPolicyFromPdf({ text, sourceUrl, sourceName });
    }

    /**
     * Analyze HTML content using OpenAI LLM and extract structured policy information
     */
    async analyzeHtmlContent(
        htmlContent: HtmlPageContent,
        sourceName: string
    ): Promise<ExtractedHtmlContent | null> {
        if (!this.openai) {
            console.warn('[PdfLlmProcessor] OPENAI_API_KEY not set, skipping HTML analysis');
            return null;
        }

        try {
            console.log(`\n🌐 Analyzing HTML content from: ${htmlContent.url}`);

            // Combine all text content for analysis
            const combinedText = [
                htmlContent.mainText,
                ...htmlContent.announcements,
                // Include table data as text
                ...htmlContent.tables.flatMap(t => 
                    [t.headers.join(' | '), ...t.rows.map(r => r.join(' | '))]
                ),
            ].join('\n\n');

            // Create hash for deduplication
            const hash = crypto.createHash('sha256').update(combinedText).digest('hex');

            // Check if already processed (optional - caller can handle this)
            // For now, always process since HTML analysis is new

            const system = `You are an expert analyst of Philippine energy and regulatory policy.
You receive the content extracted from a webpage on a Philippine government website (DOE, ERC, or related agency).
The content may include announcements, tables, news articles, circulars, or other policy information.

Your job:
1. Decide if this webpage content is relevant to energy policy, regulation, tariffs, rate changes, or market rules.
2. If relevant, extract structured information about the announcement, policy, or data.
3. Identify whether the content is primarily an announcement, table data, news article, or policy document.

Always include the original source_url so a human can verify the information.

Respond only with a single JSON object matching this schema:
{
  "is_relevant": boolean,
  "reason": string,
  "category": "circular" | "order" | "resolution" | "announcement" | "news" | "table_data" | "other",
  "title": string,
  "source_url": string,
  "issuing_body": string,
  "published_date": string | null (YYYY-MM-DD format),
  "effective_date": string | null (YYYY-MM-DD format),
  "jurisdiction": string,
  "summary": string (3-5 sentences),
  "key_numbers": [{"name": string, "value": number, "unit": string}],
  "topics": string[],
  "content_type": "html_page" | "html_table" | "html_announcement",
  "raw_text_excerpt": string (first 500 chars),
  "raw_text_hash": string
}

Do not output any surrounding text, only the JSON object.`;

            const userPayload = JSON.stringify({
                source_name: sourceName,
                source_url: htmlContent.url,
                page_title: htmlContent.title,
                meta_description: htmlContent.metaDescription,
                main_text: combinedText.slice(0, 10000), // Limit to 10k chars
                has_tables: htmlContent.tables.length > 0,
                table_count: htmlContent.tables.length,
                announcement_count: htmlContent.announcements.length,
                metadata: htmlContent.metadata,
            });

            const res = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: userPayload },
                ],
                temperature: 0.1,
                max_tokens: 2500,
            });

            const content = res.choices?.[0]?.message?.content;
            if (!content) {
                console.error('[PdfLlmProcessor] Empty response from OpenAI for HTML content');
                return null;
            }

            // Save raw response for debugging/audit
            try {
                const rawDir = path.join('./storage/pdf-crawls/raw-responses', `${sourceName}_html`);
                await fs.mkdir(rawDir, { recursive: true }).catch(() => {});
                const stamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
                const outFile = path.join(rawDir, `${stamp}_${crypto.createHash('sha1').update(content).digest('hex')}.txt`);
                await fs.writeFile(outFile, content, 'utf8').catch(() => {});
            } catch (e) {
                // non-blocking
            }

            // Use same tolerant JSON parsing as PDF extraction
            const parsed = this.tolerantJsonParse(content);
            if (!parsed) {
                console.error('[PdfLlmProcessor] Failed to parse HTML analysis JSON; saved raw response');
                return null;
            }

            // Add hash and excerpt if not provided by LLM
            if (!parsed.raw_text_hash) {
                parsed.raw_text_hash = hash;
            }
            if (!parsed.raw_text_excerpt) {
                parsed.raw_text_excerpt = combinedText.substring(0, 500);
            }

            console.log(`  ✅ HTML Analysis: ${parsed.title || htmlContent.title} (relevant=${parsed.is_relevant})`);
            return parsed as ExtractedHtmlContent;

        } catch (error) {
            console.error('[PdfLlmProcessor] Error analyzing HTML content:', error);
            return null;
        }
    }

    /**
     * Tolerant JSON parser extracted as reusable method
     */
    private tolerantJsonParse(content: string): any {
        const tryParse = (s: string) => {
            try {
                return JSON.parse(s);
            } catch (_e) {
                return null;
            }
        };

        // 1) strict
        let parsed = tryParse(content);
        if (parsed) return parsed;

        // 2) strip triple/backtick fences if present
        let cleaned = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        parsed = tryParse(cleaned);
        if (parsed) return parsed;

        // 3) replace smart quotes and stray backticks, remove common leading text
        cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/`/g, '');
        const firstBrace = cleaned.indexOf('{');
        const firstBracket = cleaned.indexOf('[');
        const startIdx = (firstBrace === -1) ? firstBracket : (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));
        if (startIdx > 0) cleaned = cleaned.slice(startIdx);

        // remove trailing commas before closing braces/brackets
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

        parsed = tryParse(cleaned);
        if (parsed) return parsed;

        // 4) attempt to fix common unescaped newlines in strings
        const fixNewlinesInStrings = (s: string) => s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (m) => m.replace(/\n/g, '\\n'));
        cleaned = fixNewlinesInStrings(cleaned);
        parsed = tryParse(cleaned);
        if (parsed) return parsed;

        return null;
    }
}

export default PdfLlmProcessor;
