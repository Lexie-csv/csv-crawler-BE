-- Migration 007: Add categorization fields to datapoints table
-- Created at: 2025-11-17
-- Reason: Support structured extraction with category, subcategory, and metadata

-- Add source_id for direct source relationship
ALTER TABLE datapoints
ADD COLUMN source_id UUID REFERENCES sources(id) ON DELETE CASCADE;

-- Add category and subcategory for classification
ALTER TABLE datapoints
ADD COLUMN category VARCHAR(100),
ADD COLUMN subcategory VARCHAR(100);

-- Add metadata JSONB column for flexible data storage
ALTER TABLE datapoints
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_datapoints_source_id ON datapoints(source_id);
CREATE INDEX IF NOT EXISTS idx_datapoints_category ON datapoints(category);
CREATE INDEX IF NOT EXISTS idx_datapoints_effective_date ON datapoints(effective_date);

-- Rename 'source' column to 'source_reference' to avoid confusion with source_id
ALTER TABLE datapoints
RENAME COLUMN source TO source_reference;

-- Update existing rows to have source_id from their document
UPDATE datapoints dp
SET source_id = d.source_id
FROM documents d
WHERE dp.document_id = d.id;
