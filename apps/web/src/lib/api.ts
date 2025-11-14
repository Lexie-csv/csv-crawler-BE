/**
 * API Client for CSV Crawler
 * Provides typed fetch wrappers for backend endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * Generic API fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// ===========================
// SOURCES API
// ===========================

export interface Source {
  id: string;
  name: string;
  url: string;
  type: 'policy' | 'regulatory' | 'news' | 'other';
  country: string;
  sector: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSourceInput {
  name: string;
  url: string;
  type: 'policy' | 'regulatory' | 'news' | 'other';
  country: string;
  sector?: string | null;
  active?: boolean;
}

export interface UpdateSourceInput extends Partial<CreateSourceInput> {}

export const sourcesApi = {
  list: () => apiFetch<Source[]>('/api/sources'),
  
  getById: (id: string) => apiFetch<Source>(`/api/sources/${id}`),
  
  create: (data: CreateSourceInput) =>
    apiFetch<Source>('/api/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: UpdateSourceInput) =>
    apiFetch<Source>(`/api/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiFetch<void>(`/api/sources/${id}`, {
      method: 'DELETE',
    }),
};

// ===========================
// CRAWL JOBS API
// ===========================

export interface CrawlJob {
  id: string;
  source_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  items_crawled: number;
  items_new: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCrawlJobInput {
  source_id: string;
  priority?: number;
}

export interface UpdateCrawlJobInput {
  status?: 'pending' | 'running' | 'done' | 'failed';
  started_at?: string | null;
  completed_at?: string | null;
  items_crawled?: number;
  items_new?: number;
  error_message?: string | null;
}

export const crawlApi = {
  listJobs: (params?: { status?: string; source_id?: string }) =>
    apiFetch<CrawlJob[]>('/api/crawl/jobs', { params }),
  
  getJob: (id: string) => apiFetch<CrawlJob>(`/api/crawl/jobs/${id}`),
  
  createJob: (data: CreateCrawlJobInput) =>
    apiFetch<CrawlJob>('/api/crawl/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateJob: (id: string, data: UpdateCrawlJobInput) =>
    apiFetch<CrawlJob>(`/api/crawl/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ===========================
// DOCUMENTS API
// ===========================

export interface Document {
  id: string;
  source_id: string;
  crawl_job_id: string;
  url: string;
  title: string | null;
  content_text: string | null;
  content_html: string | null;
  content_hash: string;
  published_at: string | null;
  extracted: boolean;
  created_at: string;
  updated_at: string;
}

export const documentsApi = {
  list: (params?: { source_id?: string; crawl_job_id?: string; extracted?: boolean }) =>
    apiFetch<Document[]>('/api/documents', { params }),
  
  getById: (id: string) => apiFetch<Document>(`/api/documents/${id}`),
};

// ===========================
// DATAPOINTS API
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
  metadata: Record<string, any> | null;
  created_at: string;
}

export const datapointsApi = {
  list: (params?: {
    source_id?: string;
    category?: string;
    subcategory?: string;
    start_date?: string;
    end_date?: string;
  }) => apiFetch<Datapoint[]>('/api/datapoints', { params }),
  
  getById: (id: string) => apiFetch<Datapoint>(`/api/datapoints/${id}`),
};

// ===========================
// HEALTH CHECK
// ===========================

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

export const healthApi = {
  check: () => apiFetch<HealthResponse>('/health'),
};
