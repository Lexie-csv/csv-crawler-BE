'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sourcesApi, crawlApi, Source, CrawlJob } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Table } from '@/components/Table';
import { CrawlConfigModal, CrawlConfig } from '@/components/CrawlConfigModal';

export default function CrawlDashboard(): JSX.Element {
    const [sources, setSources] = useState<Source[]>([]);
    const [jobs, setJobs] = useState<CrawlJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSourceId, setSelectedSourceId] = useState<string | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
    const [startingJobs, setStartingJobs] = useState<Set<string>>(new Set());
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Poll for running jobs every 2 seconds
    useEffect(() => {
        const hasRunningJobs = jobs.some((job) => job.status === 'pending' || job.status === 'running');

        if (!hasRunningJobs) return;

        const interval = setInterval(() => {
            loadJobs();
        }, 2000);

        return () => clearInterval(interval);
    }, [jobs]);

    const loadData = async () => {
        await Promise.all([loadSources(), loadJobs()]);
        setLoading(false);
    };

    const loadSources = async () => {
        try {
            const data = await sourcesApi.list();
            setSources(data.filter((s) => s.active));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sources');
        }
    };

    const loadJobs = async () => {
        try {
            const params: { status?: string; source_id?: string } = {};
            if (selectedStatus !== 'all') params.status = selectedStatus;
            if (selectedSourceId !== 'all') params.source_id = selectedSourceId;

            const data = await crawlApi.listJobs(params);
            setJobs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load jobs');
        }
    };

    const handleStartCrawl = async (sourceId: string) => {
        const source = sources.find(s => s.id === sourceId);
        if (!source) return;
        
        setSelectedSource(source);
        setConfigModalOpen(true);
    };

    const handleCrawlSubmit = async (config: CrawlConfig) => {
        if (!selectedSource) return;

        try {
            setError(null);
            setStartingJobs(new Set(startingJobs).add(selectedSource.id));

            await crawlApi.createJob({
                sourceId: selectedSource.id,
                useMultiPage: config.useMultiPage,
                maxDepth: config.maxDepth,
                maxPages: config.maxPages,
                concurrency: config.concurrency,
            });
            await loadJobs();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start crawl');
        } finally {
            setStartingJobs((prev) => {
                const next = new Set(prev);
                next.delete(selectedSource.id);
                return next;
            });
            setSelectedSource(null);
        }
    };

    const formatDuration = (job: CrawlJob): string => {
        if (!job.started_at) return '-';

        const start = new Date(job.started_at).getTime();
        const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now();
        const seconds = Math.floor((end - start) / 1000);

        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    const formatTimeAgo = (dateString: string): string => {
        const now = Date.now();
        const date = new Date(dateString).getTime();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const sourceColumns = [
        {
            key: 'name',
            header: 'Source',
            render: (source: Source) => (
                <div>
                    <div className="font-medium">{source.name}</div>
                    <div className="text-xs text-secondary">{source.type} · {source.country}</div>
                </div>
            ),
            width: '30%',
        },
        {
            key: 'url',
            header: 'URL',
            render: (source: Source) => (
                <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm truncate block max-w-md"
                >
                    {source.url}
                </a>
            ),
            width: '40%',
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (source: Source) => {
                const isRunning = jobs.some(
                    (job) => job.source_id === source.id && (job.status === 'pending' || job.status === 'running')
                );
                const isStarting = startingJobs.has(source.id);

                return (
                    <button
                        onClick={() => handleStartCrawl(source.id)}
                        disabled={isRunning || isStarting}
                        className="px-3 py-1.5 bg-copy text-white rounded-md text-sm font-medium hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isStarting ? 'Starting...' : isRunning ? 'Running' : 'Start Crawl'}
                    </button>
                );
            },
            width: '30%',
        },
    ];

    const jobColumns = [
        {
            key: 'source',
            header: 'Source',
            render: (job: CrawlJob) => {
                const source = sources.find((s) => s.id === job.source_id);
                return (
                    <div>
                        <div className="font-medium">{source?.name || 'Unknown'}</div>
                        <div className="text-xs text-secondary">{formatTimeAgo(job.created_at)}</div>
                    </div>
                );
            },
            width: '20%',
        },
        {
            key: 'status',
            header: 'Status',
            render: (job: CrawlJob) => <StatusBadge status={job.status} />,
            width: '10%',
        },
        {
            key: 'progress',
            header: 'Progress',
            render: (job: CrawlJob) => (
                <div className="text-sm">
                    {job.pages_crawled !== undefined ? (
                        <>
                            <div>Pages: {job.pages_crawled}</div>
                            <div className="text-secondary text-xs">
                                New: {job.pages_new || 0} | Failed: {job.pages_failed || 0}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>Items: {job.items_crawled}</div>
                            <div className="text-secondary">New: {job.items_new}</div>
                        </>
                    )}
                </div>
            ),
            width: '15%',
        },
        {
            key: 'duration',
            header: 'Duration',
            render: (job: CrawlJob) => (
                <span className="text-sm">{formatDuration(job)}</span>
            ),
            width: '10%',
        },
        {
            key: 'error',
            header: 'Details',
            render: (job: CrawlJob) => (
                <div className="text-sm">
                    {job.error_message ? (
                        <div className="text-red-600 truncate max-w-xs" title={job.error_message}>
                            {job.error_message}
                        </div>
                    ) : job.status === 'done' ? (
                        <span className="text-green-600">Completed successfully</span>
                    ) : (
                        <span className="text-secondary">-</span>
                    )}
                </div>
            ),
            width: '30%',
        },
        {
            key: 'actions',
            header: '',
            render: (job: CrawlJob) => (
                <div className="flex gap-2">
                    <Link
                        href={`/documents?crawl_job_id=${job.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Docs →
                    </Link>
                    {job.status === 'done' && job.pages_crawled && job.pages_crawled > 1 && (
                        <Link
                            href={`/digests/${job.id}`}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                            Digest →
                        </Link>
                    )}
                </div>
            ),
            width: '15%',
        },
    ];

    return (
        <div className="min-h-screen bg-bg-page">
            <CrawlConfigModal
                isOpen={configModalOpen}
                onClose={() => {
                    setConfigModalOpen(false);
                    setSelectedSource(null);
                }}
                onSubmit={handleCrawlSubmit}
                sourceName={selectedSource?.name || ''}
            />
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-copy">Crawl Dashboard</h1>
                            <p className="text-secondary mt-1">Monitor and manage crawl jobs</p>
                        </div>
                        <Link
                            href="/sources"
                            className="px-4 py-2 border border-border text-copy rounded-md text-sm font-medium hover:bg-bg-contrast transition"
                        >
                            Manage Sources
                        </Link>
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
                        <p className="mt-4 text-secondary">Loading dashboard...</p>
                    </div>
                ) : (
                    <>
                        {/* Active Sources */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-copy mb-4">Active Sources</h2>
                            <div className="bg-white rounded-lg shadow-sm border border-border">
                                {sources.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-secondary mb-4">No active sources found</p>
                                        <Link
                                            href="/sources"
                                            className="text-blue-600 hover:underline font-medium"
                                        >
                                            Add your first source →
                                        </Link>
                                    </div>
                                ) : (
                                    <Table
                                        columns={sourceColumns}
                                        data={sources}
                                        keyExtractor={(source) => source.id}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Crawl Jobs */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-copy">Crawl Jobs</h2>
                                <div className="flex gap-3">
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => {
                                            setSelectedStatus(e.target.value);
                                            loadJobs();
                                        }}
                                        className="px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-copy"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="running">Running</option>
                                        <option value="done">Done</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-border">
                                <Table
                                    columns={jobColumns}
                                    data={jobs}
                                    keyExtractor={(job) => job.id}
                                    emptyMessage="No crawl jobs found. Start a crawl to see results here."
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
