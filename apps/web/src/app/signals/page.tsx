'use client';

import { useDashboardStats } from '@/lib/data/useDashboardStats';
import {
    RecentSignalsFeed,
    LatestNewslettersPanel,
    SourcesOverviewGrid,
} from '@/components/dashboard';
import { StatsCards, RecentCrawlJobs } from '@/components/signals';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SignalsPage() {
    // Fetch dashboard stats (signals, alerts, latest digest)
    const { stats, isLoading: statsLoading } = useDashboardStats({ days: 7 });

    const loading = statsLoading;

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="mt-2 text-gray-600">
                            Monitor policy updates, regulatory changes, and energy sector intelligence
                        </p>
                    </div>

                    {/* KPI Cards */}
                    <StatsCards stats={stats} isLoading={loading} />

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <RecentSignalsFeed loading={loading} />
                        </div>
                        <div className="space-y-8">
                            <LatestNewslettersPanel />
                        </div>
                    </div>

                    {/* Sources Overview */}
                    <div className="mt-8">
                        {/* TODO: SourcesOverviewGrid needs enriched data with crawl stats - will implement in Phase 2 */}
                        <SourcesOverviewGrid sources={[]} loading={loading} />
                    </div>

                    {/* Recent Crawl Jobs */}
                    <div className="mt-8">
                        <RecentCrawlJobs />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
