-- Migration 009: Document Change Detection and Versioning
-- Track document versions, changes, and historical snapshots

-- Create document_versions table to store all versions of documents
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    
    -- Document identification
    document_url VARCHAR(2000) NOT NULL,
    document_title VARCHAR(1000) NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'pdf', -- pdf, html_page, html_table, etc.
    
    -- Version tracking
    version_number INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT true,
    
    -- Content hashing for change detection
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of main content
    metadata_hash VARCHAR(64), -- SHA-256 hash of metadata (title, date, issuing_body)
    
    -- Document metadata
    category VARCHAR(100),
    issuing_body VARCHAR(500),
    effective_date DATE,
    published_date DATE,
    
    -- Content
    summary TEXT,
    topics JSONB DEFAULT '[]',
    key_numbers JSONB DEFAULT '[]',
    
    -- File information
    file_path VARCHAR(1000),
    file_size_bytes BIGINT,
    
    -- Change tracking
    change_type VARCHAR(50), -- 'new', 'content_updated', 'metadata_updated', 'removed'
    changes_detected JSONB DEFAULT '{}', -- JSON describing what changed
    
    -- Full document data
    full_data JSONB, -- Complete LLM extraction result
    
    -- Timestamps
    first_seen_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure unique version per document
    UNIQUE (source_id, document_url, version_number)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_document_versions_source ON document_versions(source_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_url ON document_versions(document_url);
CREATE INDEX IF NOT EXISTS idx_document_versions_current ON document_versions(source_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_document_versions_hash ON document_versions(content_hash);
CREATE INDEX IF NOT EXISTS idx_document_versions_created ON document_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_first_seen ON document_versions(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_change_type ON document_versions(change_type);

-- Create document_changes table for change history
CREATE TABLE IF NOT EXISTS document_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    document_url VARCHAR(2000) NOT NULL,
    
    -- Version references
    old_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
    new_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    
    -- Change summary
    change_type VARCHAR(50) NOT NULL, -- 'new', 'content_updated', 'metadata_updated', 'title_changed', 'date_changed', 'removed'
    change_summary TEXT,
    
    -- Detailed changes
    changes_detected JSONB DEFAULT '{}', -- { field: { old: 'value', new: 'value' } }
    
    -- Importance scoring
    significance_score FLOAT, -- 0.0 to 1.0, how important is this change
    requires_review BOOLEAN DEFAULT false,
    
    -- Timestamps
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMP,
    
    -- Metadata
    crawl_job_id UUID REFERENCES crawl_jobs(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_document_changes_source ON document_changes(source_id);
CREATE INDEX IF NOT EXISTS idx_document_changes_url ON document_changes(document_url);
CREATE INDEX IF NOT EXISTS idx_document_changes_detected ON document_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_changes_type ON document_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_document_changes_significance ON document_changes(significance_score DESC) WHERE significance_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_changes_review ON document_changes(requires_review) WHERE requires_review = true;

-- Create view for current document versions
CREATE OR REPLACE VIEW current_documents AS
SELECT 
    dv.*,
    s.name as source_name,
    s.url as source_url,
    (SELECT COUNT(*) FROM document_versions dv2 
     WHERE dv2.source_id = dv.source_id 
     AND dv2.document_url = dv.document_url) as total_versions,
    (SELECT MAX(dc.detected_at) FROM document_changes dc
     WHERE dc.document_url = dv.document_url) as last_change_at
FROM document_versions dv
JOIN sources s ON s.id = dv.source_id
WHERE dv.is_current = true;

-- Create view for recent changes
CREATE OR REPLACE VIEW recent_document_changes AS
SELECT 
    dc.*,
    s.name as source_name,
    dv_new.document_title as document_title,
    dv_new.category as document_category,
    dv_old.version_number as old_version_number,
    dv_new.version_number as new_version_number
FROM document_changes dc
JOIN sources s ON s.id = dc.source_id
JOIN document_versions dv_new ON dv_new.id = dc.new_version_id
LEFT JOIN document_versions dv_old ON dv_old.id = dc.old_version_id
ORDER BY dc.detected_at DESC;

COMMENT ON TABLE document_versions IS 'Stores all versions of crawled documents for change tracking';
COMMENT ON TABLE document_changes IS 'Records detected changes between document versions';
COMMENT ON VIEW current_documents IS 'Current version of all documents with metadata';
COMMENT ON VIEW recent_document_changes IS 'Recent document changes with full context';

COMMENT ON COLUMN document_versions.content_hash IS 'SHA-256 hash of document content for change detection';
COMMENT ON COLUMN document_versions.metadata_hash IS 'SHA-256 hash of key metadata fields';
COMMENT ON COLUMN document_versions.is_current IS 'True if this is the most recent version';
COMMENT ON COLUMN document_versions.change_type IS 'Type of change that created this version';
COMMENT ON COLUMN document_changes.significance_score IS 'Importance score 0.0-1.0 for prioritizing changes';
COMMENT ON COLUMN document_changes.requires_review IS 'Flag for changes that need human review';
