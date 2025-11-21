-- Migration 004: Add type column to sources table
-- Created at: 2025-11-14

-- Add type column to sources table
ALTER TABLE sources 
ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'policy';

-- Add check constraint for valid types
ALTER TABLE sources
ADD CONSTRAINT sources_type_check 
CHECK (type IN ('policy', 'exchange', 'gazette', 'ifi', 'portal', 'news'));

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);

-- Update existing rows to have the default type
UPDATE sources SET type = 'policy' WHERE type IS NULL;
