import OpenAI from 'openai';
import { z } from 'zod';
import {
    DocumentClassification,
    ExtractionResult,
    DigestDatapoint,
    DigestHighlight
} from '@csv/types';

/**
 * Create a dynamic classification schema based on source type
 */
function createClassificationSchema(sourceType?: string): z.ZodSchema {
    // For news sources, use flexible categories
    if (sourceType === 'news') {
        return z.object({
            isRelevant: z.boolean(),
            category: z.string(), // Accept any string for news
            confidence: z.number().min(0).max(1),
            reasoning: z.string().optional(),
        });
    }

    // For policy sources (DOE, BSP, etc.), use strict categories
    return z.object({
        isRelevant: z.boolean(),
        category: z.enum(['circular', 'ppa', 'price_change', 'energy_mix', 'policy', 'regulation', 'announcement', 'data_report', 'other', 'irrelevant']),
        confidence: z.number().min(0).max(1),
        reasoning: z.string().optional(),
    });
}

const EventSchema = z.object({
    title: z.string(),
    summary: z.string(),
    category: z.string(),
    effectiveDate: z.string().nullable().optional(),
});

const DatapointSchema = z.object({
    indicatorCode: z.string(),
    description: z.string(),
    value: z.union([z.string(), z.number()]),
    unit: z.string().nullable().optional(),
    effectiveDate: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    sourceDocumentId: z.string(),
    sourceUrl: z.string(),
    confidence: z.number().min(0).max(1).optional(),
});

const ExtractionResultSchema = z.object({
    events: z.array(EventSchema),
    datapoints: z.array(DatapointSchema),
    confidence: z.number().min(0).max(1),
});

interface Document {
    id: string;
    source_id: string;
    url: string;
    title: string;
    content: string;
}

