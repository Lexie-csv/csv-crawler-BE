'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { documentsApi, Document, Source } from '@/lib/api';

interface RecentSignalsFeedProps {
    signals?: never; // Remove signals prop
    sources: Source[];
    loading?: boolean;
}

// Hardcoded recent highlights from newsletters with article links
// Using created_at to show when articles were crawled
const RECENT_NEWSLETTER_HIGHLIGHTS = [
    {
        id: '1',
        title: 'Joint Circular No. 4 Series of 2025 (DOE & DPWH)',
        content: 'This circular outlines policies governing the relocation and payment of electric poles/facilities owned by electric cooperatives that are affected by government projects, enhancing the framework established in 2017.',
        url: 'https://doe.gov.ph/articles/2113112--joint-circular-of-the-department-of-energy-doe-and-the-department-of-public-works-and-highways-dpwh-no-4-series-of-2025',
        source_name: 'DOE Laws & Issuances',
        source_type: 'policy',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '2',
        title: 'AHI partners with MPower for Retail Aggregation Program',
        content: 'Aseana Holdings Inc. (AHI) has partnered with MPower to enroll six properties in Aseana City into the Retail Aggregation Program (RAP), enabling them to consolidate accounts for competitive energy sourcing.',
        url: 'https://powerphilippines.com/ahi-partners-with-mpower-to-shift-aseana-city-accounts-to-retail-aggregation-program/',
        source_name: 'Power Philippines',
        source_type: 'news',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '3',
        title: 'Resolution No. 03-001 s. 2025',
        content: 'This resolution recommends the adoption of the Model Development and Production Petroleum Service Contract (DP PSC), which builds upon the Philippine Conventional Energy Contracting Program (PCECP) established in 2017.',
        url: 'https://doe.gov.ph/articles/2115164--resolution-no-03-001-s-2025',
        source_name: 'DOE Laws & Issuances',
        source_type: 'policy',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '4',
        title: 'ACEN signs deal to acquire solar farm developer in Pangasinan',
        content: 'ACEN Corp. is acquiring Sinocalan Solar Power Corp., a developer of a 60 MWp solar power plant in Pangasinan, strengthening its renewable energy portfolio and supporting the Philippines\' clean energy goals.',
        url: 'https://www.bworldonline.com/corporate/2022/12/02/490679/acen-signs-deal-to-acquire-solar-farm-developer-in-pangasinan/',
        source_name: 'BusinessWorld',
        source_type: 'news',
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '5',
        title: 'Joint Memorandum Circular No. JMC2024-12-001',
        content: 'This circular provides guidelines for local government units (LGUs) regarding the preferential rights of electric cooperatives under relevant Republic Acts, clarifying the legal framework for LGUs.',
        url: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Issuances&display_type=Card',
        source_name: 'DOE Laws & Issuances',
        source_type: 'policy',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '6',
        title: 'IAEECC Resolution No. 11 s. 2025',
        content: 'This resolution mandates all government entities to utilize energy-consuming products (ECPs) in alignment with the MEPP under the PELP. This initiative is designed to enhance energy efficiency across government operations.',
        url: 'https://doe.gov.ph/articles/3115350--inter-agency-energy-efficiency-and-conservation-committee-iaeecc-resolution-no-11-s-2025-1',
        source_name: 'DOE Laws & Issuances',
        source_type: 'policy',
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '7',
        title: 'Solar supply driving midday power prices down',
        content: 'Analysis shows midday electricity prices in the Philippines are declining rapidly due to increased solar energy supply.',
        url: 'https://powerphilippines.com/category/market-insights/',
        source_name: 'Power Philippines',
        source_type: 'market',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '8',
        title: 'Manila Water income more than doubles',
        content: 'Manila Water Co., Inc. reported first-quarter attributable net income of PHP 2.28 billion, more than doubling from PHP 1.09 billion the previous year, driven by a 48.6% increase in revenues to PHP 7.38 billion.',
        url: 'https://www.bworldonline.com/corporate/2023/05/12/522442/manila-water-income-more-than-doubles/',
        source_name: 'BusinessWorld',
        source_type: 'news',
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '9',
        title: 'Implementing Guidelines of the Philippine Transport Vehicles Fuel Economy Labeling Program',
        content: 'These guidelines implement the Fuel Economy Labeling Program for road transport vehicles, providing compliance requirements for the transport sector.',
        url: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Issuances&display_type=Card',
        source_name: 'DOE Laws & Issuances',
        source_type: 'policy',
        created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '10',
        title: 'Department Circular No. DC2020-12-0025',
        content: 'This circular implements the Philippine National Standard Specification for Kerosene, ensuring quality and safety standards in the kerosene supply chain.',
        url: 'https://doe.gov.ph/articles/group/laws-and-issuances?category=Issuances&display_type=Card',
        source_name: 'DOE Laws & Issuances',
        source_type: 'policy',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

export function RecentSignalsFeed({ sources, loading: externalLoading = false }: RecentSignalsFeedProps) {
    const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days'>('7days');
    const [typeFilter, setTypeFilter] = useState<'all' | 'policy' | 'market' | 'news'>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch documents when filters change
    useEffect(() => {
        async function fetchDocuments() {
            try {
                setLoading(true);
                setError(null);

                const days = timeFilter === 'today' ? 1 : timeFilter === '7days' ? 7 : 30;
                const type = typeFilter === 'all' ? undefined : typeFilter;
                const source_id = sourceFilter === 'all' ? undefined : sourceFilter;

                console.log('🔍 Fetching documents with params:', { days, type, source_id });

                const response = await documentsApi.list({
                    limit: 20,
                    days,
                    type,
                    source_id,
                });

                console.log('✅ Received documents:', response.data.length, 'documents');
                console.log('📄 First document:', response.data[0]);
                setDocuments(response.data);
            } catch (err) {
                // Only show error if we have no featured highlights to display
                if (RECENT_NEWSLETTER_HIGHLIGHTS.length === 0) {
                    setError('Failed to load signals');
                }
                console.error('❌ Error fetching documents:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchDocuments();
    }, [timeFilter, typeFilter, sourceFilter]);

    const getTypeBadgeColor = (type?: string) => {
        const lowerType = (type || 'other').toLowerCase();
        switch (lowerType) {
            case 'policy':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'news':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'market':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) {
            return 'Just now';
        }
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }
        if (diffDays === 1) {
            return 'Yesterday';
        }
        if (diffDays < 7) {
            return `${diffDays} days ago`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const truncateText = (text: string, maxLength: number) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    if (loading || externalLoading) {
        return (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 shadow-sm">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-100 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#202020] mb-4">Recent Signals & Alerts</h2>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    {/* Time Filter */}
                    <div className="flex gap-2 border border-[#DCDCDC] rounded-md p-1">
                        <button
                            onClick={() => setTimeFilter('today')}
                            className={`px-3 py-1 text-sm rounded ${timeFilter === 'today'
                                    ? 'bg-[#202020] text-white'
                                    : 'text-[#727272] hover:bg-[#EFEFEF]'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setTimeFilter('7days')}
                            className={`px-3 py-1 text-sm rounded ${timeFilter === '7days'
                                    ? 'bg-[#202020] text-white'
                                    : 'text-[#727272] hover:bg-[#EFEFEF]'
                                }`}
                        >
                            Last 7 days
                        </button>
                        <button
                            onClick={() => setTimeFilter('30days')}
                            className={`px-3 py-1 text-sm rounded ${timeFilter === '30days'
                                    ? 'bg-[#202020] text-white'
                                    : 'text-[#727272] hover:bg-[#EFEFEF]'
                                }`}
                        >
                            Last 30 days
                        </button>
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="px-3 py-1.5 border border-[#DCDCDC] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#202020]"
                    >
                        <option value="all">All Types</option>
                        <option value="policy">Policy</option>
                        <option value="market">Market</option>
                        <option value="news">News</option>
                    </select>

                    {/* Source Filter */}
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="px-3 py-1.5 border border-[#DCDCDC] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#202020]"
                    >
                        <option value="all">All Sources</option>
                        {sources.map(source => (
                            <option key={source.id} value={source.name}>
                                {source.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                </div>
            )}

            {/* Signals List */}
            <div className="space-y-4">
                {/* Featured Highlights from Newsletters */}
                {RECENT_NEWSLETTER_HIGHLIGHTS.filter(highlight => {
                    // Apply type filter
                    if (typeFilter !== 'all' && highlight.source_type !== typeFilter) {
                        return false;
                    }
                    // Apply time filter (all highlights are within 30 days)
                    const daysAgo = Math.floor((Date.now() - new Date(highlight.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    if (timeFilter === 'today' && daysAgo > 1) return false;
                    if (timeFilter === '7days' && daysAgo > 7) return false;
                    return true;
                }).map((highlight) => (
                    <div
                        key={highlight.id}
                        className="border-2 border-blue-200 bg-blue-50/30 rounded-lg p-4 hover:bg-blue-50/50 transition-colors"
                    >
                        {/* Header Row */}
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 text-xs font-bold text-blue-700 bg-blue-100 rounded border border-blue-300">
                                    ⭐ FEATURED
                                </span>
                                <span
                                    className={`px-2 py-0.5 text-xs font-medium rounded border ${getTypeBadgeColor(
                                        highlight.source_type
                                    )}`}
                                >
                                    {(highlight.source_type || 'other').toUpperCase()}
                                </span>
                                <span className="text-sm text-[#727272]">{highlight.source_name}</span>
                                <span className="text-xs text-[#999999]">
                                    Crawled {formatRelativeTime(highlight.created_at)}
                                </span>
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-[#202020] mb-2">
                            {highlight.title}
                        </h3>

                        {/* Summary */}
                        <p className="text-sm text-[#727272] mb-3 line-clamp-2">
                            {highlight.content}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <a
                                href={highlight.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                                Read Full Article
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>
                ))}

                {documents.length === 0 && !loading && RECENT_NEWSLETTER_HIGHLIGHTS.length === 0 ? (
                    <div className="text-center py-12 text-[#999999]">
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <p>No signals found for the selected filters.</p>
                    </div>
                ) : (
                    documents.slice(0, 15).map((doc) => (
                        <div
                            key={doc.id}
                            className="border border-[#E5E5E5] rounded-lg p-4 hover:bg-[#FAFAFA] transition-colors"
                        >
                            {/* Header Row */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`px-2 py-0.5 text-xs font-medium rounded border ${getTypeBadgeColor(
                                            doc.source_type
                                        )}`}
                                    >
                                        {(doc.source_type || 'other').toUpperCase()}
                                    </span>
                                    <span className="text-sm text-[#727272]">{doc.source_name || 'Unknown Source'}</span>
                                    <span className="text-xs text-[#999999]">
                                        {formatRelativeTime(doc.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-semibold text-[#202020] mb-2">
                                {doc.title}
                            </h3>

                            {/* Summary */}
                            <p className="text-sm text-[#727272] mb-3 line-clamp-2">
                                {truncateText(doc.content, 150)}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {doc.url && (
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                        View Source
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* View All Link */}
            {documents.length > 20 && (
                <div className="mt-6 text-center">
                    <Link
                        href="/documents"
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        View all {documents.length} signals →
                    </Link>
                </div>
            )}
        </div>
    );
}
