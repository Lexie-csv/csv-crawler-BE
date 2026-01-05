/**
 * useDigests Hook
 * Fetches paginated digest/newsletter list
 * 
 * @example
 * ```tsx
 * const { digests, isLoading } = useDigests({ pageSize: 10 });
 * ```
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/api/client';
import { buildApiUrl, defaultSWRConfig } from './index';
import type {
    CrawlDigest,
    DigestsListParams,
    DigestsListResponse
} from '@csv/types';

/**
 * Fetch paginated digest list
 * 
 * @param params - Query parameters
 * @param params.page - Page number (1-indexed, default: 1)
 * @param params.pageSize - Items per page (default: 20, max: 100)
 * @param params.sourceId - Filter by source ID
 * 
 * @returns Paginated digests with metadata
 */
export function useDigests(params?: DigestsListParams) {
    // Build the API URL with query params
    const url = params
        ? buildApiUrl('/digests', params as Record<string, unknown>)
        : '/digests';

    // Fetch data with SWR
    const { data, error, mutate, isLoading } = useSWR<DigestsListResponse>(
        url,
        fetcher,
        defaultSWRConfig
    );

    return {
        digests: data?.items ?? [],
        page: data?.page ?? (params?.page || 1),
        pageSize: data?.pageSize ?? (params?.pageSize || 20),
        totalItems: data?.totalItems ?? 0,
        totalPages: data?.totalPages ?? 0,
        hasMore: data?.hasMore ?? false,
        isLoading: isLoading || (!data && !error),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
        isEmpty: !isLoading && !error && (data?.items.length === 0),
    };
}

/**
 * Fetch a single digest by ID
 * 
 * @param id - Digest UUID
 * @returns Single digest with highlights and datapoints
 */
export function useDigest(id: string | null) {
    const url = id ? `/digests/${id}` : null;

    const { data, error, mutate, isLoading } = useSWR<{ data: CrawlDigest }>(
        url,
        fetcher,
        defaultSWRConfig
    );

    return {
        digest: data?.data ?? null,
        isLoading: isLoading || (!data && !error && !!id),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
        notFound: error && 'status' in error && (error as { status: number }).status === 404,
    };
}

/**
 * Convenience hook: Fetch latest digest (most recent newsletter)
 * 
 * @returns The most recent digest or null
 */
export function useLatestDigest() {
    const { digests, isLoading, error } = useDigests({
        page: 1,
        pageSize: 1
    });

    return {
        digest: digests[0] ?? null,
        isLoading,
        isError: !!error,
        error,
    };
}

/**
 * Convenience hook: Fetch digests for a specific source
 * 
 * @param sourceId - Source UUID
 * @param pageSize - Number of digests to fetch (default: 10)
 */
export function useSourceDigests(sourceId: string | null, pageSize = 10) {
    const params = sourceId
        ? { sourceId, pageSize, page: 1 }
        : null;

    const url = params
        ? buildApiUrl('/digests', params as Record<string, unknown>)
        : null;

    const { data, error, mutate, isLoading } = useSWR<DigestsListResponse>(
        url,
        fetcher,
        defaultSWRConfig
    );

    return {
        digests: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
        isLoading: isLoading || (!data && !error && !!sourceId),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
    };
}
