'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useDigest } from '@/lib/data/useDigests';
import { NewsletterSummaryNewspaper } from '@/components/NewsletterSummaryNewspaper';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function NewsletterDetailPage() {
    const params = useParams();
    const jobId = params?.jobId as string;

    const { digest, isLoading, isError, notFound } = useDigest(jobId);

    return (
        <ErrorBoundary>
            {isLoading ? (
                <div className="p-8">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-[#727272]">Loading newsletter...</div>
                    </div>
                </div>
            ) : notFound || (!digest && !isLoading) ? (
                <div className="p-8">
                    <div className="mb-6">
                        <Link
                            href="/newsletters"
                            className="text-sm text-blue-600 hover:underline mb-4 inline-block"
                        >
                            ← Back to Newsletters
                        </Link>
                    </div>
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <div className="text-xl font-semibold text-[#202020] mb-2">Newsletter Not Found</div>
                        <div className="text-[#727272]">The newsletter you're looking for doesn't exist.</div>
                    </div>
                </div>
            ) : isError || !digest ? (
                <div className="p-8">
                    <div className="mb-6">
                        <Link
                            href="/newsletters"
                            className="text-sm text-blue-600 hover:underline mb-4 inline-block"
                        >
                            ← Back to Newsletters
                        </Link>
                    </div>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-red-600">Failed to load newsletter. Please try again.</div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Format date range for display */}
                    {(() => {
                        const dateRange = `${new Date(digest.period_start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })} - ${new Date(digest.period_end).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}`;

                        const newsletterTitle = digest.source_name
                            ? `${digest.source_name} - Policy Newsletter`
                            : 'Policy Newsletter';

                        return (
                            <div>
                                {/* Navigation */}
                                <div className="p-8 pb-0">
                                    <Link
                                        href="/newsletters"
                                        className="text-sm text-blue-600 hover:underline inline-block"
                                    >
                                        ← Back to Newsletters
                                    </Link>
                                </div>

                                {/* Newsletter Content */}
                                <NewsletterSummaryNewspaper
                                    digest={digest}
                                    newsletterTitle={newsletterTitle}
                                    dateRange={dateRange}
                                />
                            </div>
                        );
                    })()}
                </>
            )}
        </ErrorBoundary>
    );
}
