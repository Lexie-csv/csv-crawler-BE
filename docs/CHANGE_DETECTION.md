# Document Change Detection & Versioning System

## Overview

The CSV crawler now includes comprehensive change detection and versioning capabilities to track document updates over time. This system automatically detects when documents are added, modified, or removed, and maintains a complete version history.

## Architecture

### Database Schema

**Three new tables:**

1. **`document_versions`** - Stores all versions of each document
   - Content hashing (SHA-256) for change detection
   - Metadata hashing for tracking title/date/issuing body changes
   - Full document data preservation
   - Version numbering (1, 2, 3...)
   - Current version flagging

2. **`document_changes`** - Records detected changes
   - Links old and new versions
   - Categorizes change types
   - Calculates significance scores
   - Flags changes requiring review

3. **Views:**
   - `current_documents` - Latest version of all documents
   - `recent_document_changes` - Recent changes with context

### Change Detection Service

**`DocumentChangeDetector` class** (`apps/api/src/services/document-change-detector.ts`)

Key features:
- **Content hashing**: SHA-256 hash of summary, topics, and key numbers
- **Metadata hashing**: Hash of title, issuing body, dates, category
- **Change comparison**: Detects specific field changes
- **Significance scoring**: 0.0-1.0 scale based on change importance
- **Automatic versioning**: Increments version numbers automatically

## Change Types

The system detects six types of changes:

1. **`new`** - First time seeing a document
2. **`content_updated`** - Summary, topics, or key numbers changed
3. **`metadata_updated`** - Category, issuing body, or other metadata changed
4. **`title_changed`** - Document title changed
5. **`date_changed`** - Effective or published date changed
6. **`no_change`** - Document exists but hasn't changed

## Significance Scoring

Changes are scored based on importance (0.0 to 1.0):

- **Content change**: +0.4 (most important)
- **Title change**: +0.3
- **Date change**: +0.2
- **Summary change**: +0.2
- **Issuing body change**: +0.15
- **Category change**: +0.1

**Scores ≥ 0.7** are flagged for human review (`requires_review = true`)

## CLI Commands

### View Recent Changes

```bash
# View last 20 changes for a source
pnpm crawl-pdf changes -s DOE-circulars

# View only changes requiring review
pnpm crawl-pdf changes -s DOE-circulars --review

# View last 50 changes
pnpm crawl-pdf changes -s DOE-circulars --limit 50
```

**Example output:**
```
[1] CONTENT_UPDATED ⚠️  REVIEW
    Title: Guidelines for Green Energy Auction Program
    URL: https://legacy.doe.gov.ph/...
    Detected: 11/21/2025, 2:30:45 PM
    Significance: 85%
    Summary: Updated: content, summary
    Version: 1 → 2
```

### View Version History

```bash
# View all versions of a specific document
pnpm crawl-pdf versions -s DOE-circulars -u "https://legacy.doe.gov.ph/dc-2025-01"
```

**Example output:**
```
VERSION HISTORY
================================================================================

Document: Green Energy Auction Guidelines
URL: https://legacy.doe.gov.ph/dc-2025-01
Total versions: 3

Version 3 (CURRENT)
  First seen: 11/21/2025, 2:30:00 PM
  Last seen: 11/21/2025, 2:30:00 PM
  Change type: content_updated
  Content hash: a1b2c3d4e5f6...
  Changes: {"content":{"changed":true},"summary":{"changed":true,"length_diff":150}}

Version 2
  First seen: 11/15/2025, 10:15:00 AM
  Last seen: 11/20/2025, 11:45:00 PM
  Change type: metadata_updated
  Content hash: f6e5d4c3b2a1...
  Changes: {"effective_date":{"old":"2025-01-01","new":"2025-02-01"}}

Version 1
  First seen: 11/10/2025, 9:00:00 AM
  Last seen: 11/14/2025, 11:59:59 PM
  Change type: new
  Content hash: 123456789abc...
```

## Integration with Crawler

The change detection system integrates with the existing crawler workflow:

### Automatic Change Detection (Planned)

After each crawl, the system will:

