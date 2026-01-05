import React from 'react';

export interface StatCardProps {
    label: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    iconBgColor?: string;
    iconColor?: string;
    isLoading?: boolean;
    trend?: {
        value: number;
        direction: 'up' | 'down';
        label?: string;
    };
    className?: string;
}

export function StatCard({
    label,
    value,
    subtitle,
    icon,
    iconBgColor = 'bg-blue-50',
    iconColor = 'text-blue-600',
    isLoading = false,
    trend,
    className = '',
}: StatCardProps) {
    const displayValue = isLoading ? '—' : value;

    // Create accessible label for screen readers
    const ariaLabel = isLoading
        ? `${label}: Loading`
        : trend
            ? `${label}: ${displayValue}. ${trend.direction === 'up' ? 'Increased' : 'Decreased'} by ${Math.abs(trend.value)} percent ${trend.label || ''}`
            : `${label}: ${displayValue}`;

    return (
        <section
            className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className}`}
            role="region"
            aria-label={ariaLabel}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-600">{label}</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900" aria-live="polite">
                        {displayValue}
                    </p>
                    {subtitle && (
                        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
                    )}
                    {trend && !isLoading && (
                        <div className="mt-2 flex items-center gap-1">
                            <span
                                className={`text-sm font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}
                                role="status"
                                aria-label={`${trend.direction === 'up' ? 'Increased' : 'Decreased'} by ${Math.abs(trend.value)} percent`}
                            >
                                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            {trend.label && (
                                <span className="text-xs text-gray-500">{trend.label}</span>
                            )}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`rounded-full ${iconBgColor} p-3`} aria-hidden="true">
                        <div className={`h-6 w-6 ${iconColor}`}>{icon}</div>
                    </div>
                )}
            </div>
        </section>
    );
}
