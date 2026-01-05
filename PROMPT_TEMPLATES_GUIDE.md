# Prompt Templates - Quick Reference Guide

## Overview

CSV Radar now supports **source-specific extraction prompts** via a template system. This allows you to customize how documents are extracted based on source type (news vs. government regulations vs. tenders, etc.).

## How It Works

**Priority System** (highest to lowest):
1. **Custom Prompt** (`extraction_prompt` column) - Full custom prompt text
2. **Template** (`prompt_template` column) - Reference to a predefined template
3. **Default** - Falls back to `news_article` template

## Available Templates

| Template | Best For | Key Features |
|----------|---------|--------------|
| `news_article` | News sites, blogs | Extracts: title, author, summary, tags, sentiment |
| `government_regulation` | BSP circulars, SEC advisories, DOE orders | Extracts: document number, effective date, compliance requirements |
| `press_release` | Official announcements | Extracts: organization, event dates, statistics |
| `energy_tender` | DOE tenders, RFPs, PSALM auctions | Extracts: capacity (MW), budget, deadlines, project type |
| `financial_report` | PSE disclosures, quarterly reports | Extracts: revenue, profit, growth %, fiscal periods |

## API Endpoints

### List All Templates
```bash
GET /api/v1/prompts

# Response:
{
  "success": true,
  "data": {
    "templates": [
      {
        "name": "news_article",
        "preview": "You are extracting structured data from a news article.",
        "length": 1234,
        "linesCount": 45
      },
      ...
    ]
  }
}
```

### Get Full Template Text
```bash
GET /api/v1/prompts/government_regulation

# Response:
{
  "success": true,
  "data": {
    "name": "government_regulation",
    "prompt": "You are extracting structured data from...",
    "length": 2456,
    "linesCount": 78
  }
}
```

### Update Source Template
```bash
PUT /api/v1/prompts/sources/{sourceId}
Content-Type: application/json

{
  "promptTemplate": "government_regulation"
}

# Response:
{
  "success": true,
  "data": { ... },
  "message": "Source 'BSP Circulars' updated to use template 'government_regulation'"
}
```

### Get Source Prompt Configuration
```bash
GET /api/v1/prompts/sources/{sourceId}

# Response:
{
  "success": true,
  "data": {
    "source": {
      "id": "uuid...",
      "name": "BusinessWorld",
      "type": "news"
    },
    "promptTemplate": "news_article",
    "hasCustomPrompt": false,
    "promptSource": "template:news_article",
    "effectivePrompt": {
      "preview": "You are extracting...\n...",
      "length": 1234
    }
  }
}
```

### Set Custom Prompt (Overrides Template)
```bash
POST /api/v1/prompts/sources/{sourceId}/custom
Content-Type: application/json

{
  "extractionPrompt": "Your custom prompt text here..."
}
```

### Remove Custom Prompt (Fall Back to Template)
```bash
DELETE /api/v1/prompts/sources/{sourceId}/custom
```

## Usage Examples

### Example 1: Assign Template to a New Source

```bash
# Get source ID
SOURCE_ID=$(docker exec csv-crawler-db psql -U postgres -d csv_crawler -t -c \
  "SELECT id FROM sources WHERE name = 'SEC Advisories' LIMIT 1;" | xargs)

# Assign government_regulation template
curl -X PUT http://localhost:3001/api/v1/prompts/sources/$SOURCE_ID \
  -H "Content-Type: application/json" \
  -d '{"promptTemplate": "government_regulation"}'
```

### Example 2: Check Which Template a Crawl Will Use

```bash
# Before running a crawl, check the effective prompt
curl -s http://localhost:3001/api/v1/prompts/sources/{sourceId} | \
  jq '.data.promptSource'

# Output: "template:news_article" or "custom" or "template:news_article (default)"
```

### Example 3: Bulk Assign Templates