1. **Compare documents** - Hash content and metadata
2. **Detect changes** - Identify what changed
3. **Save versions** - Store new version if changed
4. **Record changes** - Log change details
5. **Calculate significance** - Score importance
6. **Flag for review** - Mark high-impact changes

### Example Integration Code

```typescript
import { DocumentChangeDetector } from './services/document-change-detector';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const detector = new DocumentChangeDetector(pool);

// After extracting a document
const result = await detector.processDocument(
    sourceId,
    extractedDocument,
    crawlJobId
);

if (result.isNew) {
    console.log(`✨ New document: ${extractedDocument.title}`);
} else if (result.hasChanged) {
    console.log(`🔄 Updated: ${extractedDocument.title} (version ${result.versionId})`);
}
```

## Use Cases

### 1. Monitor Regulatory Changes
Track when policies are updated, effective dates change, or new regulations are issued.

### 2. Generate Change Alerts
Automatically notify stakeholders when high-significance changes are detected.

### 3. Compliance Tracking
Maintain audit trails showing when and how documents changed.

### 4. Research & Analysis
Compare different versions of policies to understand regulatory evolution.

### 5. Quality Assurance
Review high-significance changes before including in digests or reports.

## Database Queries

### Get documents changed in last 7 days
```sql
SELECT * FROM recent_document_changes
WHERE detected_at > NOW() - INTERVAL '7 days'
ORDER BY significance_score DESC;
```

### Get all versions of a document
```sql
SELECT * FROM document_versions
WHERE source_id = $1 AND document_url = $2
ORDER BY version_number DESC;
```

### Get current documents with change info
```sql
SELECT * FROM current_documents
WHERE last_change_at > NOW() - INTERVAL '30 days'
ORDER BY last_change_at DESC;
```

### Get changes requiring review
```sql
SELECT * FROM recent_document_changes
WHERE requires_review = true
ORDER BY significance_score DESC, detected_at DESC;
```

## Future Enhancements

### Phase 2 (Planned)
- [ ] Automatic integration with crawler (auto-detect changes after each crawl)
- [ ] Email notifications for high-significance changes
- [ ] Web UI for browsing version history
- [ ] Diff visualization (side-by-side comparison)
- [ ] Change analytics dashboard
- [ ] Export change reports (CSV/PDF)
- [ ] Custom significance scoring rules per source
- [ ] LLM-powered change summarization

### Phase 3 (Future)
- [ ] Real-time change monitoring (scheduled crawls)
- [ ] Change prediction (ML-based)
- [ ] Compliance workflow integration
- [ ] API endpoints for change queries
- [ ] Webhook notifications
- [ ] Change approval workflows

## Technical Details

### Content Hashing Strategy

**What gets hashed:**
- Document summary (normalized, lowercase)
- Topics array (JSON serialized)
- Key numbers array (JSON serialized)

**Why this approach:**
- PDF file hashes would trigger false positives (metadata changes)
- Full text hashing is expensive and noisy
- Semantic content (summary/topics) captures meaningful changes
- Balances accuracy and performance

### Metadata Hashing Strategy

**What gets hashed:**
- Document title (normalized, lowercase)
- Issuing body (normalized, lowercase)
- Effective date
- Published date
- Category (normalized, lowercase)

**Purpose:**
- Detect administrative changes (title, dates, category)
- Separate from content changes
- Enable targeted change type classification

### Performance Considerations

- **Indexes**: All key query patterns are indexed
- **Hashing**: SHA-256 is fast and collision-resistant
- **Storage**: Full document data stored as JSONB for flexibility
- **Deduplication**: Prevents duplicate versions from being created
- **Cleanup**: Old versions can be archived/pruned if needed

## Migration

The change detection system was added in migration **`009_document_versioning.sql`**

To apply:
```bash
cd packages/db
pnpm run migrate
```

## Status

✅ **Implemented:**
- Database schema (tables, indexes, views)
- Change detection service
- Content/metadata hashing
- Significance scoring
- CLI commands (changes, versions)

⚙️ **In Progress:**
- Integration with crawler workflow
- Automatic change detection after crawls

📋 **Planned:**
- Email notifications
- Web UI
- Change reports
- Real-time monitoring

---

**Last Updated**: November 21, 2025
**Status**: Phase 1 Complete - Ready for testing
