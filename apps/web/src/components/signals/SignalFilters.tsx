'use client';

import { useSources } from '@/lib/data/useSources';
import { TimeRangeFilter, SourceTypeFilter, SourceFilter, type TimeRange } from '@/components/ui';

interface SignalFiltersProps {
    timeFilter: TimeRange;
    onTimeFilterChange: (value: TimeRange) => void;
    typeFilter: string;
    onTypeFilterChange: (value: string) => void;
    sourceFilter: string;
    onSourceFilterChange: (value: string) => void;
}

export function SignalFilters({
    timeFilter,
    onTimeFilterChange,
    typeFilter,
    onTypeFilterChange,
    sourceFilter,
    onSourceFilterChange
}: SignalFiltersProps) {
    // Fetch sources directly - no prop drilling needed
    const { sources } = useSources();

    return (
        <fieldset className="flex flex-wrap gap-3">
            <legend className="sr-only">Filter Documents</legend>

            <TimeRangeFilter
                value={timeFilter}
                onChange={onTimeFilterChange}
                aria-label="Filter by time range"
            />

            <SourceTypeFilter
                value={typeFilter}
                onChange={onTypeFilterChange}
                aria-label="Filter by document type"
            />

            <SourceFilter
                value={sourceFilter}
                onChange={onSourceFilterChange}
                sources={sources}
                aria-label="Filter by source"
            />
        </fieldset>
    );
}
