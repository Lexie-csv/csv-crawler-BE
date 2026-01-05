/**
 * API Client Configuration
 * Centralized HTTP client with error handling and interceptors
 */

import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { logApiError } from '@/lib/logger';

// API base URL - uses Next.js proxy in development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Axios instance with default configuration
 */
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Response interceptor - extract data and handle errors
 */
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        // For successful responses, return the data directly
        return response;
    },
    (error: AxiosError) => {
        // Handle different error scenarios
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const errorData = error.response.data as { error?: string; message?: string };

            logApiError(error, {
                endpoint: error.config?.url || 'unknown',
                method: error.config?.method?.toUpperCase() || 'GET',
                status: status.toString(),
            });

            // You can add toast notifications here if needed
            // toast.error(errorData.error || errorData.message || 'An error occurred');

            return Promise.reject({
                status,
                message: errorData.error || errorData.message || 'Server error',
                data: errorData,
            });
        } else if (error.request) {
            // Request made but no response received
            logApiError(new Error('No response from server'), {
                endpoint: error.config?.url || 'unknown',
                method: error.config?.method?.toUpperCase() || 'GET',
            });
            return Promise.reject({
                status: 0,
                message: 'Network error - server did not respond',
                data: null,
            });
        } else {
            // Error in request configuration
            logApiError(error, {
                endpoint: 'request-setup',
                method: 'unknown',
            });
            return Promise.reject({
                status: -1,
                message: error.message || 'Request configuration error',
                data: null,
            });
        }
    }
);

/**
 * SWR Fetcher function
 * Used by all SWR hooks to fetch data
 */
export async function fetcher<T>(url: string): Promise<T> {
    const response = await apiClient.get<T>(url);
    return response.data;
}

/**
 * SWR Fetcher with query params
 */
export async function fetcherWithParams<T>(
    url: string,
    params?: Record<string, string | number | boolean>
): Promise<T> {
    const response = await apiClient.get<T>(url, { params });
    return response.data;
}

/**
 * Generic GET request
 */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await apiClient.get<T>(url, { params });
    return response.data;
}

/**
 * Generic POST request
 */
export async function post<T>(url: string, data?: unknown): Promise<T> {
    const response = await apiClient.post<T>(url, data);
    return response.data;
}

/**
 * Generic PUT request
 */
export async function put<T>(url: string, data?: unknown): Promise<T> {
    const response = await apiClient.put<T>(url, data);
    return response.data;
}

/**
 * Generic DELETE request
 */
export async function del<T>(url: string): Promise<T> {
    const response = await apiClient.delete<T>(url);
    return response.data;
}
