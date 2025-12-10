'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sourcesApi, crawlApi, digestsApi, documentsApi, CrawlDigest, Source, CrawlJob } from '@/lib/api';
import { RecentSignalsFeed } from '@/components/dashboard/RecentSignalsFeed';
import { LatestNewslettersPanel } from '@/components/dashboard/LatestNewslettersPanel';
import { SourcesOverviewGrid } from '@/components/dashboard/SourcesOverviewGrid';
import Link from 'next/link';

// Hardcoded digests from newsletters page
const HARDCODED_DIGESTS: CrawlDigest[] = [
    {
        id: 'combined-news-2025-12-05',
        crawl_job_id: 'combined-news-job',
        source_id: 'news-combined',
        summary_markdown: '',
        summary_markdown_path: null,
        highlights: [],
        datapoints: [],
        metadata: { source_name: 'CSV Radar News Intelligence' },
        period_start: '2025-11-27T00:00:00Z',
        period_end: '2025-12-04T00:00:00Z',
        created_at: '2025-12-04T00:00:00Z',
        updated_at: '2025-12-04T00:00:00Z',
    },
    {
        id: 'cc19c065-cb14-4e35-a4e4-5fb5e6497f7a',
        crawl_job_id: '663833c9-bb4b-4d02-ac3f-adc88745ee2d',
        source_id: '93498e3f-38b0-498f-bcd9-a3f7027a6ed0',
        summary_markdown: '',
        summary_markdown_path: null,
        highlights: [],
        datapoints: [],
        metadata: { source_name: 'DOE Laws & Issuances' },
        period_start: '2025-11-26T00:00:00Z',
        period_end: '2025-12-03T00:00:00Z',
        created_at: '2025-12-03T00:00:00Z',
        updated_at: '2025-12-03T00:00:00Z',
    },
    {
        id: 'doe-hardcoded-001',
        crawl_job_id: 'hardcoded-job',
        source_id: 'doe-source',
        summary_markdown: '',
        summary_markdown_path: null,
        highlights: [],
        datapoints: [],
        metadata: { source_name: 'Department of Energy' },
        period_start: '2025-11-25T00:00:00Z',
        period_end: '2025-12-02T00:00:00Z',
        created_at: '2025-12-02T02:30:00Z',
        updated_at: '2025-12-02T02:30:00Z',
    },
];

interface SourceWithStats extends Source {
    newDocsCount: number;
    lastCrawlTime: string | null;
    lastCrawlStatus: 'done' | 'failed' | 'running' | 'pending' | null;
}

