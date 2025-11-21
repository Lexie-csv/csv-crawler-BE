'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { crawlApi, CrawlDigest } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

export default function DigestDetailPage(): JSX.Element {
    const params = useParams();
    const jobId = params?.jobId as string;
    
    const [digest, setDigest] = useState<CrawlDigest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'highlights' | 'datapoints'>('summary');

    useEffect(() => {
        if (jobId) {
            loadDigest();
        }
    }, [jobId]);

    const loadDigest = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await crawlApi.getDigest(jobId);
            setDigest(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load digest');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-page flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copy"></div>
                    <p className="mt-4 text-secondary">Loading digest...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-bg-page">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                    <Link href="/digests" className="mt-4 inline-block text-blue-600 hover:underline">
                        ← Back to Digests
                    </Link>
                </div>
            </div>
        );
    }

    if (!digest) {
        return (
            <div className="min-h-screen bg-bg-page">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <p className="text-secondary">Digest not found</p>
                    <Link href="/digests" className="mt-4 inline-block text-blue-600 hover:underline">
                        ← Back to Digests
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-page">
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/digests" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
                        ← Back to Digests
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-copy mb-2">Policy & Data Digest</h1>
                            <p className="text-secondary">
                                {formatDate(digest.period_start)} - {formatDate(digest.period_end)}
                            </p>
                        </div>
                        <div className="text-right text-sm">
                            <div className="text-copy font-medium">{digest.highlights.length} Highlights</div>
                            <div className="text-secondary">{digest.datapoints.length} Datapoints</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border mb-6">
                    <nav className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`pb-3 border-b-2 font-medium text-sm transition ${
                                activeTab === 'summary'
                                    ? 'border-copy text-copy'
                                    : 'border-transparent text-secondary hover:text-copy'
                            }`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('highlights')}
                            className={`pb-3 border-b-2 font-medium text-sm transition ${
                                activeTab === 'highlights'
                                    ? 'border-copy text-copy'
                                    : 'border-transparent text-secondary hover:text-copy'
                            }`}
                        >
                            Highlights ({digest.highlights.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('datapoints')}
                            className={`pb-3 border-b-2 font-medium text-sm transition ${
                                activeTab === 'datapoints'
                                    ? 'border-copy text-copy'
                                    : 'border-transparent text-secondary hover:text-copy'
                            }`}
                        >
                            Datapoints ({digest.datapoints.length})
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg shadow-sm border border-border p-8">
                    {/* Summary Tab */}
                    {activeTab === 'summary' && (
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{digest.summary_markdown}</ReactMarkdown>
                        </div>
                    )}

                    {/* Highlights Tab */}
                    {activeTab === 'highlights' && (
                        <div className="space-y-6">
                            {digest.highlights.map((highlight, idx) => (
                                <div key={idx} className="border-l-4 border-copy pl-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-copy">{highlight.title}</h3>
                                        <span className="px-2 py-0.5 bg-bg-page text-xs text-secondary rounded">
                                            {highlight.category}
                                        </span>
                                    </div>
                                    <p className="text-sm text-secondary mb-2">{highlight.summary}</p>
                                    {highlight.effectiveDate && (
                                        <p className="text-xs text-secondary">
                                            Effective: {formatDate(highlight.effectiveDate)}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {digest.highlights.length === 0 && (
                                <p className="text-secondary text-center py-8">No highlights found</p>
                            )}
                        </div>
                    )}

                    {/* Datapoints Tab */}
                    {activeTab === 'datapoints' && (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-2 px-3 font-medium text-copy">Indicator</th>
                                            <th className="text-left py-2 px-3 font-medium text-copy">Description</th>
                                            <th className="text-left py-2 px-3 font-medium text-copy">Value</th>
                                            <th className="text-left py-2 px-3 font-medium text-copy">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {digest.datapoints.map((dp, idx) => (
                                            <tr key={idx} className="border-b border-border hover:bg-bg-page">
                                                <td className="py-3 px-3">
                                                    <code className="text-xs bg-bg-contrast px-2 py-1 rounded">
                                                        {dp.indicatorCode}
                                                    </code>
                                                </td>
                                                <td className="py-3 px-3 text-secondary">{dp.description}</td>
                                                <td className="py-3 px-3 font-medium">
                                                    {dp.value} {dp.unit && <span className="text-secondary text-xs">{dp.unit}</span>}
                                                </td>
                                                <td className="py-3 px-3 text-secondary text-xs">
                                                    {dp.effectiveDate ? formatDate(dp.effectiveDate) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {digest.datapoints.length === 0 && (
                                <p className="text-secondary text-center py-8">No datapoints extracted</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Download Markdown */}
                {digest.summary_markdown_path && (
                    <div className="mt-6 text-center">
                        <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}/storage${digest.summary_markdown_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                        >
                            Download Markdown →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
