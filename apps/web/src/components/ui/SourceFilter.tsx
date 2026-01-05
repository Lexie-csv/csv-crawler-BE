/**
 * SourceFilter Component
 * Reusable dropdown filter for specific sources
 */

import { type Source } from '@csv/types';

interface SourceFilterProps {
    value: string;
    onChange: (value: string) => void;
    sources: readonly Source[];
    className?: string;
    allLabel?: string;
}

export function SourceFilter({
    value,
    onChange,
    sources,
    className = '',
    allLabel = 'All Sources',
}: SourceFilterProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`px-3 py-1.5 border border-[#DCDCDC] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#202020] transition-all ${className}`}
            aria-label="Filter by source"
        >
            <option value="all">{allLabel}</option>
            {sources.map(source => (
                <option key={source.id} value={source.name}>
                    {source.name}
                </option>
            ))}
        </select>
    );
}
