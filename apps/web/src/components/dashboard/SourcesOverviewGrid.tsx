'use client';

import Link from 'next/link';
import { Source, CrawlJob } from '@/lib/api';

interface SourceWithStats extends Source {
    newDocsCount: number;
    lastCrawlTime: string | null;
    lastCrawlStatus: 'done' | 'failed' | 'running' | 'pending' | null;
}

interface SourcesOverviewGridProps {
    sources: SourceWithStats[];
    loading?: boolean;
    onRunCrawl?: (sourceId: string) => void;
}

export function SourcesOverviewGrid({ sources, loading = false, onRunCrawl }: SourcesOverviewGridProps) {
    const getHealthStatus = (source: SourceWithStats): { status: 'healthy' | 'warning'; label: string; icon: string } => {
        if (!source.lastCrawlTime) {
            return { status: 'warning', label: 'Never crawled', icon: '⚠️' };
        }

        if (source.lastCrawlStatus === 'failed') {
            return { status: 'warning', label: 'Last crawl failed', icon: '❌' };
        }

        if (source.lastCrawlStatus === 'running') {
            return { status: 'healthy', label: 'Crawling now', icon: '🔄' };
        }

        const lastCrawl = new Date(source.lastCrawlTime);
        const now = new Date();
        const daysSinceLastCrawl = Math.floor((now.getTime() - lastCrawl.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceLastCrawl > 7) {
            return { status: 'warning', label: 'Needs attention', icon: '⚠️' };
        }

        return { status: 'healthy', label: 'Healthy', icon: '✅' };
    };

    const formatLastCrawlTime = (timestamp: string | null) => {
        if (!timestamp) {
            return 'Never';
        }

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) {
            return 'Just now';
        }
        if (diffHours < 24) {
            return `${diffHours}h ago`;
        }
        if (diffDays === 1) {
            return 'Yesterday';
        }
        if (diffDays < 7) {
            return `${diffDays}d ago`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-sm animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#202020]">Sources Overview</h2>
                <Link
                    href="/sources"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    Manage sources →
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sources.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-[#E5E5E5] text-[#999999]">
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
                                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <p>No sources configured</p>
                    </div>
                ) : (
                    sources.map((source) => {
                        const health = getHealthStatus(source);
                        return (
                            <div
                                key={source.id}
                                className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Source Name */}
                                <h3 className="font-semibold text-[#202020] mb-2 text-base line-clamp-2">
                                    {source.name}
                                </h3>

                                {/* Type Badge */}
                                <div className="mb-3">
                                    <span className="inline-block px-2 py-0.5 bg-[#EFEFEF] text-xs text-[#727272] rounded">
                                        {source.type}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#727272]">New docs (7d):</span>
                                        <span className="font-medium text-[#202020]">
                                            {source.newDocsCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#727272]">Last crawl:</span>
                                        <span className="text-[#727272]">
                                            {formatLastCrawlTime(source.lastCrawlTime)}
                                        </span>
                                    </div>
                                </div>

                                {/* Health Status */}
                                <div className="mb-4">
                                    <div
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${health.status === 'healthy'
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                            }`}
                                    >
                                        <span>{health.icon}</span>
                                        <span>{health.label}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Link
                                        href={`/sources/${source.id}`}
                                        className="flex-1 px-3 py-1.5 border border-[#DCDCDC] text-[#202020] text-sm font-medium rounded-md hover:bg-[#EFEFEF] transition text-center"
                                    >
                                        View
                                    </Link>
                                    {onRunCrawl && (
                                        <button
                                            onClick={() => onRunCrawl(source.id)}
                                            disabled={source.lastCrawlStatus === 'running'}
                                            className="px-3 py-1.5 bg-[#202020] text-white text-sm font-medium rounded-md hover:bg-[#404040] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={source.lastCrawlStatus === 'running' ? 'Crawl in progress' : 'Start crawl'}
                                        >
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
                                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
