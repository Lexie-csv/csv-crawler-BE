'use client';

import { StatCard } from '@/components/ui';
import type { CrawlDigest } from '@csv/types';

interface StatsCardsProps {
    stats: {
        newSignals: number;
        newAlerts: number;
        sourcesMonitored: number;
        latestDigest: CrawlDigest | null;
    };
    isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
    const handleNewsletterClick = () => {
        if (stats?.latestDigest?.id) {
            window.location.href = `/newsletters/${stats.latestDigest.id}`;
        }
    };

    return (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label="New Signals"
                value={stats.newSignals}
                subtitle="News articles in last 7 days"
                isLoading={isLoading}
                iconBgColor="bg-blue-50"
                iconColor="text-blue-600"
                icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
                        <line x1="8" y1="10" x2="16" y2="10" strokeWidth={2} strokeLinecap="round" />
                        <line x1="8" y1="14" x2="16" y2="14" strokeWidth={2} strokeLinecap="round" />
                    </svg>
                }
            />

            <StatCard
                label="New Alerts"
                value={stats.newAlerts}
                subtitle="Policy updates in last 7 days"
                isLoading={isLoading}
                iconBgColor="bg-red-50"
                iconColor="text-red-600"
                icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        <line x1="12" y1="8" x2="12" y2="13" strokeWidth={2} strokeLinecap="round" />
                        <circle cx="12" cy="16" r="0.5" fill="currentColor" strokeWidth={2} />
                    </svg>
                }
            />

            <StatCard
                label="Sources Monitored"
                value={stats.sourcesMonitored}
                subtitle="Active monitoring sources"
                isLoading={isLoading}
                iconBgColor="bg-green-50"
                iconColor="text-green-600"
                icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        <circle cx="12" cy="12" r="5" strokeWidth={2} />
                        <line x1="12" y1="3" x2="12" y2="7" strokeWidth={2} />
                        <line x1="12" y1="17" x2="12" y2="21" strokeWidth={2} />
                        <line x1="3" y1="12" x2="7" y2="12" strokeWidth={2} />
                        <line x1="17" y1="12" x2="21" y2="12" strokeWidth={2} />
                    </svg>
                }
            />

            <div className="cursor-pointer" onClick={handleNewsletterClick}>
                <StatCard
                    label="Latest Newsletter"
                    value={stats?.latestDigest?.source_name || 'No newsletters yet'}
                    subtitle={
                        stats?.latestDigest
                            ? `${stats.latestDigest.highlights_count} highlights, ${stats.latestDigest.datapoints_count} datapoints`
                            : 'Run digest generation to create'
                    }
                    isLoading={isLoading}
                    iconBgColor="bg-purple-50"
                    iconColor="text-purple-600"
                    icon={
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="4" y="6" width="16" height="12" rx="1" strokeWidth={2} />
                            <path
                                d="M4 9 L12 14 L20 9"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    }
                />
            </div>
        </div>
    );
}
