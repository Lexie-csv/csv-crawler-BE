# Story #9: Weekly Digest Generation & Email Service

## Overview
Implemented a complete email digest system with subscriber management, automated weekly digest generation, and SMTP email delivery.

## Deliverables

### 1. Database Schema (`003_subscribers_and_digests.sql`)
**Tables Created:**
- `subscribers` - Email subscription list with active/inactive status
- `digests` - Audit trail of sent digests
- `digest_recipients` - Many-to-many tracking of delivery status per subscriber

**Features:**
- UUID primary keys
- Indexes on email, active status, sent_at, digest relationships
- JSONB preferences field for future customization
- Cascading deletes for referential integrity

### 2. DigestService (`digest.service.ts`)
**Purpose**: Generate weekly digest content from crawled data

**Key Methods:**
- `generateDigest(params)` - Main generation function
- `fetchDatapoints()` - Query datapoints for time period
- `fetchDocuments()` - Query documents with datapoint counts
- `groupDatapoints()` - Group by country/sector for organization
- `generateMarkdown()` - Create Markdown email content
- `generateHtml()` - Create HTML email content with inline CSS

**Features:**
- Time period filtering (default: last 7 days)
- Optional country/sector filtering
- Groups datapoints by country and sector
- Limits display (10 datapoints per group, 15 documents)
- Calculates ISO week numbers for subject line
- Escapes Markdown and HTML special characters
- Includes unsubscribe links

**Output Example:**
```
Subject: Policy & Data Crawler Weekly Digest — Week 46, 2025

## 📊 New Datapoints

### PH — Banking
| Title | Value | Date | Source |
|-------|-------|------|--------|
| CAR Threshold | 12% | 2025-11-01 | BSP |

## 📄 Recent Documents (5)
- **BSP Circular 2025-01** — BSP (3 datapoints)
```

### 3. EmailService (`email.service.ts`)
**Purpose**: Handle email delivery via SMTP/SendGrid

**Configuration:**
- SendGrid: Set `SENDGRID_API_KEY`
- Custom SMTP: Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Dev mode: Logs emails to console if no SMTP configured

**Key Methods:**
- `sendEmail(options)` - Send single email
- `sendBulkEmails(emails)` - Send multiple with rate limiting (100ms delay)
- `verifyConnection()` - Test SMTP connectivity

**Features:**
- Automatic transporter initialization
- Plain text fallback from HTML (strips tags)
- Error handling and logging
- Rate limiting for bulk sends
- Development mode for testing without SMTP

### 4. Digest API Routes (`routes/digest.ts`)
**Endpoints:**

**POST `/api/digest/subscribe`**
- Body: `{ email, name? }`
- Creates new subscriber or reactivates inactive
- Returns 409 if already subscribed (and active)
- Validates email format

**POST `/api/digest/unsubscribe`**
- Body: `{ email }`
- Marks subscriber as inactive
- Idempotent (safe to call multiple times)

**GET `/api/digest/subscribers?active=true`**
- Lists subscribers (admin endpoint)
- Optional filter by active status

**POST `/api/digest/send`**
- Body: `{ days?, countries?, sectors? }`
- Manually trigger digest generation and send
- Defaults to last 7 days
- Returns summary with email counts

**GET `/api/digest/history?limit=20`**
- Lists sent digests (audit trail)
- Shows subject, recipient count, datapoint count, dates

### 5. Scheduled Job (`jobs/weekly-digest.ts`)
**Purpose**: Automated weekly digest delivery

**Schedule:**
- Runs every Monday at 00:00 UTC (08:00 Asia/Manila)
- Cron expression: `0 0 * * 1`
- Uses node-cron scheduler

**Process:**
1. Calculate last 7 days period
2. Generate digest via DigestService
3. Fetch active subscribers
4. Store digest in database
5. Send emails to all subscribers
6. Track delivery status per recipient
7. Log results (success/failed counts)

