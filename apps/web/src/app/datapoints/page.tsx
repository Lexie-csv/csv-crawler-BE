'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { datapointsApi, sourcesApi, Datapoint, Source } from '@/lib/api';
import { Table } from '@/components/Table';

export default function DatapointsPage(): JSX.Element {
  const searchParams = useSearchParams();
  const [datapoints, setDatapoints] = useState<Datapoint[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    source_id: searchParams.get('source_id') || '',
    category: searchParams.get('category') || '',
    subcategory: searchParams.get('subcategory') || '',
    document_id: searchParams.get('document_id') || '',
  });

  // Extract unique categories and subcategories
  const categories = Array.from(new Set(datapoints.map((d) => d.category))).sort();
  const subcategories = Array.from(
    new Set(datapoints.filter((d) => d.subcategory).map((d) => d.subcategory))
  ).sort() as string[];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadDatapoints();
  }, [filters]);

  const loadData = async () => {
    await Promise.all([loadSources(), loadDatapoints()]);
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

  const loadDatapoints = async () => {
    try {
      const params: any = {};
      if (filters.source_id) params.source_id = filters.source_id;
      if (filters.category) params.category = filters.category;
      if (filters.subcategory) params.subcategory = filters.subcategory;

      const data = await datapointsApi.list(params);
      setDatapoints(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datapoints');
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

  const handleExport = () => {
    const headers = ['Category', 'Subcategory', 'Title', 'Value', 'Date', 'URL', 'Source'];
    const rows = datapoints.map((dp) => {
      const source = sources.find((s) => s.id === dp.source_id);
      return [
        dp.category,
        dp.subcategory || '',
        dp.title,
        dp.value || '',
        dp.date_value || '',
        dp.url || '',
        source?.name || '',
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datapoints-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: 'category',
      header: 'Category',
      render: (dp: Datapoint) => (
        <div>
          <div className="font-medium text-sm">{dp.category}</div>
          {dp.subcategory && (
            <div className="text-xs text-secondary">{dp.subcategory}</div>
          )}
        </div>
      ),
      width: '15%',
    },
    {
      key: 'title',
      header: 'Title',
      render: (dp: Datapoint) => (
        <div>
          <div className="font-medium text-sm">{truncate(dp.title, 50)}</div>
          {dp.url && (
            <a
              href={dp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              View Source →
            </a>
          )}
        </div>
      ),
      width: '30%',
    },
    {
      key: 'value',
      header: 'Value',
      render: (dp: Datapoint) => (
        <span className="text-sm">{truncate(dp.value, 40)}</span>
      ),
      width: '20%',
    },
    {
      key: 'date',
      header: 'Date',
      render: (dp: Datapoint) => (
        <span className="text-sm">{formatDate(dp.date_value)}</span>
      ),
      width: '12%',
    },
    {
      key: 'source',
      header: 'Source',
      render: (dp: Datapoint) => {
        const source = sources.find((s) => s.id === dp.source_id);
        return <span className="text-sm">{source?.name || 'Unknown'}</span>;
      },
      width: '15%',
    },
    {
      key: 'metadata',
      header: 'Metadata',
      render: (dp: Datapoint) => (
        <div className="text-xs text-secondary">
          {dp.metadata ? (
            <button
              onClick={() => alert(JSON.stringify(dp.metadata, null, 2))}
              className="text-blue-600 hover:underline"
            >
              View JSON
            </button>
          ) : (
            '-'
          )}
        </div>
      ),
      width: '8%',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-copy">Datapoints</h1>
              <p className="text-secondary mt-1">Explore extracted regulatory data and insights</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                disabled={datapoints.length === 0}
                className="px-4 py-2 bg-copy text-white rounded-md text-sm font-medium hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
              <Link
                href="/documents"
                className="px-4 py-2 border border-border text-copy rounded-md text-sm font-medium hover:bg-bg-contrast transition"
              >
                ← Back to Documents
              </Link>
            </div>
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
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-copy"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Subcategory
              </label>
              <select
                value={filters.subcategory}
                onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
                className="px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-copy"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {filters.document_id && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Document Filter
                </label>
                <div className="px-3 py-1.5 bg-bg-contrast rounded-md text-sm">
                  Doc: {filters.document_id.substring(0, 8)}...
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
            <p className="mt-4 text-secondary">Loading datapoints...</p>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg shadow-sm border border-border">
            <div className="px-6 py-3 border-b border-border">
              <p className="text-sm text-secondary">
                Showing {datapoints.length} datapoint{datapoints.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Table
              columns={columns}
              data={datapoints}
              keyExtractor={(dp) => dp.id}
              emptyMessage="No datapoints found. Documents need to be extracted first."
            />
          </div>
        )}
      </div>
    </div>
  );
}
