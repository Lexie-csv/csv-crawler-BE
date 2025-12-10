-- Migration 013: Add alert classification to documents
-- Created at: 2025-12-09

-- Add is_alert column to track policy documents requiring attention
ALTER TABLE documents
ADD COLUMN is_alert BOOLEAN DEFAULT FALSE;

-- Add index for faster alert queries
CREATE INDEX idx_documents_is_alert ON documents(is_alert) WHERE is_alert = TRUE;

-- Add index for combined alert + date queries (for dashboard)
CREATE INDEX idx_documents_alert_date ON documents(is_alert, created_at DESC);

COMMENT ON COLUMN documents.is_alert IS 
'TRUE for DOE policy documents (circulars, issuances). FALSE for news articles. Alerts are policy updates requiring attention.';

-- Update existing DOE policy documents to be alerts
UPDATE documents d
SET is_alert = TRUE
FROM sources s
WHERE d.source_id = s.id
  AND s.type = 'policy'
  AND s.name IN ('DOE – Circulars & Issuances', 'DOE Legacy');

-- Update existing news articles to NOT be alerts
UPDATE documents d
SET is_alert = FALSE
FROM sources s
WHERE d.source_id = s.id
  AND s.type = 'news';
