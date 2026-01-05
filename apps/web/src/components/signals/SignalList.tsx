'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Document } from '@csv/types';
import { DocumentCard, EmptyState } from '@/components/ui';

interface SignalListProps {
    documents: Document[];
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
    total: number;
    hasMore: boolean;
    onLoadMore: () => void;
}

export function SignalList({
    documents,
    isLoading,
    isError,
    isEmpty,
    total,
    hasMore,
    onLoadMore
}: SignalListProps) {
    // Memoize document list to prevent unnecessary re-renders
    const documentList = useMemo(() => documents, [documents]);

    // Memoize load more handler
    const handleLoadMore = useCallback(() => {
        onLoadMore();
    }, [onLoadMore]);

    // Loading State
    if (isLoading) {
        return (
            <div role="status" aria-live="polite" aria-label="Loading documents">
                <div className="animate-pulse">
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-100 rounded"></div>
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading documents...</span>
            </div>
        );
    }

    // Error State
    if (isError) {
        return (
            <div
                role="alert"
                aria-live="assertive"
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
            >
                Failed to load signals. Please try again.
            </div>
        );
    }

    // Empty State
    if (isEmpty || documents.length === 0) {
        return (
            <EmptyState
                icon={
                    <svg
                        className="mx-auto h-12 w-12 text-[#DCDCDC] mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                }
                title="No signals found for the selected filters."
                message="Try adjusting your filters or run a crawl to collect new data."
            />
        );
    }

    // Documents List
    return (
        <>
            <div
                className="space-y-4"
                role="feed"
                aria-label="Documents feed"
                aria-busy={isLoading}
            >
                {documentList.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="mt-6 text-center">
                    <button
                        onClick={handleLoadMore}
                        className="px-6 py-2 bg-[#202020] text-white rounded-md hover:bg-[#404040] transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#202020]"
                        aria-label={`Load more documents. Currently showing ${documentList.length} of ${total} total documents`}
                    >
                        Load More ({documentList.length} of {total})
                    </button>
                </div>
            )}

            {/* View All Link */}
            {!hasMore && documentList.length > 0 && (
                <div className="mt-6 text-center">
                    <Link
                        href="/documents"
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 rounded"
                    >
                        View all documents →
                    </Link>
                </div>
            )}
        </>
    );
}