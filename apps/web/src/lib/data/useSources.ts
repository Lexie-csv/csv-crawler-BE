/**
 * useSources Hook
 * Fetches sources (regulatory bodies, news sites, etc.)
 * 
 * @example
 * ```tsx
 * const { sources, isLoading } = useSources();
 * ```
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/api/client';
import { defaultSWRConfig } from './index';
import type { Source } from '@csv/types';

/**
 * Fetch all sources
 * 
 * @returns List of all sources with loading/error states
 */
export function useSources() {
    const { data, error, mutate, isLoading } = useSWR<{ data: Source[] }>(
        '/sources',
        fetcher,
        defaultSWRConfig
    );

    return {
        sources: data?.data ?? [],
        total: data?.data.length ?? 0,
        isLoading: isLoading || (!data && !error),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
        isEmpty: !isLoading && !error && (data?.data.length === 0),
    };
}

/**
 * Fetch a single source by ID
 * 
 * @param id - Source UUID
 * @returns Single source with loading/error states
 */
export function useSource(id: string | null) {
    const url = id ? `/sources/${id}` : null;

    const { data, error, mutate, isLoading } = useSWR<{ data: Source }>(
        url,
        fetcher,
        defaultSWRConfig
    );

    return {
        source: data?.data ?? null,
        isLoading: isLoading || (!data && !error && !!id),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
        notFound: error && 'status' in error && (error as { status: number }).status === 404,
    };
}

/**
 * Convenience hook: Filter sources by type
 * Client-side filtering (since API doesn't support type filter yet)
 * 
 * @param type - Source type to filter by
 * @returns Filtered sources
 */
export function useSourcesByType(type?: 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news') {
    const { sources, isLoading, error, refresh } = useSources();

    const filteredSources = type
        ? sources.filter(s => s.type === type)
        : sources;

    return {
        sources: filteredSources,
        total: filteredSources.length,
        isLoading,
        isError: !!error,
        error,
        refresh,
    };
}

/**
 * Convenience hook: Get only active sources
 * 
 * @returns Active sources only
 */
export function useActiveSources() {
    const { sources, isLoading, error, refresh } = useSources();

    const activeSources = sources.filter(s => s.active);

    return {
        sources: activeSources,
        total: activeSources.length,
        isLoading,
        isError: !!error,
        error,
        refresh,
    };
}
