-- Migration 014: Digest Highlights Table
-- Create normalized table for digest highlights to enable better querying and filtering

-- Create digest_highlights table
CREATE TABLE IF NOT EXISTS digest_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digest_id UUID NOT NULL REFERENCES crawl_digests(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type VARCHAR(50), -- 'event', 'circular', 'ppa', 'news', 'policy', etc.
    source_url TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Link back to source document if available
    category VARCHAR(100), -- 'Policy', 'Regulatory', 'Market', etc.
    importance VARCHAR(20), -- 'high', 'medium', 'low'
    metadata JSONB DEFAULT '{}', -- Additional structured data
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_digest_highlights_digest ON digest_highlights(digest_id);
CREATE INDEX IF NOT EXISTS idx_digest_highlights_type ON digest_highlights(type);
CREATE INDEX IF NOT EXISTS idx_digest_highlights_category ON digest_highlights(category);
CREATE INDEX IF NOT EXISTS idx_digest_highlights_document ON digest_highlights(document_id);
CREATE INDEX IF NOT EXISTS idx_digest_highlights_created ON digest_highlights(created_at DESC);

-- Full-text search index on highlight text
CREATE INDEX IF NOT EXISTS idx_digest_highlights_text_search ON digest_highlights USING GIN (to_tsvector('english', text));

-- Comments
COMMENT ON TABLE digest_highlights IS 'Normalized storage for digest highlights, extracted from LLM-generated summaries';
COMMENT ON COLUMN digest_highlights.text IS 'The highlight text content';
COMMENT ON COLUMN digest_highlights.type IS 'Highlight type: event, circular, ppa, news, policy, etc.';
COMMENT ON COLUMN digest_highlights.source_url IS 'Original URL of the highlighted content';
COMMENT ON COLUMN digest_highlights.document_id IS 'FK to documents table if highlight maps to a specific document';
COMMENT ON COLUMN digest_highlights.category IS 'Content category: Policy, Regulatory, Market, Corporate, etc.';
COMMENT ON COLUMN digest_highlights.importance IS 'Importance level: high, medium, low';
COMMENT ON COLUMN digest_highlights.metadata IS 'Additional structured data (dates, entities, tags, etc.)';

-- Create digest_datapoints table (similar normalization for datapoints)
CREATE TABLE IF NOT EXISTS digest_datapoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digest_id UUID NOT NULL REFERENCES crawl_digests(id) ON DELETE CASCADE,
    field VARCHAR(255) NOT NULL, -- 'price', 'volume', 'capacity', 'date', etc.
    value TEXT NOT NULL,
    unit VARCHAR(50), -- 'MW', 'PHP', 'USD', '%', etc.
    context TEXT, -- Additional context about this datapoint
    source_url TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    effective_date TIMESTAMP, -- When this datapoint becomes effective
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for datapoints
CREATE INDEX IF NOT EXISTS idx_digest_datapoints_digest ON digest_datapoints(digest_id);
CREATE INDEX IF NOT EXISTS idx_digest_datapoints_field ON digest_datapoints(field);
CREATE INDEX IF NOT EXISTS idx_digest_datapoints_document ON digest_datapoints(document_id);
CREATE INDEX IF NOT EXISTS idx_digest_datapoints_effective_date ON digest_datapoints(effective_date);
CREATE INDEX IF NOT EXISTS idx_digest_datapoints_created ON digest_datapoints(created_at DESC);

-- Comments
COMMENT ON TABLE digest_datapoints IS 'Normalized storage for digest datapoints (structured data extracted from documents)';
COMMENT ON COLUMN digest_datapoints.field IS 'Field name: price, volume, capacity, effectiveDate, etc.';
COMMENT ON COLUMN digest_datapoints.value IS 'The datapoint value (may be numeric, text, or date)';
COMMENT ON COLUMN digest_datapoints.unit IS 'Unit of measurement: MW, PHP, USD, %, etc.';
COMMENT ON COLUMN digest_datapoints.context IS 'Additional context explaining this datapoint';
COMMENT ON COLUMN digest_datapoints.effective_date IS 'When this datapoint becomes effective (for future events)';

-- Add counts to crawl_digests for denormalization (performance)
ALTER TABLE crawl_digests
ADD COLUMN IF NOT EXISTS highlights_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS datapoints_count INTEGER DEFAULT 0;

COMMENT ON COLUMN crawl_digests.highlights_count IS 'Denormalized count of highlights (for performance)';
COMMENT ON COLUMN crawl_digests.datapoints_count IS 'Denormalized count of datapoints (for performance)';

-- Note: The existing highlights/datapoints JSONB columns will remain for backward compatibility
-- New code should populate both JSONB (legacy) and normalized tables (new)
-- Future migration can remove JSONB columns once all code is migrated

