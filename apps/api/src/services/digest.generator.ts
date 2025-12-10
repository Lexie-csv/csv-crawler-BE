/**
 * Executive Digest Generator
 * 
 * Generates 1-2 page executive summaries answering:
 * - What changed?
 * - So what? (Impact analysis)
 * - What to watch? (Forward-looking implications)
 * 
 * Format: Analyst-friendly, actionable intelligence
 */

import OpenAI from 'openai';
import { ScanResult, PolicySignal } from './policy.scanner';

export interface DigestSection {
    title: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
}

export interface ExecutiveDigest {
    id: string;
    generatedAt: Date;
    period: string; // e.g., "November 15-19, 2025"
    title: string;
    summary: string;
    sections: {
        whatChanged: DigestSection[];
        soWhat: DigestSection[];
        whatToWatch: DigestSection[];
    };
    keyDatapoints: DatapointSummary[];
    sources: string[];
    metadata: {
        totalDocuments: number;
        relevantDocuments: number;
        signalsDetected: number;
    };
}

export interface DatapointSummary {
    category: string;
    key: string;
    oldValue?: string;
    newValue: string;
    effectiveDate?: Date;
    source: string;
    impact: 'high' | 'medium' | 'low';
}

export class DigestGenerator {
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
    }

    /**
     * Generate executive digest from scan results
     */
    async generate(scanResults: ScanResult[], period?: string): Promise<ExecutiveDigest> {
        // Filter relevant results only
        const relevantResults = scanResults.filter(r => r.isRelevant && r.relevanceScore >= 70);

        // Generate digest ID
        const digestId = this.generateDigestId();

        // Extract all signals
        const allSignals = relevantResults.flatMap(r => r.signals);

        // Generate period string
        const periodStr = period || this.generatePeriod();

        // Generate sections
        const sections = await this.generateSections(relevantResults, allSignals);

        // Extract key datapoints
        const keyDatapoints = this.extractKeyDatapoints(allSignals);

        // Generate summary
        const summary = await this.generateSummary(sections, keyDatapoints);

        return {
            id: digestId,
            generatedAt: new Date(),
            period: periodStr,
            title: `Policy & Market Scanner Digest — ${periodStr}`,
            summary,
            sections,
            keyDatapoints,
            sources: relevantResults.map(r => r.url),
            metadata: {
                totalDocuments: scanResults.length,
                relevantDocuments: relevantResults.length,
                signalsDetected: allSignals.length,
            },
        };
    }

    /**
     * Generate "What Changed" section
     */
    private async generateWhatChanged(results: ScanResult[], signals: PolicySignal[]): Promise<DigestSection[]> {
        const sections: DigestSection[] = [];

        // Group signals by type
        const signalsByType = this.groupSignalsByType(signals);

        for (const [type, typeSignals] of Object.entries(signalsByType)) {
            if (typeSignals.length === 0) continue;

            const content = this.formatSignalGroup(type, typeSignals);

            sections.push({
                title: this.getSignalTypeTitle(type),
                content,
                priority: this.getSignalPriority(type, typeSignals),
            });
        }

        // Sort by priority
        sections.sort((a, b) => this.comparePriority(a.priority, b.priority));

        return sections;
    }

    /**
     * Generate "So What" section (impact analysis)
     */
    private async generateSoWhat(results: ScanResult[], signals: PolicySignal[]): Promise<DigestSection[]> {
        if (!this.openai) {
            return this.generateSoWhatFallback(signals);
        }

        const sections: DigestSection[] = [];

        // Group high-priority signals
        const highPrioritySignals = signals.filter(s => s.confidence >= 0.7);

        if (highPrioritySignals.length > 0) {
            try {
                const prompt = this.buildImpactAnalysisPrompt(highPrioritySignals);

                const response = await this.openai.chat.completions.create({
                    model: process.env.LLM_MODEL || 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a senior policy analyst providing impact analysis. Be concise, specific, and actionable. Focus on market/business implications.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                    max_tokens: 1000,
                });

                const analysis = response.choices[0]?.message?.content || '';

                sections.push({
                    title: 'Market Impact',
                    content: analysis,
                    priority: 'high',
                });
            } catch (error) {
                console.error('[DigestGenerator] Impact analysis failed:', error);
                return this.generateSoWhatFallback(signals);
            }
        }

        return sections;
    }

    /**
     * Generate "What to Watch" section (forward-looking)
     */
    private async generateWhatToWatch(results: ScanResult[], signals: PolicySignal[]): Promise<DigestSection[]> {
        const sections: DigestSection[] = [];

        // Look for regulatory timelines
        const timelineSignals = signals.filter(s => s.type === 'regulatory_timeline' && s.effectiveDate);

        if (timelineSignals.length > 0) {
            const upcoming = timelineSignals
                .filter(s => s.effectiveDate && s.effectiveDate > new Date())
                .sort((a, b) => (a.effectiveDate?.getTime() || 0) - (b.effectiveDate?.getTime() || 0));

            if (upcoming.length > 0) {
                const content = upcoming
                    .map(s => `• ${s.title} (${this.formatDate(s.effectiveDate)})`)
                    .join('\n');

                sections.push({
                    title: 'Upcoming Deadlines',
                    content,
                    priority: 'high',
                });
            }
        }

        // Look for incomplete information that needs monitoring
        const lowConfidenceSignals = signals.filter(s => s.confidence < 0.7 && s.confidence >= 0.5);

        if (lowConfidenceSignals.length > 0) {
            sections.push({
                title: 'Areas Requiring Clarification',
                content: `Monitor for additional details on:\n${lowConfidenceSignals.map(s => `• ${s.title}`).join('\n')}`,
                priority: 'medium',
            });
        }

        return sections;
    }

    /**
     * Generate all sections
     */
    private async generateSections(
        results: ScanResult[],
        signals: PolicySignal[]
    ): Promise<ExecutiveDigest['sections']> {
        const [whatChanged, soWhat, whatToWatch] = await Promise.all([
            this.generateWhatChanged(results, signals),
            this.generateSoWhat(results, signals),
            this.generateWhatToWatch(results, signals),
        ]);

        return { whatChanged, soWhat, whatToWatch };
    }

    /**
     * Generate executive summary
     */
    private async generateSummary(
        sections: ExecutiveDigest['sections'],
        datapoints: DatapointSummary[]
    ): Promise<string> {
        const totalChanges = sections.whatChanged.length;
        const highPriorityChanges = sections.whatChanged.filter(s => s.priority === 'high').length;
        const keyDatapointCount = datapoints.filter(d => d.impact === 'high').length;

        return `This digest covers ${totalChanges} policy and market changes, including ${highPriorityChanges} high-priority updates. ${keyDatapointCount} key datapoints with significant market impact have been identified. Focus areas: regulatory compliance, rate changes, and energy policy developments.`;
    }

    /**
     * Extract key datapoints from signals
     */
    private extractKeyDatapoints(signals: PolicySignal[]): DatapointSummary[] {
        const datapoints: DatapointSummary[] = [];

        for (const signal of signals) {
            if (signal.type === 'rate_change') {
                // Extract rate information
                const rateMatch = signal.description.match(/(\d+(?:\.\d+)?)\s*%/);
                if (rateMatch) {
                    datapoints.push({
                        category: 'Rate Change',
                        key: signal.title,
                        newValue: rateMatch[1] + '%',
                        effectiveDate: signal.effectiveDate,
                        source: 'Policy document',
                        impact: 'high',
                    });
                }
            }
        }

        return datapoints;
    }

    /**
     * Format digest as Markdown
     */
    formatAsMarkdown(digest: ExecutiveDigest): string {
        let md = `# ${digest.title}\n\n`;
        md += `**Generated**: ${this.formatDate(digest.generatedAt)}\n\n`;
        md += `## Executive Summary\n\n${digest.summary}\n\n`;
        md += `---\n\n`;

        // What Changed
        md += `## 📋 What Changed\n\n`;
        for (const section of digest.sections.whatChanged) {
            md += `### ${section.title}\n`;
            md += `**Priority**: ${section.priority.toUpperCase()}\n\n`;
            md += `${section.content}\n\n`;
        }

        // So What
        if (digest.sections.soWhat.length > 0) {
            md += `## 💡 So What? (Impact Analysis)\n\n`;
            for (const section of digest.sections.soWhat) {
                md += `### ${section.title}\n\n`;
                md += `${section.content}\n\n`;
            }
        }

        // What to Watch
        if (digest.sections.whatToWatch.length > 0) {
            md += `## 👀 What to Watch\n\n`;
            for (const section of digest.sections.whatToWatch) {
                md += `### ${section.title}\n\n`;
                md += `${section.content}\n\n`;
            }
        }

        // Key Datapoints
        if (digest.keyDatapoints.length > 0) {
            md += `## 📊 Key Datapoints\n\n`;
            md += `| Category | Metric | New Value | Effective Date | Impact |\n`;
            md += `|----------|--------|-----------|----------------|--------|\n`;
            for (const dp of digest.keyDatapoints) {
                md += `| ${dp.category} | ${dp.key} | ${dp.newValue} | ${dp.effectiveDate ? this.formatDate(dp.effectiveDate) : 'TBD'} | ${dp.impact.toUpperCase()} |\n`;
            }
            md += `\n`;
        }

        // Metadata
        md += `---\n\n`;
        md += `**Documents Scanned**: ${digest.metadata.totalDocuments}\n`;
        md += `**Relevant Documents**: ${digest.metadata.relevantDocuments}\n`;
        md += `**Signals Detected**: ${digest.metadata.signalsDetected}\n\n`;

        md += `**Sources**:\n`;
        for (const source of digest.sources) {
            md += `- ${source}\n`;
        }

        return md;
    }

    // Helper methods

    private generateDigestId(): string {
        return `digest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generatePeriod(): string {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 7);

        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return `${months[start.getMonth()]} ${start.getDate()}-${now.getDate()}, ${now.getFullYear()}`;
    }

    private groupSignalsByType(signals: PolicySignal[]): Record<string, PolicySignal[]> {
        const groups: Record<string, PolicySignal[]> = {};

        for (const signal of signals) {
            if (!groups[signal.type]) {
                groups[signal.type] = [];
            }
            groups[signal.type].push(signal);
        }

        return groups;
    }

    private formatSignalGroup(type: string, signals: PolicySignal[]): string {
        return signals
            .map(s => {
                let line = `• **${s.title}**`;
                if (s.description) line += `: ${s.description}`;
                if (s.effectiveDate) line += ` (Effective: ${this.formatDate(s.effectiveDate)})`;
                if (s.impactedParties && s.impactedParties.length > 0) {
                    line += `\n  *Impacted*: ${s.impactedParties.join(', ')}`;
                }
                return line;
            })
            .join('\n\n');
    }

    private getSignalTypeTitle(type: string): string {
        const titles: Record<string, string> = {
            circular: 'New Circulars & Memoranda',
            rate_change: 'Rate Changes',
            guideline: 'New Guidelines',
            advisory: 'Policy Advisories',
            regulatory_timeline: 'Regulatory Timelines',
            energy_policy: 'Energy Policy Updates',
            other: 'Other Developments',
        };
        return titles[type] || 'Other';
    }

    private getSignalPriority(type: string, signals: PolicySignal[]): 'high' | 'medium' | 'low' {
        const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

        if (type === 'rate_change' || type === 'circular') return 'high';
        if (avgConfidence >= 0.8) return 'high';
        if (avgConfidence >= 0.6) return 'medium';
        return 'low';
    }

    private comparePriority(a: 'high' | 'medium' | 'low', b: 'high' | 'medium' | 'low'): number {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a] - order[b];
    }

    private formatDate(date: Date | undefined): string {
        if (!date) return 'TBD';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    private buildImpactAnalysisPrompt(signals: PolicySignal[]): string {
        const signalList = signals.map(s => `- ${s.title}: ${s.description}`).join('\n');

        return `Analyze the market/business impact of these policy changes:

${signalList}

Provide a concise impact analysis (200-300 words) covering:
1. WHO is affected (industries, sectors, companies)
2. HOW they're affected (costs, operations, compliance)
3. WHEN impacts take effect
4. MAGNITUDE of impact (high/medium/low with brief justification)

Be specific and actionable. Focus on financial/operational implications.`;
    }

    private generateSoWhatFallback(signals: PolicySignal[]): DigestSection[] {
        const sections: DigestSection[] = [];

        const highPrioritySignals = signals.filter(s => s.confidence >= 0.7);

        if (highPrioritySignals.length > 0) {
            sections.push({
                title: 'Key Implications',
                content: `${highPrioritySignals.length} high-confidence policy changes detected. Detailed impact analysis requires LLM integration. Review individual signals for specifics.`,
                priority: 'medium',
            });
        }

        return sections;
    }
}
