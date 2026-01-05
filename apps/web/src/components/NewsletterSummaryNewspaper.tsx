'use client';

import ReactMarkdown from 'react-markdown';
import { CrawlDigest } from '@/lib/api';

interface NewsletterSummaryNewspaperProps {
    digest: CrawlDigest;
    newsletterTitle?: string;
    dateRange?: string;
}

export function NewsletterSummaryNewspaper({
    digest,
    newsletterTitle = 'Policy Newsletter',
    dateRange
}: NewsletterSummaryNewspaperProps) {
    // Extract executive summary and key themes from the markdown
    const extractExecutiveSummary = (markdown: string): { title: string; content: string } => {
        const lines = markdown.split('\n');
        const titleMatch = lines[0]?.match(/^#\s+(.+)$/);
        const title = titleMatch ? titleMatch[1] : newsletterTitle;

        // Find Executive Summary section
        const execSummaryStart = lines.findIndex(line => line.includes('Executive Summary'));
        const nextSectionStart = lines.findIndex((line, idx) =>
            idx > execSummaryStart && line.startsWith('##')
        );

        const summaryLines = execSummaryStart >= 0
            ? lines.slice(execSummaryStart + 1, nextSectionStart >= 0 ? nextSectionStart : undefined)
            : lines.slice(0, 10);

        return {
            title,
            content: summaryLines.join('\n').trim()
        };
    };

    const extractKeyThemes = (markdown: string): string[] => {
        // Extract bullet points or key themes from the summary
        const themes: string[] = [];
        const lines = markdown.split('\n');

        // Look for sections that might contain themes
        const themePatterns = [
            /^-\s+\*\*(.+?)\*\*:/,  // - **Theme**: description
            /^-\s+(.+?):/,           // - Theme: description
            /###\s+(.+)/,            // ### Theme heading
        ];

        for (const line of lines) {
            for (const pattern of themePatterns) {
                const match = line.match(pattern);
                if (match && themes.length < 6) {
                    themes.push(match[1].trim());
                }
            }
        }

        // Fallback themes if none found
        if (themes.length === 0) {
            const sourceId = digest.source_id;
            if (sourceId === 'news-combined' || sourceId === 'e78c1efc-a4c5-4e73-89ed-d3773873a681') {
                themes.push(
                    'Renewable Energy Expansion',
                    'Infrastructure Partnerships',
                    'Market Price Movements',
                    'Utility Financial Performance',
                    'Regulatory Updates',
                    'Workforce Development'
                );
            } else {
                themes.push(
                    'Policy Updates',
                    'Regulatory Compliance',
                    'Market Developments',
                    'Industry Standards',
                    'Energy Security'
                );
            }
        }

        return themes.slice(0, 6);
    };

    const { title: heroTitle, content: heroContent } = extractExecutiveSummary(digest.summary_markdown);
    const keyThemes = extractKeyThemes(digest.summary_markdown);

    // Get top articles from highlights (prefer news sources if available)
    const getTopArticles = () => {
        const allHighlights = digest.highlights || [];

        // Sort: prioritize highlights with source metadata (news articles)
        const sorted = [...allHighlights].sort((a, b) => {
            const aHasMeta = a.metadata?.source ? 1 : 0;
            const bHasMeta = b.metadata?.source ? 1 : 0;
            return bHasMeta - aHasMeta;
        });

        return sorted.slice(0, 9); // Take top 9 articles
    };

    const topArticles = getTopArticles();

    // Determine source tag
    const getSourceTag = (sourceId: string): string => {
        if (sourceId === 'doe-source') return 'DOE';
        if (sourceId === '93498e3f-38b0-498f-bcd9-a3f7027a6ed0') return 'DOE Legacy';
        if (sourceId === 'news-combined' || sourceId === 'e78c1efc-a4c5-4e73-89ed-d3773873a681') return 'News';
        return 'Policy';
    };

    const sourceTag = getSourceTag(digest.source_id);

    // PDF download handler
    const handleDownloadPDF = () => {
        window.print();
    };

    return (
        <div className="bg-[#f5f5f5] -m-8 p-8">
            {/* Download PDF Button - Hidden in print */}
            <div className="max-w-5xl mx-auto mb-4 flex justify-end print:hidden">
                <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-[#202020] text-white rounded-md hover:bg-[#404040] transition-colors text-sm font-sans"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    Download PDF
                </button>
            </div>
            <div className="max-w-5xl mx-auto bg-white shadow-lg border border-gray-300 p-8 md:p-12 font-serif">
                {/* Masthead */}
                <div className="border-b-4 border-[#202020] pb-4 mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs uppercase tracking-widest text-[#727272] font-semibold">
                            CSV RADAR
                        </div>
                        <div className="text-xs text-[#727272]">
                            {dateRange || 'Latest Issue'}
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#202020] uppercase tracking-tight">
                        {newsletterTitle}
                    </h1>
                    <p className="text-sm text-[#727272] mt-1 uppercase tracking-wide">
                        Energy, Policy, and Market Intelligence
                    </p>
                </div>

                {/* Hero Story + At a Glance */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 pb-10 border-b border-gray-300">
                    {/* Left: Hero Story */}
                    <div className="lg:col-span-2">
                        <div className="mb-4">
                            <span className="inline-block px-2 py-1 bg-[#202020] text-white text-xs uppercase tracking-wide font-semibold mb-3">
                                {sourceTag} Intelligence
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-[#202020] leading-tight mb-3">
                                {heroTitle}
                            </h2>
                            <p className="text-sm uppercase tracking-wider text-[#727272] mb-4 font-semibold">
                                Executive Summary
                            </p>
                        </div>
                        <div className="prose prose-sm max-w-none text-[#202020] leading-relaxed space-y-3">
                            <ReactMarkdown
                                components={{
                                    h1: ({ ...props }) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
                                    h2: ({ ...props }) => <h4 className="text-lg font-bold mt-3 mb-2" {...props} />,
                                    h3: ({ ...props }) => <h5 className="text-base font-semibold mt-2 mb-1" {...props} />,
                                    p: ({ ...props }) => <p className="mb-3 text-[15px] leading-relaxed" {...props} />,
                                    strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                                }}
                            >
                                {heroContent}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Right: At a Glance */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#FAFAFA] border-2 border-[#202020] p-6">
                            <h3 className="text-lg font-bold text-[#202020] uppercase tracking-wide mb-4 pb-2 border-b-2 border-[#202020]">
                                At a Glance
                            </h3>
                            <ul className="space-y-2">
                                {keyThemes.map((theme, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <span className="text-[#202020] mr-2 font-bold">▪</span>
                                        <span className="text-sm text-[#202020] leading-snug">{theme}</span>
                                    </li>
                                ))}
                            </ul>
                            {(digest.highlights.length > 0 || digest.datapoints.length > 0) && (
                                <div className="mt-6 pt-4 border-t border-gray-300">
                                    <div className="flex justify-between text-xs text-[#727272]">
                                        <div>
                                            <div className="font-semibold text-[#202020]">{digest.highlights.length}</div>
                                            <div>Highlights</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-[#202020]">{digest.datapoints.length}</div>
                                            <div>Datapoints</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Secondary Stories */}
                {topArticles.length > 0 && (
                    <div>
                        <h3 className="text-2xl font-bold text-[#202020] uppercase tracking-wide mb-6 pb-2 border-b-2 border-[#202020]">
                            Top Stories
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {topArticles.map((article, idx) => (
                                <article key={idx} className="border-b border-gray-200 pb-4">
                                    {/* Source badge */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {article.metadata?.source && (
                                            <span className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${article.metadata.source === 'Power Philippines'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {article.metadata.source}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs uppercase tracking-wide font-medium">
                                            {article.category}
                                        </span>
                                    </div>

                                    {/* Article title */}
                                    <h4 className="text-base font-bold text-[#202020] leading-tight mb-2">
                                        {article.title}
                                    </h4>

                                    {/* Article summary */}
                                    <p className="text-sm text-[#727272] leading-snug mb-2">
                                        {article.summary.length > 150
                                            ? `${article.summary.substring(0, 150)}...`
                                            : article.summary
                                        }
                                    </p>

                                    {/* Meta info */}
                                    {article.effectiveDate && (
                                        <div className="text-xs text-[#727272] italic">
                                            {article.effectiveDate}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-gray-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs text-[#727272]">
                        <div>
                            <span className="font-semibold">Generated by CSV Radar</span>
                            {digest.created_at && (
                                <span className="ml-2">
                                    • {new Date(digest.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            )}
                        </div>
                        <div>
                            <span className="font-semibold">Sources:</span>
                            <span className="ml-1">
                                {digest.source_id === 'news-combined' || digest.source_id === 'e78c1efc-a4c5-4e73-89ed-d3773873a681'
                                    ? 'Power Philippines, BusinessWorld'
                                    : digest.source_id === '93498e3f-38b0-498f-bcd9-a3f7027a6ed0'
                                        ? 'DOE Legacy Database'
                                        : 'Department of Energy'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
