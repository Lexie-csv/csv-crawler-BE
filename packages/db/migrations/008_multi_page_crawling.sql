-- Migration 008: Multi-Page Crawling Support
-- Extend crawl_jobs for pagination tracking and add crawl_digests

-- Extend crawl_jobs with pagination metrics
ALTER TABLE crawl_jobs
ADD COLUMN IF NOT EXISTS pages_crawled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pages_new INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pages_failed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pages_skipped INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_depth INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_pages INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS crawl_config JSONB DEFAULT '{}';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source_status ON crawl_jobs(source_id, status);

-- Create crawl_digests table for LLM-generated summaries
CREATE TABLE IF NOT EXISTS crawl_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    summary_markdown TEXT,
    summary_markdown_path VARCHAR(500),
    highlights JSONB DEFAULT '[]',
    datapoints JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_digests_job ON crawl_digests(crawl_job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_digests_source ON crawl_digests(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_digests_period ON crawl_digests(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_crawl_digests_created ON crawl_digests(created_at DESC);

-- Add crawl_config to sources for per-source crawl settings
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS crawl_config JSONB DEFAULT '{}';

COMMENT ON COLUMN crawl_jobs.pages_crawled IS 'Total number of pages crawled in this job';
COMMENT ON COLUMN crawl_jobs.pages_new IS 'Number of new pages discovered (not duplicates)';
COMMENT ON COLUMN crawl_jobs.pages_failed IS 'Number of pages that failed to crawl';
COMMENT ON COLUMN crawl_jobs.pages_skipped IS 'Number of pages skipped (robots.txt, out of scope, etc.)';
COMMENT ON COLUMN crawl_jobs.max_depth IS 'Maximum link depth for this crawl';
COMMENT ON COLUMN crawl_jobs.max_pages IS 'Maximum total pages to crawl';
COMMENT ON COLUMN crawl_jobs.crawl_config IS 'Runtime configuration for this crawl job';

COMMENT ON TABLE crawl_digests IS 'LLM-generated digests summarizing crawl results';
COMMENT ON COLUMN crawl_digests.highlights IS 'Array of DigestHighlight objects (events, circulars, PPAs)';
COMMENT ON COLUMN crawl_digests.datapoints IS 'Array of DigestDatapoint objects (structured data extracted)';
COMMENT ON COLUMN crawl_digests.summary_markdown_path IS 'File path to the full Markdown digest document';
