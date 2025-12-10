'use client';

import { useState, useEffect } from 'react';
import { sourcesApi, documentsApi } from '@/lib/api';
import {
  RecentSignalsFeed,
  LatestNewslettersPanel,
  SourcesOverviewGrid,
} from '@/components/dashboard';

export default function SignalsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    newSignals: 0,     // News articles in last 7 days
    newAlerts: 0,      // Policy documents in last 7 days
    sourcesMonitored: 0,
    latestNewsletter: null as any,
  });
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // Fetch sources
        const sourcesResult = await sourcesApi.list();
        setSources(sourcesResult || []);

        // Count NEW SIGNALS (news articles in last 7 days)
        const signalsResult = await documentsApi.list({
          days: 7,
          is_alert: false, // Only news articles
          limit: 1000,
        });

        // Count NEW ALERTS (policy documents in last 7 days)
        const alertsResult = await documentsApi.list({
          days: 7,
          is_alert: true, // Only policy documents
          limit: 1000,
        });

        // Hardcoded latest newsletter
        const latestNewsletter = {
          id: 'combined-news-2025-12-05',
          title: 'Combined News Intelligence – Energy & Business Update',
          dateRange: 'Nov 27 – Dec 5, 2025',
          highlights: 10,
          datapoints: 25,
        };

        setStats({
          newSignals: signalsResult.data.length,
          newAlerts: alertsResult.data.length,
          sourcesMonitored: sourcesResult?.length || 0,
          latestNewsletter,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor policy updates, regulatory changes, and energy sector intelligence
          </p>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* New Signals */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Signals</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? '—' : stats.newSignals}
                </p>
                <p className="mt-1 text-xs text-gray-500">News articles in last 7 days</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
                  <line x1="8" y1="10" x2="16" y2="10" strokeWidth={2} strokeLinecap="round" />
                  <line x1="8" y1="14" x2="16" y2="14" strokeWidth={2} strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* New Alerts */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Alerts</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? '—' : stats.newAlerts}
                </p>
                <p className="mt-1 text-xs text-gray-500">Policy updates in last 7 days</p>
              </div>
              <div className="rounded-full bg-red-50 p-3">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <line x1="12" y1="8" x2="12" y2="13" strokeWidth={2} strokeLinecap="round" />
                  <circle cx="12" cy="16" r="0.5" fill="currentColor" strokeWidth={2} />
                </svg>
              </div>
            </div>
          </div>

          {/* Sources Monitored */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sources Monitored</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? '—' : stats.sourcesMonitored}
                </p>
                <p className="mt-1 text-xs text-gray-500">Active monitoring sources</p>
              </div>
              <div className="rounded-full bg-green-50 p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <circle cx="12" cy="12" r="5" strokeWidth={2} />
                  <line x1="12" y1="3" x2="12" y2="7" strokeWidth={2} />
                  <line x1="12" y1="17" x2="12" y2="21" strokeWidth={2} />
                  <line x1="3" y1="12" x2="7" y2="12" strokeWidth={2} />
                  <line x1="17" y1="12" x2="21" y2="12" strokeWidth={2} />
                </svg>
              </div>
            </div>
          </div>

          {/* Latest Newsletter */}
          <div 
            className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            onClick={() => window.location.href = '/newsletters/combined-news-2025-12-05'}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Latest Newsletter</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {loading ? '—' : stats.latestNewsletter?.dateRange || '—'}
                </p>
                <p className="mt-1 text-xs text-gray-500">Click to view summary</p>
              </div>
              <div className="rounded-full bg-purple-50 p-3">
                <svg
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="4" y="6" width="16" height="12" rx="1" strokeWidth={2} />
                  <path d="M4 9 L12 14 L20 9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentSignalsFeed sources={sources} loading={loading} />
          </div>
          <div className="space-y-8">
            <LatestNewslettersPanel digests={[]} />
          </div>
        </div>

        {/* Sources Overview */}
        <div className="mt-8">
          <SourcesOverviewGrid sources={sources} loading={loading} />
        </div>

        {/* Recent Crawl Jobs */}
        <div className="mt-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Crawl Jobs</h2>
              <a href="/crawl-jobs" className="text-sm text-blue-600 hover:text-blue-800">
                View all →
              </a>
            </div>
            <div className="text-sm text-gray-500">
              No recent crawl jobs to display
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
