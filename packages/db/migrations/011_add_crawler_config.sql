-- Migration 011: Add crawler_config column for per-source crawl settings
-- Created at: 2025-12-05

ALTER TABLE sources
ADD COLUMN IF NOT EXISTS crawler_config JSONB DEFAULT NULL;

COMMENT ON COLUMN sources.crawler_config IS 
'Optional crawler configuration overrides for this source. If null, uses global defaults.
Example: {"maxDepth": 4, "maxPages": 100, "skipCategoryPages": true}';

-- Update news sources with optimized config
UPDATE sources
SET crawler_config = '{
  "maxDepth": 4,
  "maxPages": 100,
  "skipCategoryPages": true,
  "articleIndicators": ["article", ".post-content", ".entry-content", "time", ".byline"]
}'::jsonb
WHERE type = 'news';

-- DOE sources keep default config (null = use global defaults)
-- No action needed for DOE sources
