import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, PlayCircle, FileText, TrendingUp } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Stats {
    totalSources: number;
    activeJobs: number;
    totalDocuments: number;
    weeklyDocuments: number;
}

interface RecentJob {
    id: number;
    source_id: number;
    status: string;
    created_at: string;
    completed_at: string | null;
}

async function getStats(): Promise<Stats> {
    try {
        const res = await fetch(`${API_BASE}/api/stats`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to fetch stats');
        return await res.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        return {
            totalSources: 0,
            activeJobs: 0,
            totalDocuments: 0,
            weeklyDocuments: 0,
        };
    }
}

async function getRecentJobs(): Promise<RecentJob[]> {
    try {
        const res = await fetch(`${API_BASE}/api/crawl-jobs?limit=5`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to fetch recent jobs');
        return await res.json();
    } catch (error) {
        console.error('Error fetching recent jobs:', error);
        return [];
    }
}

function getStatusVariant(status: string): 'pending' | 'running' | 'completed' | 'failed' | 'default' {
    const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed'> = {
        completed: 'completed',
        running: 'running',
        pending: 'pending',
        failed: 'failed',
    };
    return statusMap[status] || 'default';
}

export default async function DashboardPage() {
    const [stats, recentJobs] = await Promise.all([getStats(), getRecentJobs()]);

    return (
        <div className="py-6 sm:py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ lineHeight: '1.3' }}>Signals</h1>
                    <p className="text-lg text-gray-600">Monitor policy and regulatory updates across your tracked sources.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-800">Total Sources</h3>
                            <Globe className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-3xl font-semibold text-gray-900">{stats.totalSources}</div>
                        <p className="text-sm text-gray-600 mt-1">Active monitoring sources</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-800">Active Jobs</h3>
                            <PlayCircle className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-3xl font-semibold text-gray-900">{stats.activeJobs}</div>
                        <p className="text-sm text-gray-600 mt-1">Currently running</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-800">Total Documents</h3>
                            <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-3xl font-semibold text-gray-900">{stats.totalDocuments}</div>
                        <p className="text-sm text-gray-600 mt-1">All time extracted</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-800">This Week</h3>
                            <TrendingUp className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-3xl font-semibold text-gray-900">{stats.weeklyDocuments}</div>
                        <p className="text-sm text-gray-600 mt-1">Documents this week</p>
                    </Card>
            </div>

                {/* Recent Jobs */}
                <Card className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ lineHeight: '1.3' }}>Recent Crawl Jobs</h2>
                    {recentJobs.length === 0 ? (
                        <p className="text-gray-600 text-sm">No recent jobs</p>
                    ) : (
                        <div className="space-y-3">
                            {recentJobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-3"
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="text-base font-semibold text-gray-900">Job #{job.id}</div>
                                            <div className="text-sm text-gray-600">
                                                Source ID: {job.source_id}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-gray-700">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </div>
                                        <Badge variant={getStatusVariant(job.status)}>
                                            {job.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
