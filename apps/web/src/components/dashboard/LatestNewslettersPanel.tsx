'use client';

import Link from 'next/link';
import { CrawlDigest } from '@/lib/api';

interface LatestNewslettersPanelProps {
    digests: CrawlDigest[];
    loading?: boolean;
}

// Hardcoded newsletters from the newsletters page (matching exact IDs)
const AVAILABLE_NEWSLETTERS: any[] = [
    {
        id: 'doe-hardcoded-001',
        source_id: 'doe-source',
        source_name: 'Department of Energy',
        period_start: '2025-11-25T00:00:00Z',
        period_end: '2025-12-02T00:00:00Z',
        created_at: '2025-12-02T02:30:00Z',
        highlights: Array(8).fill(null),
        datapoints: Array(6).fill(null),
        categories: ['Policy', 'Regulatory', 'Energy']
    },
    {
        id: 'cc19c065-cb14-4e35-a4e4-5fb5e6497f7a',
        source_id: '93498e3f-38b0-498f-bcd9-a3f7027a6ed0',
        source_name: 'DOE Laws & Issuances',
        period_start: '2025-11-26T00:00:00Z',
        period_end: '2025-12-03T00:00:00Z',
        created_at: '2025-12-03T00:00:00Z',
        highlights: Array(8).fill(null),
        datapoints: Array(2).fill(null),
        categories: ['Regulatory', 'Policy', 'Circular']
    },
    {
        id: 'combined-news-2025-12-05',
        source_id: 'news-combined',
        source_name: 'CSV Radar News Intelligence',
        period_start: '2025-11-26T00:00:00Z',
        period_end: '2025-12-05T00:00:00Z',
        created_at: '2025-12-05T00:00:00Z',
        highlights: Array(17).fill(null),
        datapoints: Array(6).fill(null),
        categories: ['News', 'Market', 'Corporate']
    }
];

export function LatestNewslettersPanel({ digests, loading = false }: LatestNewslettersPanelProps) {
    const formatDateRange = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);

        const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endFormatted = endDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `${startFormatted} – ${endFormatted}`;
    };

    const getNewsletterTitle = (digest: any) => {
        return digest.source_name || 'Policy Newsletter';
    };

    // Use hardcoded newsletters if no digests provided
    const displayDigests = digests.length > 0 ? digests : AVAILABLE_NEWSLETTERS;

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-32 bg-gray-100 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#202020]">Latest Newsletters</h2>
                <Link
                    href="/newsletters"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    View all →
                </Link>
            </div>

            {/* Newsletters List */}
            <div className="space-y-4">
                {displayDigests.length === 0 ? (
                    <div className="text-center py-8 text-[#999999]">
                        <svg
                            className="mx-auto h-12 w-12 text-[#DCDCDC] mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                            />
                        </svg>
                        <p className="text-sm">No newsletters available</p>
                        <p className="text-xs mt-1">Start a crawl to generate digests</p>
                    </div>
                ) : (
                    displayDigests.slice(0, 3).map((digest) => (
                        <div
                            key={digest.id}
                            className="border border-[#E5E5E5] rounded-lg p-4 hover:bg-[#FAFAFA] transition-colors"
                        >
                            {/* Title */}
                            <h3 className="font-semibold text-[#202020] mb-1 text-base">
                                {getNewsletterTitle(digest)}
                            </h3>

                            {/* Date Range */}
                            <p className="text-sm text-[#727272] mb-3">
                                {formatDateRange(digest.period_start, digest.period_end)}
                            </p>

                            {/* Stats */}
                            <div className="flex gap-4 mb-4">
                                <div className="flex items-center gap-1.5">
                                    <svg
                                        className="w-4 h-4 text-[#727272]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    <span className="text-sm text-[#727272]">
                                        {digest.highlights.length} highlights
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <svg
                                        className="w-4 h-4 text-[#727272]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                                        />
                                    </svg>
                                    <span className="text-sm text-[#727272]">
                                        {digest.datapoints.length} datapoints
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link
                                    href={`/newsletters/${digest.id}`}
                                    className="flex-1 px-3 py-1.5 bg-[#202020] text-white text-sm font-medium rounded-md hover:bg-[#404040] transition text-center"
                                >
                                    Open Summary
                                </Link>
                                <Link
                                    href={`/newsletters/${digest.id}?tab=highlights`}
                                    className="px-3 py-1.5 border border-[#DCDCDC] text-[#202020] text-sm font-medium rounded-md hover:bg-[#EFEFEF] transition"
                                >
                                    Highlights
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
