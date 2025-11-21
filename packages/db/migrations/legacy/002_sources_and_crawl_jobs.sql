-- Sources table: tracks websites, regulators, exchanges to crawl
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('policy', 'exchange', 'gazette', 'ifi', 'portal', 'news')),
    country VARCHAR(10) NOT NULL,
    sector VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crawl jobs: tracks individual crawl runs
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    items_crawled INTEGER DEFAULT 0,
    items_new INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crawled documents: raw content from crawls
CREATE TABLE IF NOT EXISTS crawled_documents (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    crawl_job_id INTEGER REFERENCES crawl_jobs(id) ON DELETE SET NULL,
    title VARCHAR(512),
    url VARCHAR(512) NOT NULL,
    content TEXT,
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    extracted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(active);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source ON crawl_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crawled_documents_source ON crawled_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_crawled_documents_hash ON crawled_documents(content_hash);

-- NOTE: This is a legacy/migrated copy of the older SERIAL-based migration.
-- The project now uses UUID-based ids in `001_init_schema.sql`.
