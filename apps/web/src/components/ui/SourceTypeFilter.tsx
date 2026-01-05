/**
 * SourceTypeFilter Component
 * Reusable dropdown filter for source types
 */

interface SourceTypeFilterProps {
    value: string;
    onChange: (value: string) => void;
    options?: Array<{ value: string; label: string }>;
    className?: string;
    allLabel?: string;
}

const DEFAULT_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All Types' },
    { value: 'policy', label: 'Policy' },
    { value: 'market', label: 'Market' },
    { value: 'news', label: 'News' },
];

export function SourceTypeFilter({
    value,
    onChange,
    options = DEFAULT_OPTIONS,
    className = '',
    allLabel = 'All Types',
}: SourceTypeFilterProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`px-3 py-1.5 border border-[#DCDCDC] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#202020] transition-all ${className}`}
            aria-label="Filter by source type"
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.value === 'all' ? allLabel : option.label}
                </option>
            ))}
        </select>
    );
}
