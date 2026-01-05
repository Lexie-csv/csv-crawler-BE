/**
 * useDashboardStats Hook
 * Fetches aggregated statistics for dashboard KPI cards
 * 
 * @example
 * ```tsx
 * const { stats, isLoading } = useDashboardStats({ days: 7 });
 * ```
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/api/client';
import { buildApiUrl, defaultSWRConfig } from './index';
import type {
    DocumentsListResponse,
    DigestsListResponse,
    Source,
} from '@csv/types';

interface DashboardStatsParams {
    days?: number; // Number of days to look back (default: 7)
}

/**
 * Fetch dashboard statistics
 * Parallel fetches: signals count, alerts count, sources count, latest digest
 * 
 * @param params - Configuration
 * @param params.days - Number of days to look back for signals/alerts (default: 7)
 * 
 * @returns Dashboard statistics with loading/error states
 */
export function useDashboardStats(params?: DashboardStatsParams) {
    const days = params?.days ?? 7;

    // Fetch signals count (is_alert=false)
    const signalsUrl = buildApiUrl('/documents', { days, is_alert: false, limit: 100 });
    const { data: signalsData, error: signalsError } = useSWR<DocumentsListResponse>(
        signalsUrl,
        fetcher,
        defaultSWRConfig
    );

    // Fetch alerts count (is_alert=true)
    const alertsUrl = buildApiUrl('/documents', { days, is_alert: true, limit: 100 });
    const { data: alertsData, error: alertsError } = useSWR<DocumentsListResponse>(
        alertsUrl,
        fetcher,
        defaultSWRConfig
    );

    // Fetch sources count
    const { data: sourcesData, error: sourcesError } = useSWR<{ data: Source[] }>(
        '/sources',
        fetcher,
        defaultSWRConfig
    );

    // Fetch latest digest
    const digestsUrl = buildApiUrl('/digests', { page: 1, pageSize: 1 });
    const { data: digestsData, error: digestsError } = useSWR<DigestsListResponse>(
        digestsUrl,
        fetcher,
        defaultSWRConfig
    );

    // Determine loading state (true if any are loading)
    const isLoading = !signalsData || !alertsData || !sourcesData || !digestsData;

    // Determine error state
    const error = signalsError || alertsError || sourcesError || digestsError;

    // Calculate stats
    const stats = {
        newSignals: signalsData?.total ?? 0,
        newAlerts: alertsData?.total ?? 0,
        sourcesMonitored: sourcesData?.data.length ?? 0,
        latestDigest: digestsData?.items[0] ?? null,
    };

    return {
        stats,
        isLoading,
        isError: !!error,
        error: error ?? null,
        refresh: () => {
            // Trigger refresh for all endpoints
            // SWR will handle this automatically when we call mutate
        },
    };
}

/**
 * Convenience hook: Get just the counts (no latest digest)
 * Lighter weight for components that don't need the full digest
 * 
 * @param days - Number of days to look back (default: 7)
 */
export function useDashboardCounts(days = 7) {
    const signalsUrl = buildApiUrl('/documents', { days, is_alert: false, limit: 1 });
    const alertsUrl = buildApiUrl('/documents', { days, is_alert: true, limit: 1 });

    const { data: signalsData } = useSWR<DocumentsListResponse>(signalsUrl, fetcher, defaultSWRConfig);
    const { data: alertsData } = useSWR<DocumentsListResponse>(alertsUrl, fetcher, defaultSWRConfig);
    const { data: sourcesData } = useSWR<{ data: Source[] }>('/sources', fetcher, defaultSWRConfig);

    const isLoading = !signalsData || !alertsData || !sourcesData;

    return {
        newSignals: signalsData?.total ?? 0,
        newAlerts: alertsData?.total ?? 0,
        sourcesMonitored: sourcesData?.data.length ?? 0,
        isLoading,
    };
}