export class LLMExtractionService {
    private openai: OpenAI | null = null;
    private model: string;
    private apiKey: string | null;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || null;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        // Only initialize OpenAI client when actually needed
        if (this.apiKey) {
            this.openai = new OpenAI({ apiKey: this.apiKey });
        }
    }

    private ensureInitialized(): void {
        if (!this.apiKey || !this.openai) {
            throw new Error('OPENAI_API_KEY environment variable is required for LLM extraction. Please set it in your .env file.');
        }
    }

    /**
     * NODE 1: Classify document relevance
     * @param document - The document to classify
     * @param customPrompt - Optional custom extraction prompt from source configuration
     * @param sourceType - Source type (e.g., 'news', 'policy') for schema selection
     */
    async classifyRelevance(document: Document, customPrompt?: string, sourceType?: string): Promise<DocumentClassification> {
        this.ensureInitialized();

        // Create dynamic schema based on source type
        const ClassificationSchema = createClassificationSchema(sourceType);

        // Use custom prompt if provided, otherwise use default
        const prompt = customPrompt ?
            `${customPrompt}

Document Title: ${document.title}
Document URL: ${document.url}
Content: ${document.content.substring(0, 3000)}

Respond in JSON format with:
{
  "isRelevant": boolean,
  "category": "circular" | "regulation" | "announcement" | "data_report" | "policy" | "other" | "irrelevant",
  "confidence": number (0-1),
  "reasoning": string (brief explanation)
}` :
            `Analyze this document and determine if it contains important regulatory, policy, or financial information.

**HIGH PRIORITY - ALWAYS MARK AS RELEVANT:**
- Interest rate announcements or updates (overnight policy rate, key policy rate, lending rates, deposit rates, BSP reference rates)
- BSP circulars, memorandums, or issuances
- Monetary policy decisions or statements
- New regulations or regulatory changes
- Banking circulars or financial institution guidelines

**ALSO RELEVANT:**
- Press releases about policy decisions
- Financial statistics or economic data reports
- Exchange rate updates
- Reserve requirement changes
- Compliance guidelines or advisories

Document Title: ${document.title}
Document URL: ${document.url}
Content: ${document.content.substring(0, 3000)}

**KEY DETECTION PATTERNS:**
If the document mentions ANY of these, mark as RELEVANT with high confidence:
- "circular" or "memorandum" or "issuance"
- "interest rate" or "policy rate" or "overnight rate"
- "monetary policy" or "Monetary Board"
- Links to regulations, circulars, or press releases
- Statistical data about rates, reserves, or economic indicators

Mark as IRRELEVANT ONLY if it's clearly:
- A feedback form or contact page
- Pure navigation without any content preview
- Generic homepage boilerplate

**IMPORTANT**: If the page contains LINKS to circulars or press releases, or PREVIEWS of regulatory content, mark it as RELEVANT so we can extract those links.

Respond in JSON format with:
{
  "isRelevant": boolean,
  "category": "circular" | "regulation" | "announcement" | "data_report" | "policy" | "other" | "irrelevant",
  "confidence": number (0-1),
  "reasoning": string (brief explanation)
}`;

        const systemMessage = customPrompt ?
            'You are an expert policy analyst. Extract relevant information according to the provided instructions.' :
            'You are an expert analyst focused on Philippine central bank (BSP) policy monitoring. Your PRIMARY GOAL is to identify interest rate updates and regulatory circulars. Be AGGRESSIVE in marking documents as relevant if they contain ANY links or references to circulars, press releases, or rate announcements.';

        try {
            const completion = await this.openai!.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemMessage,
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
            });

            const responseContent = completion.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error('Empty response from OpenAI');
            }

            const parsed = JSON.parse(responseContent);
            const validated = ClassificationSchema.parse(parsed) as DocumentClassification;

            console.log(`[LLM] Classification for ${document.id}:`, validated);
            return validated;

        } catch (error) {
            console.error('[LLM] Classification failed:', error);
            // Return safe default
            return {
                isRelevant: false,
                category: 'irrelevant',
                confidence: 0,
                reasoning: `Error: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * NODE 2: Extract events and datapoints from relevant documents
     * @param document - The document to extract from
     * @param customPrompt - Optional custom extraction prompt from source configuration
     */
    async extractEventsAndDatapoints(document: Document, customPrompt?: string): Promise<ExtractionResult> {
        this.ensureInitialized();

        const baseExtractionGuidelines = customPrompt || `Extract:
1. **Events/Updates**: New circulars, policy announcements, regulatory changes, advisories
2. **Datapoints**: Specific numeric values (rates, percentages, amounts, dates, statistics)

For each datapoint, assign an appropriate indicatorCode like:
- "CIRCULAR_NO" (for circular/memorandum numbers)
- "INTEREST_RATE" (for monetary policy rates)
- "EXCHANGE_RATE" (for currency rates)
- "INFLATION_RATE" (for inflation data)
- "RESERVE_REQ" (for reserve requirements)
- "POLICY_RATE" (for policy interest rates)
- "GDP_GROWTH" (for GDP statistics)
- Or any relevant indicator based on the content`;

        const prompt = `Extract structured information from this regulatory/policy document:

Document Title: ${document.title}
Document URL: ${document.url}
Content: ${document.content.substring(0, 5000)}

${baseExtractionGuidelines}

Respond in JSON format with:
{
  "events": [
    {
      "title": string (concise, specific title),
      "summary": string (50-150 words explaining the key points),
      "category": "circular" | "regulation" | "announcement" | "data_report" | "policy" | "other",
      "effectiveDate": "YYYY-MM-DD" or null
    }
  ],
  "datapoints": [
    {
      "indicatorCode": string (use caps and underscores, e.g., "POLICY_RATE"),
      "description": string (clear description),
      "value": string | number (the actual value),
      "unit": string or null (e.g., "percent", "PHP", "million"),
      "effectiveDate": "YYYY-MM-DD" or null,
      "country": "PH" | "SG" | "MY" | "ID" | "TH" or null,
      "metadata": object (optional additional context),
      "sourceDocumentId": "${document.id}",
      "sourceUrl": "${document.url}",
      "confidence": number (0-1)
    }
  ],
  "confidence": number (0-1, overall extraction confidence)
}`;

        const systemMessage = customPrompt ?
            'You are an expert data extractor for policy documents. Follow the extraction guidelines provided in the prompt precisely.' :
            'You are an expert data extractor for Philippine and Southeast Asian energy policy documents. Extract structured data precisely and completely.';

        try {
            const completion = await this.openai!.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemMessage,
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 2000,
            });

            const responseContent = completion.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error('Empty response from OpenAI');
            }

            const parsed = JSON.parse(responseContent);
            const validated = ExtractionResultSchema.parse(parsed);

            console.log(`[LLM] Extracted ${validated.events.length} events and ${validated.datapoints.length} datapoints from ${document.id}`);
            return validated;

        } catch (error) {
            console.error('[LLM] Extraction failed:', error);
            return {
                events: [],
                datapoints: [],
                confidence: 0,
            };
        }
    }

    /**
     * NODE 3: Generate digest summary from highlights and datapoints
     */
    async generateDigestMarkdown(
        highlights: DigestHighlight[],
        datapoints: DigestDatapoint[],
        sourceName: string,
        periodStart: string,
        periodEnd: string
    ): Promise<string> {
        this.ensureInitialized();
        const highlightsSummary = highlights.map((h, i) =>
            `${i + 1}. **${h.title}** (${h.category})\n   ${h.summary}\n   Source: ${h.sourceUrl}`
        ).join('\n\n');

        const datapointsSummary = datapoints.slice(0, 20).map((d, i) =>
            `${i + 1}. **${d.indicatorCode}**: ${d.value}${d.unit ? ' ' + d.unit : ''} - ${d.description}`
        ).join('\n');

        const prompt = `Generate a comprehensive 1-2 page digest (800-1200 words) in Markdown format summarizing this crawl:

**Source**: ${sourceName}
**Period**: ${periodStart} to ${periodEnd}

**Key Highlights** (${highlights.length} total):
${highlightsSummary}

**Key Datapoints** (${datapoints.length} total):
${datapointsSummary}

Structure your digest as follows:
# ${sourceName} - Policy & Data Digest

## Executive Summary
[2-3 paragraphs summarizing the most important updates]

## New Circulars & Policy Documents
[List and summarize new circulars, administrative orders, memoranda]

## Power Purchase Agreements (PPAs)
[New PPAs, contracts, or significant updates]

## Price & Market Updates
[WESM prices, retail tariffs, FIT rates, commodity prices]

## Energy Mix Updates
[Changes in coal, gas, solar, wind, hydro generation shares]

## Other Notable Changes
[Policy incentives, regulatory changes, market developments]

## Key Datapoints
[Table or list of critical numeric indicators]

---
*Generated on ${new Date().toISOString().split('T')[0]}*

Write in a professional, analytical tone. Be concise but informative.`;

        try {
            const completion = await this.openai!.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert policy analyst and technical writer specializing in energy sector reports. Write clear, professional digests.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.3,
                max_tokens: 3000,
            });

            const markdown = completion.choices[0]?.message?.content;
            if (!markdown) {
                throw new Error('Empty digest generated');
            }

            console.log(`[LLM] Generated digest (${markdown.length} chars)`);
            return markdown;

        } catch (error) {
            console.error('[LLM] Digest generation failed:', error);
            // Return basic fallback digest
            return `# ${sourceName} - Policy & Data Digest

## Executive Summary
Error generating digest: ${error instanceof Error ? error.message : String(error)}

${highlights.length} highlights and ${datapoints.length} datapoints were extracted.

---
*Generated on ${new Date().toISOString().split('T')[0]}*`;
        }
    }
}

export const llmExtractor = new LLMExtractionService();
