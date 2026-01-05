-- Migration 015: Add prompt template selection to sources
-- Created at: 2025-12-16
-- Purpose: Allow sources to select from predefined prompt templates

-- Add prompt_template column
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS prompt_template VARCHAR(50);

-- Add constraint to ensure valid template names
ALTER TABLE sources
ADD CONSTRAINT valid_prompt_template
CHECK (prompt_template IS NULL OR prompt_template IN (
  'news_article',
  'government_regulation',
  'press_release',
  'energy_tender',
  'financial_report'
));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sources_prompt_template ON sources(prompt_template);

-- Add comment
COMMENT ON COLUMN sources.prompt_template IS 
'Template name from extraction-prompts.ts library. If null, uses default news_article template.';

-- Seed initial templates based on source type
UPDATE sources 
SET prompt_template = 'news_article'
WHERE source_type = 'news' AND prompt_template IS NULL;

UPDATE sources 
SET prompt_template = 'government_regulation'
WHERE source_type = 'government' AND prompt_template IS NULL;

UPDATE sources 
SET prompt_template = 'press_release'
WHERE url LIKE '%news%' OR url LIKE '%press%' AND prompt_template IS NULL;

-- Note: extraction_prompt column (from migration 010) takes precedence over prompt_template
-- If extraction_prompt is set, it will be used instead of the template
COMMENT ON COLUMN sources.extraction_prompt IS 
'Custom prompt text (overrides prompt_template). If null, uses prompt_template. If both null, uses default.';
