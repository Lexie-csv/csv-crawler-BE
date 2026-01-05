import React from 'react';
import type { Document } from '@csv/types';

export interface DocumentCardProps {
    document: Document;
    showSource?: boolean;
    showDate?: boolean;
    maxSummaryLength?: number;
    className?: string;
}

/**
 * Optimized with React.memo to prevent unnecessary re-renders
 * Only re-renders when document ID changes or props change
 */
const arePropsEqual = (prevProps: DocumentCardProps, nextProps: DocumentCardProps) => {
    return (
        prevProps.document.id === nextProps.document.id &&
        prevProps.showSource === nextProps.showSource &&
        prevProps.showDate === nextProps.showDate &&
        prevProps.maxSummaryLength === nextProps.maxSummaryLength &&
        prevProps.className === nextProps.className
    );
};

function getTypeBadgeColor(type: string | null | undefined): string {
    switch (type?.toLowerCase()) {
        case 'policy':
            return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'market':
            return 'bg-green-50 text-green-700 border-green-200';
        case 'news':
            return 'bg-blue-50 text-blue-700 border-blue-200';
        default:
            return 'bg-gray-50 text-gray-700 border-gray-200';
    }
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

function DocumentCardComponent({
    document: doc,
    showSource = true,
    showDate = true,
    maxSummaryLength = 150,
    className = '',
}: DocumentCardProps) {
    // Generate unique IDs for ARIA relationships
    const titleId = `doc-title-${doc.id}`;
    const summaryId = doc.content ? `doc-summary-${doc.id}` : undefined;

    return (
        <article
            className={`border border-[#E5E5E5] rounded-lg p-4 hover:bg-[#FAFAFA] transition-colors ${className}`}
            aria-labelledby={titleId}
            aria-describedby={summaryId}
        >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`px-2 py-0.5 text-xs font-medium rounded border ${getTypeBadgeColor(
                            doc.source_type
                        )}`}
                        role="status"
                        aria-label={`Document type: ${doc.source_type || 'other'}`}
                    >
                        {(doc.source_type || 'other').toUpperCase()}
                    </span>
                    {showSource && (
                        <span className="text-sm text-[#727272]">
                            {doc.source_name || 'Unknown Source'}
                        </span>
                    )}
                    {showDate && (
                        <time
                            className="text-xs text-[#999999]"
                            dateTime={new Date(doc.created_at).toISOString()}
                        >
                            {formatRelativeTime(doc.created_at)}
                        </time>
                    )}
                </div>
            </div>

            {/* Title */}
            <h3 id={titleId} className="text-base font-semibold text-[#202020] mb-2">
                {doc.title}
            </h3>

            {/* Summary */}
            {doc.content && (
                <p id={summaryId} className="text-sm text-[#727272] mb-3 line-clamp-2">
                    {truncateText(doc.content, maxSummaryLength)}
                </p>
            )}

            {/* Actions */}
            {doc.url && (
                <div className="flex gap-3">
                    <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        aria-label={`View source for ${doc.title} (opens in new tab)`}
                    >
                        View Source
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                        </svg>
                    </a>
                </div>
            )}
        </article>
    );
}

// Export memoized version for performance optimization
export const DocumentCard = React.memo(DocumentCardComponent, arePropsEqual);
