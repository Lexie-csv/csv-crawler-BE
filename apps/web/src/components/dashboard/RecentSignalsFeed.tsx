'use client';

import { useState } from 'react';
import { useDocuments } from '@/lib/data/useDocuments';
import { timeRangeToDays, type TimeRange } from '@/components/ui';
import { SignalFilters } from '@/components/signals/SignalFilters';
import { SignalList } from '@/components/signals/SignalList';

interface RecentSignalsFeedProps {
    loading?: boolean;
}

export function RecentSignalsFeed({ loading: externalLoading = false }: RecentSignalsFeedProps) {
    const [timeFilter, setTimeFilter] = useState<TimeRange>('7days');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [limit, setLimit] = useState(20); // Start with 20 documents

    // Calculate days for query using helper
    const days = timeRangeToDays(timeFilter);

    // Fetch documents using hook with pagination
    const { documents, total, hasMore, isLoading, isError, isEmpty } = useDocuments({
        days,
        limit,
        is_alert: false
    });

    // Client-side filter by type and source
    const filteredDocuments = documents.filter(doc => {
        if (typeFilter !== 'all' && doc.source_type !== typeFilter) return false;
        if (sourceFilter !== 'all' && doc.source_name !== sourceFilter) return false;
        return true;
    });

    const loading = isLoading || externalLoading;

    const handleLoadMore = () => {
        setLimit(prev => prev + 20); // Load 20 more documents
    };

    return (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#202020] mb-4">Recent Signals & Alerts</h2>

                {/* Filters */}
                <SignalFilters
                    timeFilter={timeFilter}
                    onTimeFilterChange={setTimeFilter}
                    typeFilter={typeFilter}
                    onTypeFilterChange={setTypeFilter}
                    sourceFilter={sourceFilter}
                    onSourceFilterChange={setSourceFilter}
                />
            </div>

            {/* Signals List */}
            <SignalList
                documents={filteredDocuments}
                isLoading={loading}
                isError={isError}
                isEmpty={isEmpty}
                total={total}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
            />
        </div>
    );
}
