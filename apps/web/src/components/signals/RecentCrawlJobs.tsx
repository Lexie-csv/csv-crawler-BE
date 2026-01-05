'use client';

export function RecentCrawlJobs() {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Crawl Jobs</h2>
                <a href="/crawl-jobs" className="text-sm text-blue-600 hover:text-blue-800">
                    View all →
                </a>
            </div>
            <div className="text-sm text-gray-500">No recent crawl jobs to display</div>
        </div>
    );
}
