/**
 * API Client for CSV Crawler
 * Provides typed fetch wrappers for backend endpoints
 * 
 * All types imported from @csv/types for consistency
 */

import { apiClient } from './api/client';
import type {
    Source,
    CrawlJob,
    CrawlDigest,
    Document,
    DigestHighlight,
    DigestDatapoint,
    CreateSourceInput,
    UpdateSourceInput,
    CreateCrawlJobInput,
    UpdateCrawlJobInput,
    DocumentsListParams,
    DigestsListParams,
    ApiResponse,
    PaginatedResponse,
    DocumentsListResponse,
    DigestsListResponse,
} from '@csv/types';

// Re-export all shared types for backwards compatibility
export type {
    Source,
    CrawlJob,
    CrawlDigest,
    Document,
    DigestHighlight,
    DigestDatapoint,
    CreateSourceInput,
    UpdateSourceInput,
    CreateCrawlJobInput,
    UpdateCrawlJobInput,
    DocumentsListParams,
    DigestsListParams,
    ApiResponse,
    PaginatedResponse,
    DocumentsListResponse,
    DigestsListResponse,
};

// ===========================
// SOURCES API
// ===========================

export const sourcesApi = {
    list: async (): Promise<Source[]> => {
        const response = await apiClient.get<{ data: Source[] }>('/sources');
        return response.data.data;
    },

    getById: async (id: string): Promise<Source> => {
        const response = await apiClient.get<{ data: Source }>(`/sources/${id}`);
        return response.data.data;
    },

    create: async (data: CreateSourceInput): Promise<Source> => {
        const response = await apiClient.post<{ data: Source }>('/sources', data);
        return response.data.data;
    },

    update: async (id: string, data: UpdateSourceInput): Promise<Source> => {
        const response = await apiClient.put<{ data: Source }>(`/sources/${id}`, data);
        return response.data.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/sources/${id}`);
    },
};

// ===========================
// CRAWL JOBS API
// ===========================

export const crawlApi = {
    listJobs: async (params?: { status?: string; source_id?: string }): Promise<CrawlJob[]> => {
        const response = await apiClient.get<{ data: CrawlJob[] }>('/crawl/jobs', { params });
        return response.data.data;
    },

    getJob: async (id: string): Promise<CrawlJob> => {
        const response = await apiClient.get<{ data: CrawlJob }>(`/crawl/jobs/${id}`);
        return response.data.data;
    },

    createJob: async (data: CreateCrawlJobInput): Promise<CrawlJob> => {
        const response = await apiClient.post<{ data: CrawlJob }>('/crawl/start', data);
        return response.data.data;
    },

    updateJob: async (id: string, data: UpdateCrawlJobInput): Promise<CrawlJob> => {
        const response = await apiClient.put<{ data: CrawlJob }>(`/crawl/jobs/${id}`, data);
        return response.data.data;
    },

    getDigest: async (jobId: string): Promise<CrawlDigest> => {
        const response = await apiClient.get<{ data: CrawlDigest }>(`/crawl/${jobId}/digest`);
        return response.data.data;
    },
};

// ===========================
// DIGESTS API
// ===========================

export const digestsApi = {
    list: async (params?: DigestsListParams): Promise<DigestsListResponse> => {
        const response = await apiClient.get<DigestsListResponse>('/digests', { params });
        return response.data;
    },

    getById: async (id: string): Promise<CrawlDigest> => {
        const response = await apiClient.get<{ data: CrawlDigest }>(`/digests/${id}`);
        return response.data.data;
    },
};

// ===========================
// DOCUMENTS API
// ===========================

export const documentsApi = {
    list: async (params?: DocumentsListParams): Promise<DocumentsListResponse> => {
        const response = await apiClient.get<DocumentsListResponse>('/documents', { params });
        return response.data;
    },

    getById: async (id: string): Promise<Document> => {
        const response = await apiClient.get<{ data: Document }>(`/documents/${id}`);
        return response.data.data;
    },
};

// ===========================
// DATAPOINTS API (LEGACY - TODO: Migrate)
// ===========================

export interface Datapoint {
    id: string;
    document_id: string;
    source_id: string;
    category: string;
    subcategory: string | null;
    title: string;
    value: string | null;
    date_value: string | null;
    url: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export const datapointsApi = {
    list: async (params?: {
        source_id?: string;
        category?: string;
        subcategory?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<Datapoint[]> => {
        const response = await apiClient.get<{ data: Datapoint[] }>('/datapoints', { params });
        return response.data.data;
    },

    getById: async (id: string): Promise<Datapoint> => {
        const response = await apiClient.get<{ data: Datapoint }>(`/datapoints/${id}`);
        return response.data.data;
    },
};

// ===========================
// HEALTH CHECK (LEGACY)
// ===========================

export interface HealthResponse {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
}

export const healthApi = {
    check: async (): Promise<HealthResponse> => {
        const response = await apiClient.get<HealthResponse>('/health');
        return response.data;
    },
};
