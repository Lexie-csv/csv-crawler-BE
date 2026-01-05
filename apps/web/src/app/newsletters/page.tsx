'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDigests } from '@/lib/data/useDigests';
import { Table } from '@/components/Table';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function NewslettersPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const {
        digests,
        totalItems,
        totalPages,
        isLoading,
        isError
    } = useDigests({
        page: currentPage,
        pageSize
    });

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-[#727272]">Loading newsletters...</div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-red-600">Failed to load newsletters. Please try again.</div>
                </div>
            </div>
        );
    }

    const tableData = digests.map((digest) => ({
        id: digest.id,
        title: `Digest ${digest.id.slice(0, 8)}`,
        source: digest.source_name || 'Unknown Source',
        periodStart: new Date(digest.period_start).toLocaleDateString(),
        periodEnd: new Date(digest.period_end).toLocaleDateString(),
        highlights: digest.highlights_count || 0,
        datapoints: digest.datapoints_count || 0,
        createdAt: new Date(digest.created_at).toLocaleDateString(),
        crawl_job_id: digest.crawl_job_id,
    }));

    type TableRow = typeof tableData[0];

    const columns = [
        {
            key: 'title',
            header: 'Digest',
            render: (row: TableRow) => <span className="font-medium">{row.title}</span>
        },
        {
            key: 'source',
            header: 'Source',
            render: (row: TableRow) => row.source
        },
        {
            key: 'periodStart',
            header: 'Period Start',
            render: (row: TableRow) => row.periodStart
        },
        {
            key: 'periodEnd',
            header: 'Period End',
            render: (row: TableRow) => row.periodEnd
        },
        {
            key: 'highlights',
            header: 'Highlights',
            render: (row: TableRow) => row.highlights
        },
        {
            key: 'datapoints',
            header: 'Datapoints',
            render: (row: TableRow) => row.datapoints
        },
        {
            key: 'createdAt',
            header: 'Created',
            render: (row: TableRow) => row.createdAt
        },
        {
            key: 'actions',
            header: '',
            render: (row: TableRow) => (
                <Link
                    href={`/newsletters/${row.crawl_job_id}`}
                    className="text-sm text-blue-600 hover:underline"
                >
                    View →
                </Link>
            )
        },
    ];

    return (
        <ErrorBoundary>
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[#202020] mb-2">Newsletters</h1>
                    <p className="text-[#727272]">
                        Browse all generated policy newsletters and digests.
                    </p>
                </div>

                <Table<TableRow>
                    data={tableData}
                    columns={columns}
                    keyExtractor={(row) => row.id}
                />

                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-[#727272]">
                            Page {currentPage} of {totalPages} ({totalItems} total newsletters)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-[#DCDCDC] rounded-md text-sm font-medium text-[#202020] hover:bg-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white border border-[#DCDCDC] rounded-md text-sm font-medium text-[#202020] hover:bg-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
