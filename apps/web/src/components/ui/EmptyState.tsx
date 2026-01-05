import React from 'react';
import Link from 'next/link';

export interface EmptyStateProps {
    title: string;
    message?: string;
    icon?: React.ReactNode;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    className?: string;
}

export function EmptyState({
    title,
    message,
    icon,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
        >
            {icon && (
                <div className="mb-4 text-[#A0A0A0]">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-[#202020] mb-2">
                {title}
            </h3>
            {message && (
                <p className="text-sm text-[#727272] max-w-md mb-6">
                    {message}
                </p>
            )}
            {action && (
                action.href ? (
                    <Link
                        href={action.href}
                        className="px-4 py-2 bg-[#202020] text-white rounded-md hover:bg-[#404040] transition-colors font-medium text-sm"
                    >
                        {action.label}
                    </Link>
                ) : (
                    <button
                        onClick={action.onClick}
                        className="px-4 py-2 bg-[#202020] text-white rounded-md hover:bg-[#404040] transition-colors font-medium text-sm"
                    >
                        {action.label}
                    </button>
                )
            )}
        </div>
    );
}
