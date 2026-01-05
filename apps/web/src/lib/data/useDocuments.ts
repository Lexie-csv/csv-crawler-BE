/**
 * useDocuments Hook
 * Fetches documents with optional filtering
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useDocuments({ days: 7, is_alert: false });
 * ```
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/api/client';
import { buildApiUrl, defaultSWRConfig } from './index';
import type {
    Document,
    DocumentsListParams,
    DocumentsListResponse
} from '@csv/types';

/**
 * Fetch documents with filters
 * 
 * @param params - Query parameters for filtering documents
 * @param params.days - Number of days to look back (default: 7)
 * @param params.limit - Max number of results (default: 20)
 * @param params.offset - Pagination offset (default: 0)
 * @param params.is_alert - Filter by alert status (true = policy docs, false = news)
 * @param params.type - Filter by source type ('policy', 'news', etc.)
 * @param params.source_id - Filter by specific source ID
 * 
 * @returns Documents list with loading/error states
 */
export function useDocuments(params?: DocumentsListParams) {
    // Build the API URL with query params
    const url = params
        ? buildApiUrl('/documents', params as Record<string, unknown>)
        : '/documents';

    // Fetch data with SWR
    const { data, error, mutate, isLoading } = useSWR<DocumentsListResponse>(
        url,
        fetcher,
        defaultSWRConfig
    );

    return {
        documents: data?.data ?? [],
        total: data?.total ?? 0,
        limit: data?.limit ?? (params?.limit || 20),
        offset: data?.offset ?? (params?.offset || 0),
        hasMore: data?.hasMore ?? false,
        isLoading: isLoading || (!data && !error),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
        isEmpty: !isLoading && !error && (data?.data.length === 0),
    };
}

/**
 * Fetch a single document by ID
 * 
 * @param id - Document UUID
 * @returns Single document with loading/error states
 */
export function useDocument(id: string | null) {
    const url = id ? `/documents/${id}` : null;

    const { data, error, mutate, isLoading } = useSWR<{ data: Document }>(
        url,
        fetcher,
        defaultSWRConfig
    );

    return {
        document: data?.data ?? null,
        isLoading: isLoading || (!data && !error && !!id),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
        notFound: error && 'status' in error && (error as { status: number }).status === 404,
    };
}

/**
 * Convenience hook: Fetch recent signals (non-alert documents)
 * 
 * @param days - Number of days to look back (default: 7)
 * @param limit - Max results (default: 10)
 */
export function useRecentSignals(days = 7, limit = 10) {
    return useDocuments({
        days,
        limit,
        is_alert: false
    });
}

/**
 * Convenience hook: Fetch recent alerts (policy documents)
 * 
 * @param days - Number of days to look back (default: 7)
 * @param limit - Max results (default: 10)
 */
export function useRecentAlerts(days = 7, limit = 10) {
    return useDocuments({
        days,
        limit,
        is_alert: true
    });
}
