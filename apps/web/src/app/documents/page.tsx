'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { documentsApi, sourcesApi, Document, Source } from '@/lib/api';
import { Table } from '@/components/Table';

export default function DocumentsPage(): JSX.Element {
    const searchParams = useSearchParams();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        source_id: searchParams.get('source_id') || '',
        crawl_job_id: searchParams.get('crawl_job_id') || '',
        extracted: searchParams.get('extracted') || 'all',
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadDocuments();
    }, [filters]);

    const loadData = async () => {
        await Promise.all([loadSources(), loadDocuments()]);
        setLoading(false);
    };

    const loadSources = async () => {
        try {
            const data = await sourcesApi.list();
            setSources(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sources');
        }
    };

    const loadDocuments = async () => {
        try {
            const params: Record<string, string | boolean> = {};
            if (filters.source_id) params.source_id = filters.source_id;
            if (filters.crawl_job_id) params.crawl_job_id = filters.crawl_job_id;
            if (filters.extracted !== 'all') params.extracted = filters.extracted === 'true';

            const data = await documentsApi.list(params);
            setDocuments(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        }
    };

    const formatDate = (dateString: string | null): string => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const truncate = (text: string | null, maxLength: number): string => {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const columns = [
        {
            key: 'title',
            header: 'Title',
            render: (doc: Document) => (
                <div>
                    <div className="font-medium">{truncate(doc.title, 60) || 'Untitled'}</div>
                    <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block max-w-md"
                    >
                        {doc.url}
                    </a>
                </div>
            ),
            width: '35%',
        },
        {
            key: 'source',
            header: 'Source',
            render: (doc: Document) => {
                const source = sources.find((s) => s.id === doc.source_id);
                return <span className="text-sm">{source?.name || 'Unknown'}</span>;
            },
            width: '15%',
        },
        {
            key: 'published',
            header: 'Published',
            render: (doc: Document) => (
                <span className="text-sm">{formatDate(doc.published_at)}</span>
            ),
            width: '12%',
        },
        {
            key: 'extracted',
            header: 'Extracted',
            render: (doc: Document) => (
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${doc.extracted
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                >
                    {doc.extracted ? 'Yes' : 'Pending'}
                </span>
            ),
            width: '10%',
        },
        {
            key: 'hash',
            header: 'Content Hash',
            render: (doc: Document) => (
                <span className="text-xs font-mono text-secondary">
                    {doc.content_hash.substring(0, 12)}...
                </span>
            ),
            width: '13%',
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (doc: Document) => (
                <Link
                    href={`/datapoints?document_id=${doc.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    View Data →
                </Link>
            ),
            width: '15%',
        },
    ];

    return (
        <div className="min-h-screen bg-bg-page">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-copy">Documents</h1>
                            <p className="text-secondary mt-1">Browse crawled documents and their extraction status</p>
                        </div>
                        <Link
                            href="/crawl"
                            className="px-4 py-2 border border-border text-copy rounded-md text-sm font-medium hover:bg-bg-contrast transition"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-border">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-xs font-medium text-secondary mb-1">
                                Source
                            </label>
                            <select
                                value={filters.source_id}
                                onChange={(e) => setFilters({ ...filters, source_id: e.target.value })}
                                className="px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-copy"
                            >
                                <option value="">All Sources</option>
                                {sources.map((source) => (
                                    <option key={source.id} value={source.id}>
                                        {source.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-secondary mb-1">
                                Extraction Status
                            </label>
                            <select
                                value={filters.extracted}
                                onChange={(e) => setFilters({ ...filters, extracted: e.target.value })}
                                className="px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-copy"
                            >
                                <option value="all">All</option>
                                <option value="true">Extracted</option>
                                <option value="false">Pending</option>
                            </select>
                        </div>

                        {filters.crawl_job_id && (
                            <div>
                                <label className="block text-xs font-medium text-secondary mb-1">
                                    Crawl Job
                                </label>
                                <div className="px-3 py-1.5 bg-bg-contrast rounded-md text-sm">
                                    Job: {filters.crawl_job_id.substring(0, 8)}...
                                </div>
                            </div>
                        )}
                    </div>
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
                        <p className="mt-4 text-secondary">Loading documents...</p>
                    </div>
                ) : (
                    /* Table */
                    <div className="bg-white rounded-lg shadow-sm border border-border">
                        <div className="px-6 py-3 border-b border-border">
                            <p className="text-sm text-secondary">
                                Showing {documents.length} document{documents.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <Table
                            columns={columns}
                            data={documents}
                            keyExtractor={(doc) => doc.id}
                            emptyMessage="No documents found. Start a crawl job to populate this list."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
