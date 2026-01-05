/**
 * Data Fetching Layer
 * Central hub for all SWR-based data hooks
 * 
 * This module provides:
 * - SWR configuration
 * - Base hook utilities
 * - Error handling helpers
 * - Type-safe data fetching
 */

import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import { fetcher } from '@/lib/api/client';
import type { DataHookResult, ListDataHookResult } from '@csv/types';

// ============================================
// SWR GLOBAL CONFIGURATION
// ============================================

/**
 * Default SWR options for all hooks
 * Can be overridden per-hook if needed
 * 
 * Configuration optimized for:
 * - Data dashboard with frequent updates
 * - Progressive pagination (Load More pattern)
 * - Reliable error handling
 * - Smart caching to reduce API calls
 */
export const defaultSWRConfig: SWRConfiguration = {
    // Revalidation Strategy
    revalidateOnFocus: false,           // Don't refetch on window focus (avoid interrupting user)
    revalidateOnReconnect: true,        // Refetch when network reconnects (sync after offline)
    revalidateOnMount: true,            // Always fetch fresh data on mount (ensure data is current)
    revalidateIfStale: true,            // Auto-refresh if data is stale (balance freshness vs. performance)

    // Caching & Deduplication
    dedupingInterval: 10000,            // Dedupe requests within 10s (increased from 5s for pagination)
    focusThrottleInterval: 5000,        // Throttle focus revalidation to every 5s

    // Error Handling
    errorRetryCount: 3,                 // Retry failed requests 3 times
    errorRetryInterval: 2000,           // Wait 2s between retries (exponential backoff)
    shouldRetryOnError: true,           // Retry on error (network resilience)

    // Stale-While-Revalidate
    keepPreviousData: false,            // Don't keep previous data while revalidating (clearer loading states)

    // Performance
    suspense: false,                    // Don't use Suspense (we handle loading states manually)
    loadingTimeout: 3000,               // Show error after 3s timeout
};

/**
 * Specialized SWR config for paginated lists
 * Keeps previous data while loading next page for smoother UX
 * 
 * Use this for hooks with progressive "Load More" patterns:
 * - useDocuments (with limit parameter)
 * - useDigests (with page parameter)
 */
export const paginationSWRConfig: SWRConfiguration = {
    ...defaultSWRConfig,
    keepPreviousData: true,             // Keep showing old data while loading more (smoother UX)
    revalidateOnMount: false,           // Don't auto-refresh on mount (preserve pagination state)
    dedupingInterval: 20000,            // Longer deduping for paginated data (20s)
};

// ============================================
// BASE HOOK UTILITIES
// ============================================

/**
 * Transform SWR response into our standard DataHookResult format
 * 
 * @param response - SWR response object
 * @returns Standardized data hook result
 */
export function useDataHook<T>(
    response: SWRResponse<T, Error>
): DataHookResult<T> {
    const { data, error, mutate, isLoading } = response;

    return {
        data: data ?? null,
        isLoading: isLoading || (!data && !error),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
    };
}

/**
 * Transform SWR response for list/array data
 * Ensures data is always an array (never null)
 * 
 * @param response - SWR response object
 * @returns Standardized list data hook result
 */
export function useListDataHook<T>(
    response: SWRResponse<readonly T[], Error>
): ListDataHookResult<T> {
    const { data, error, mutate, isLoading } = response;

    return {
        data: (data ?? []) as readonly T[],
        isLoading: isLoading || (!data && !error),
        isError: !!error,
        error: error ?? null,
        refresh: () => mutate(),
    };
}

// ============================================
// ERROR HANDLING HELPERS
// ============================================

/**
 * Format API error for display
 */
export function formatApiError(error: Error | null): string {
    if (!error) return 'An unknown error occurred';

    // Check if it's our custom API error format
    if ('status' in error && 'message' in error) {
        const apiError = error as { status: number; message: string };
        return `${apiError.message} (${apiError.status})`;
    }

    return error.message || 'An unknown error occurred';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: Error | null): boolean {
    if (!error) return false;
    return (
        error.message.includes('Network') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        ('status' in error && (error as { status: number }).status === 0)
    );
}

/**
 * Check if error is a 404 Not Found
 */
export function isNotFoundError(error: Error | null): boolean {
    if (!error) return false;
    return 'status' in error && (error as { status: number }).status === 404;
}

/**
 * Check if error is a 401/403 Auth error
 */
export function isAuthError(error: Error | null): boolean {
    if (!error) return false;
    const status = 'status' in error ? (error as { status: number }).status : 0;
    return status === 401 || status === 403;
}

// ============================================
// URL BUILDING HELPERS
// ============================================

/**
 * Build query string from params object
 * Filters out undefined/null values
 */
export function buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });

    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

/**
 * Build full API URL with query params
 */
export function buildApiUrl(endpoint: string, params?: Record<string, unknown>): string {
    return `${endpoint}${buildQueryString(params)}`;
}

// ============================================
// RE-EXPORT COMMON UTILITIES
// ============================================

export { useSWR, fetcher };
export type { SWRConfiguration, SWRResponse };

// ============================================
// RE-EXPORT DATA HOOKS
// ============================================

export * from './useDocuments';
export * from './useDigests';
export * from './useSources';
export * from './useDashboardStats';