export default function SignalsPage() {
    console.log('🎯 SignalsPage component rendering');

    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sources, setSources] = useState<SourceWithStats[]>([]);
    const [jobs, setJobs] = useState<CrawlJob[]>([]);
    const [digests, setDigests] = useState<CrawlDigest[]>(HARDCODED_DIGESTS);

    const [stats, setStats] = useState({
        newSignalsCount: 0,
        newAlertsCount: 0,
        sourcesMonitored: 0,
        latestNewsletter: null as CrawlDigest | null,
    });

    useEffect(() => {
        console.log('🔄 useEffect triggered - loading dashboard data');
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            console.log('📡 Starting to load dashboard data...');
            setLoading(true);

            // Load all data in parallel
            const [sourcesData, jobsData, documentsResponse] = await Promise.all([
                sourcesApi.list().catch((err) => { console.error('Sources API error:', err); return []; }),
                crawlApi.listJobs().catch((err) => { console.error('Crawl API error:', err); return []; }),
                documentsApi.list({ days: 7, limit: 100 }).catch((err) => {
                    console.error('Documents API error:', err);
                    return { data: [], total: 0, limit: 0, offset: 0, timestamp: '' };
                }),
            ]);

            console.log('✅ Data loaded:', {
                sources: sourcesData.length,
                jobs: jobsData.length,
                documents: documentsResponse.data.length
            });

            // Load digests (using hardcoded for now)
            const digestsData = HARDCODED_DIGESTS;

            // Process sources with stats
            const sourcesWithStats: SourceWithStats[] = sourcesData.map(source => {
                // Find most recent job for this source
                const sourceJobs = jobsData.filter(j => j.source_id === source.id);
                const latestJob = sourceJobs.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                // Count new docs in last 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const recentJobs = sourceJobs.filter(j =>
                    new Date(j.created_at) >= sevenDaysAgo && j.status === 'done'
                );
                const newDocsCount = recentJobs.reduce((sum, j) => sum + (j.items_new || 0), 0);

                return {
                    ...source,
                    newDocsCount,
                    lastCrawlTime: latestJob?.completed_at || latestJob?.started_at || null,
                    lastCrawlStatus: latestJob?.status || null,
                };
            });

            // Calculate stats from documents
            const newSignalsCount = documentsResponse.total;
            const newAlertsCount = documentsResponse.data.filter(d =>
                d.source_type === 'policy'
            ).length;

            setSources(sourcesWithStats);
            setJobs(jobsData);
            setDigests(digestsData);
            setStats({
                newSignalsCount,
                newAlertsCount,
                sourcesMonitored: sourcesData.filter(s => s.active).length,
                latestNewsletter: digestsData[0] || null,
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunCrawl = async (sourceId: string) => {
        try {
            await crawlApi.createJob({ sourceId, useMultiPage: true });
            // Reload data after starting crawl
            loadDashboardData();
        } catch (error) {
            console.error('Failed to start crawl:', error);
        }
    };

    const formatDateRange = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-7xl mx-auto px-8 py-12">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-[#202020] mb-3">Dashboard</h1>
                    <p className="text-base text-[#666666]">
                        Monitor policy updates, regulatory changes, and energy sector intelligence
                    </p>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    {/* New Signals (Last 7 Days) */}
                    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-6">
                            <div className="text-[#202020] text-base font-semibold">New Signals</div>
                            <svg
                                className="w-6 h-6 text-[#666666]"
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
                        </div>
                        <div className="text-5xl font-bold text-[#202020] mb-2">
                            {loading ? '-' : stats.newSignalsCount}
                        </div>
                        <div className="text-sm text-[#999999]">New documents in last 7 days</div>
                    </div>

                    {/* New Alerts */}
                    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-6">
                            <div className="text-[#202020] text-base font-semibold">New Alerts</div>
                            <svg
                                className="w-6 h-6 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <div className="text-5xl font-bold text-[#202020] mb-2">
                            {loading ? '-' : stats.newAlertsCount}
                        </div>
                        <div className="text-sm text-[#999999]">High-impact changes</div>
                    </div>

                    {/* Sources Monitored */}
                    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-6">
                            <div className="text-[#202020] text-base font-semibold">Sources Monitored</div>
                            <svg
                                className="w-6 h-6 text-[#666666]"
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
                        </div>
                        <div className="text-5xl font-bold text-[#202020] mb-2">
                            {loading ? '-' : stats.sourcesMonitored}
                        </div>
                        <div className="text-sm text-[#999999]">Active monitoring sources</div>
                    </div>

                    {/* Latest Newsletter */}
                    <Link
                        href={stats.latestNewsletter ? `/newsletters/${stats.latestNewsletter.id}` : '/newsletters'}
                        className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer block"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="text-[#202020] text-base font-semibold">Latest Newsletter</div>
                            <svg
                                className="w-6 h-6 text-[#666666]"
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
                        </div>
                        {loading ? (
                            <>
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                            </>
                        ) : stats.latestNewsletter ? (
                            <>
                                <div className="text-lg font-semibold text-[#202020] mb-2 line-clamp-2">
                                    {stats.latestNewsletter.metadata?.source_name || 'Policy Newsletter'}
                                </div>
                                <div className="text-sm text-[#999999]">
                                    {formatDateRange(stats.latestNewsletter.period_start, stats.latestNewsletter.period_end)}
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-[#999999]">No newsletters available</div>
                        )}
                    </Link>
                </div>

                {/* Main Content - 2 Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Left Column: Recent Signals Feed (2/3 width on large screens) */}
                    <div className="lg:col-span-2">
                        <RecentSignalsFeed
                            sources={sources}
                            loading={loading}
                        />
                    </div>

                    {/* Right Column: Latest Newsletters (1/3 width on large screens) */}
                    <div>
                        <LatestNewslettersPanel
                            digests={digests}
                            loading={loading}
                        />
                    </div>
                </div>

                {/* Sources Overview Grid */}
                <div className="mb-8">
                    <SourcesOverviewGrid
                        sources={sources}
                        loading={loading}
                        onRunCrawl={handleRunCrawl}
                    />
                </div>

                {/* Recent Crawl Jobs */}
                <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-[#202020]">Recent Crawl Jobs</h2>
                        <Link
                            href="/jobs"
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            View all jobs →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 rounded"></div>
                            ))}
                        </div>
                    ) : jobs.length === 0 ? (
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
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            <p>No recent crawl jobs</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#E5E5E5]">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#202020]">Source</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#202020]">Started</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#202020]">Documents</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#202020]">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.slice(0, 10).map((job) => {
                                        const source = sources.find(s => s.id === job.source_id);
                                        return (
                                            <tr key={job.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA]">
                                                <td className="py-3 px-4 text-sm text-[#202020]">
                                                    {source?.name || 'Unknown Source'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[#727272]">
                                                    {job.started_at
                                                        ? new Date(job.started_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                        : 'Not started'
                                                    }
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[#727272]">
                                                    {job.items_crawled || 0} found
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${job.status === 'done'
                                                                ? 'bg-green-100 text-green-800'
                                                                : job.status === 'failed'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : job.status === 'running'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                            }`}
                                                    >
                                                        {job.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
