'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { digestsApi, sourcesApi, CrawlDigest, Source } from '@/lib/api';
import { Table } from '@/components/Table';
import { logger } from '@/lib/logger';

export default function DigestsPage(): JSX.Element {
    const [digests, setDigests] = useState<CrawlDigest[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedSourceId, setSelectedSourceId] = useState<string | 'all'>('all');
    const pageSize = 20;

    useEffect(() => {
        loadSources();
    }, []);

    useEffect(() => {
        loadDigests();
    }, [page, selectedSourceId]);

    const loadSources = async () => {
        try {
            const data = await sourcesApi.list();
            setSources(data);
        } catch (err) {
            logger.error({ msg: 'Failed to load sources', error: err instanceof Error ? err.message : 'Unknown' });
        }
    };

    const loadDigests = async () => {
        try {
            setLoading(true);
            setError(null);

            const params: { page: number; page_size: number; source_id?: string } = {
                page,
                page_size: pageSize,
            };

            if (selectedSourceId !== 'all') {
                params.source_id = selectedSourceId;
            }

            const response = await digestsApi.list(params);
            setDigests(response.items);
            setTotalPages(response.totalPages);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load digests');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSourceName = (sourceId: string): string => {
        const source = sources.find(s => s.id === sourceId);
        return source?.name || 'Unknown Source';
    };

    const columns = [
        {
            key: 'source',
            header: 'Source',
            render: (digest: CrawlDigest) => (
                <div>
                    <div className="font-medium">{getSourceName(digest.source_id)}</div>
                    <div className="text-xs text-secondary">
                        {formatDate(digest.period_start)} - {formatDate(digest.period_end)}
                    </div>
                </div>
            ),
            width: '25%',
        },
        {
            key: 'highlights',
            header: 'Content',
            render: (digest: CrawlDigest) => (
                <div className="text-sm">
                    <div className="flex gap-4">
                        <span className="text-copy">
                            <strong>{digest.highlights.length}</strong> highlights
                        </span>
                        <span className="text-secondary">
                            <strong>{digest.datapoints.length}</strong> datapoints
                        </span>
                    </div>
                    {digest.highlights.length > 0 && (
                        <div className="text-xs text-secondary mt-1 truncate">
                            {digest.highlights[0].title}
                        </div>
                    )}
                </div>
            ),
            width: '35%',
        },
        {
            key: 'categories',
            header: 'Categories',
            render: (digest: CrawlDigest) => {
                const categories = [...new Set(digest.highlights.map(h => h.category))];
                return (
                    <div className="flex flex-wrap gap-1">
                        {categories.slice(0, 3).map((cat, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-0.5 bg-bg-contrast text-xs text-secondary rounded"
                            >
                                {cat}
                            </span>
                        ))}
                        {categories.length > 3 && (
                            <span className="text-xs text-secondary">+{categories.length - 3}</span>
                        )}
                    </div>
                );
            },
            width: '20%',
        },
        {
            key: 'created',
            header: 'Created',
            render: (digest: CrawlDigest) => (
                <span className="text-sm text-secondary">{formatDate(digest.created_at)}</span>
            ),
            width: '10%',
        },
        {
            key: 'actions',
            header: '',
            render: (digest: CrawlDigest) => (
                <Link
                    href={`/digests/${digest.crawl_job_id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    View →
                </Link>
            ),
            width: '10%',
        },
    ];

    return (
        <div className="min-h-screen bg-bg-page">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-copy">LLM Digests</h1>
                            <p className="text-secondary mt-1">
                                AI-generated summaries of regulatory updates and policy changes
                            </p>
                        </div>
                        <Link
                            href="/crawl"
                            className="px-4 py-2 border border-border text-copy rounded-md text-sm font-medium hover:bg-bg-contrast transition"
                        >
                            Start Crawl
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 flex gap-3">
                    <select
                        value={selectedSourceId}
                        onChange={(e) => {
                            setSelectedSourceId(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-copy"
                    >
                        <option value="all">All Sources</option>
                        {sources.map((source) => (
                            <option key={source.id} value={source.id}>
                                {source.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copy"></div>
                        <p className="mt-4 text-secondary">Loading digests...</p>
                    </div>
                ) : (
                    <>
                        {/* Digests Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-border">
                            <Table
                                columns={columns}
                                data={digests}
                                keyExtractor={(digest) => digest.id}
                                emptyMessage="No digests found. Start a multi-page crawl to generate LLM digests."
                            />
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between">
                                <p className="text-sm text-secondary">
                                    Page {page} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 border border-border text-copy rounded-md text-sm font-medium hover:bg-bg-contrast transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 border border-border text-copy rounded-md text-sm font-medium hover:bg-bg-contrast transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
