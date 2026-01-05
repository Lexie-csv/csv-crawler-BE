/**
 * TimeRangeFilter Component
 * Reusable time range filter with button group UI
 */

export type TimeRange = 'today' | '7days' | '30days' | '90days';

interface TimeRangeFilterProps {
    value: TimeRange;
    onChange: (value: TimeRange) => void;
    options?: Array<{ value: TimeRange; label: string }>;
    className?: string;
}

const DEFAULT_OPTIONS: Array<{ value: TimeRange; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 days' },
    { value: '30days', label: 'Last 30 days' },
];

export function TimeRangeFilter({
    value,
    onChange,
    options = DEFAULT_OPTIONS,
    className = '',
}: TimeRangeFilterProps) {
    return (
        <div className={`flex gap-2 border border-[#DCDCDC] rounded-md p-1 ${className}`}>
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${value === option.value
                            ? 'bg-[#202020] text-white'
                            : 'text-[#727272] hover:bg-[#EFEFEF]'
                        }`}
                    aria-pressed={value === option.value}
                    aria-label={`Filter by ${option.label}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

/**
 * Helper function to convert TimeRange to days number
 */
export function timeRangeToDays(range: TimeRange): number {
    switch (range) {
        case 'today':
            return 1;
        case '7days':
            return 7;
        case '30days':
            return 30;
        case '90days':
            return 90;
        default:
            return 7;
    }
}