**Error Handling:**
- Graceful failures (logs errors, doesn't crash)
- Continues even if some emails fail
- Tracks failed deliveries in database

### 6. Integration (`index.ts`)
- Added digest routes under `/api/digest`
- Initialized scheduler on server startup
- Logs scheduler status to console

## Environment Variables

Add to `.env` (optional, uses console logging in dev mode):

```bash
# Email Configuration (choose one)

# Option 1: SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=digest@csv-crawler.com

# Option 2: Custom SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=digest@csv-crawler.com
```

## Testing

### Unit Tests
```bash
pnpm test -- digest.service.test
```

**Coverage:**
- ✅ Digest generation with data
- ✅ Empty results handling
- ✅ Datapoint grouping by country/sector
- ✅ Country filtering

### Manual Testing
```bash
# 1. Start API server
pnpm --filter api dev

# 2. Subscribe
curl -X POST http://localhost:3001/api/digest/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'

# 3. Send test digest
curl -X POST http://localhost:3001/api/digest/send \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'

# 4. Check history
curl http://localhost:3001/api/digest/history

# 5. Unsubscribe
curl -X POST http://localhost:3001/api/digest/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Database Verification

```sql
-- Check subscribers
SELECT * FROM subscribers;

-- Check sent digests
SELECT id, subject, recipient_count, datapoint_count, sent_at 
FROM digests 
ORDER BY sent_at DESC;

-- Check delivery tracking
SELECT dr.*, s.email 
FROM digest_recipients dr
JOIN subscribers s ON dr.subscriber_id = s.id
WHERE dr.digest_id = '<digest-id>';
```

## Design Decisions

1. **No LLM for Digest Generation**: Uses deterministic SQL queries and templates for reliability
2. **Markdown + HTML**: Provides both formats for email client compatibility
3. **Rate Limiting**: 100ms delay between bulk emails to avoid SMTP throttling
4. **Audit Trail**: Stores all digests and tracks per-recipient delivery
5. **Idempotent Operations**: Subscribe/unsubscribe are safe to call multiple times
6. **Dev Mode**: Console logging when SMTP not configured for easy testing
7. **Grouping**: Organizes datapoints by country/sector for readability

## Known Limitations

1. **No Open Tracking**: Would require webhook integration with SendGrid
2. **No Click Tracking**: Plain links without tracking parameters
3. **No Retry Logic**: Failed emails are logged but not automatically retried
4. **No Personalization**: Same content sent to all subscribers
5. **No Unsubscribe Token**: Uses email address directly (could add signed tokens)
6. **Fixed Schedule**: Monday 08:00 only (could make configurable)
7. **No A/B Testing**: Single template for all recipients

## Future Enhancements

- [ ] Add unsubscribe tokens for security
- [ ] Implement webhook handlers for open/click tracking
- [ ] Add personalized preferences (country/sector filtering per subscriber)
- [ ] Support multiple digest frequencies (daily, monthly)
- [ ] Add digest preview endpoint (HTML render)
- [ ] Implement retry queue for failed emails
- [ ] Add subscriber confirmation (double opt-in)
- [ ] Support custom SMTP per environment
- [ ] Add digest templates (multiple styles)
- [ ] Export subscriber list (CSV)

## Files Summary

**New Files** (7):
- `packages/db/migrations/003_subscribers_and_digests.sql` (59 lines)
- `apps/api/src/services/digest.service.ts` (424 lines)
- `apps/api/src/services/email.service.ts` (171 lines)
- `apps/api/src/routes/digest.ts` (177 lines)
- `apps/api/src/jobs/weekly-digest.ts` (115 lines)
- `apps/api/src/services/digest.service.test.ts` (132 lines)
- `docs/implementations/09_digest_email.md` (this file)

**Modified Files** (2):
- `apps/api/src/index.ts` (added digest routes and scheduler)
- `package.json` (added nodemailer, node-cron dependencies)

**Total**: ~1,100 lines of new code

## Acceptance Criteria Status

- ✅ `DigestService` class with `generateDigest(params)` method
- ✅ Query recent documents + datapoints (last 7 days, grouped by country/sector)
- ✅ Generate Markdown + HTML versions with title, summary, datapoints table, links
- ✅ `EmailService` class with `sendEmail()` method
- ✅ Scheduled task: Monday 08:00 Asia/Manila (00:00 UTC)
- ✅ Subscribe/unsubscribe endpoints: `/api/digest/subscribe` and `/api/digest/unsubscribe`
- ✅ Real SMTP support (SendGrid or custom) with dev mode fallback
- ✅ Store sent digests in database for audit trail

## Next Story
→ **Story #10**: Datapoint Query API & Time Series Analysis