```bash
# Run the seed script to auto-assign templates based on source type
cd "/Users/lexiepelaez/Desktop/csv-crawler BE"
pnpm tsx packages/db/src/seed-prompt-templates.ts

# Output:
# ✓ BusinessWorld Online → news_article
# ✓ BSP Circulars → government_regulation
# ✓ DOE Tenders → energy_tender
# ...
```

## Database Schema

```sql
-- Sources table structure
CREATE TABLE sources (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  prompt_template VARCHAR(50), -- 'news_article' | 'government_regulation' | etc.
  extraction_prompt TEXT,      -- Custom prompt (overrides template)
  ...
);

-- Constraint ensures valid template names
ALTER TABLE sources
ADD CONSTRAINT valid_prompt_template
CHECK (prompt_template IS NULL OR prompt_template IN (
  'news_article',
  'government_regulation',
  'press_release',
  'energy_tender',
  'financial_report'
));
```

## Current Assignments

As of December 16, 2025:

| Source | Template |
|--------|----------|
| BusinessWorld Online | `news_article` |
| Power Philippines | `news_article` |
| BSP Circulars | `government_regulation` |
| DOE-circulars-test | `government_regulation` |
| DOE-legacy-ERC | `government_regulation` |
| DOE Laws & Issuances | (has custom prompt, template set as fallback) |

## How It Works in Code

```typescript
// In digest-orchestration.service.ts

// 1. Fetch source with prompt config
const source = await queryOne(
  'SELECT name, type, prompt_template, extraction_prompt FROM sources WHERE id = $1',
  [sourceId]
);

// 2. Determine effective prompt (priority: custom > template > default)
let effectivePrompt: string;

if (source.extraction_prompt) {
  effectivePrompt = source.extraction_prompt; // Custom prompt wins
} else if (source.prompt_template && isValidTemplate(source.prompt_template)) {
  effectivePrompt = getPromptByTemplate(source.prompt_template); // Use template
} else {
  effectivePrompt = getPromptByTemplate('news_article'); // Default fallback
}

// 3. Use in extraction
const extraction = await llmExtractor.extractEventsAndDatapoints(doc, effectivePrompt);
```

## Adding New Templates

1. **Edit** `apps/api/src/prompts/extraction-prompts.ts`
2. **Add** new template to `EXTRACTION_PROMPTS` object
3. **Update** `PromptTemplate` type in `packages/types/src/index.ts`
4. **Update** database constraint in migration
5. **Test** with a sample document

## Testing

```bash
# 1. Start servers
pnpm dev

# 2. Test template API
curl http://localhost:3001/api/v1/prompts

# 3. Assign template to a source
curl -X PUT http://localhost:3001/api/v1/prompts/sources/{sourceId} \
  -H "Content-Type: application/json" \
  -d '{"promptTemplate": "government_regulation"}'

# 4. Run a test crawl and check logs for prompt selection
# Look for: "[DigestOrchestration] Using prompt template: government_regulation"
```

## Best Practices

1. ✅ **Match template to content type** - Use `government_regulation` for BSP/SEC, `news_article` for news sites
2. ✅ **Test before production** - Try templates on a few documents first
3. ✅ **Use custom prompts sparingly** - Templates are easier to maintain than per-source custom prompts
4. ✅ **Monitor extraction quality** - Check confidence scores and validate datapoint extraction
5. ✅ **Update templates** - As you find better prompts, update the template library (benefits all sources)

## Troubleshooting

**Problem**: "Invalid prompt template 'xyz'"
- **Solution**: Check available templates with `GET /api/v1/prompts`

**Problem**: Custom prompt not being used
- **Solution**: Verify with `GET /api/v1/prompts/sources/{id}` - look at `promptSource` field

**Problem**: Poor extraction quality
- **Solution**: Try a different template or create a custom prompt for that specific source

---

**Created**: December 16, 2025  
**Last Updated**: December 16, 2025  
**Status**: ✅ Fully implemented and tested
