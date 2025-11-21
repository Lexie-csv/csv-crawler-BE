# Story #9: Weekly Digest Generation & Email Service

## Status
🔴 Not Started

## Time Estimate
30 minutes

## Description
As a subscriber, I need a system that generates weekly digests of regulatory updates and sends them via email so that I receive curated summaries every Monday 08:00 Asia/Manila.

## Acceptance Criteria
- ✅ `DigestService` class with method: `generateDigest(params: DigestParams): Promise<Digest>`
- ✅ Query recent crawled_documents + datapoints (last 7 days, grouped by country/sector)
- ✅ Generate Markdown + HTML versions with: title, summary, datapoints table, link to documents
- ✅ `EmailService` class with method: `sendEmail(to: string, subject: string, html: string, markdown?: string): Promise<void>`
- ✅ Scheduled task: run every Monday 08:00 UTC+8 (Asia/Manila)
- ✅ Subscribe/unsubscribe endpoints: `/api/v1/digest/subscribe` and `/api/v1/digest/unsubscribe`
- ✅ No mock email; use real SMTP (SendGrid or similar via env config)
- ✅ Store sent digests in database for audit trail

## Tests Required
- Unit test: Digest generation includes correct datapoints
- Unit test: Markdown formatting is valid
- Unit test: Digest groups by country/sector
- Integration test: Email queued on schedule
- Integration test: Subscription/unsubscription persists in DB
- Mock test: SMTP error handled gracefully

## Files to Create/Modify
- `/apps/api/src/services/digest.service.ts` (new file)
- `/apps/api/src/services/email.service.ts` (new file)
- `/apps/api/src/routes/digest.ts` (subscribe/unsubscribe endpoints)
- `/apps/api/src/jobs/weekly-digest.ts` (scheduled task)
- `/packages/db/migrations/004_subscribers_and_digests.sql` (new tables)
- `/apps/api/.env.example` (add SMTP_HOST, SMTP_PORT, SENDGRID_API_KEY)

## Implementation Notes
- Use `node-cron` for scheduling (Monday 08:00 Asia/Manila = 0 8 * * 1 UTC+8)
- Query: `SELECT d.*, COUNT(dp.id) as datapoint_count FROM crawled_documents d LEFT JOIN datapoints dp ON d.id = dp.document_id WHERE d.created_at > NOW() - INTERVAL '7 days' GROUP BY d.id ORDER BY d.created_at DESC`
- Markdown template with headers, tables, links
- Email template: use HTML with inline CSS (Tailwind to CSS)
- Store digest payload + recipient list for audit
- Graceful failure: log error, do NOT crash scheduler

## Digest Example
```
# Policy & Data Crawler Weekly Digest — Week 46, 2025

## 🇵🇭 Philippines — Finance & Energy

### Recent Datapoints
| Datapoint | Value | Effective Date | Source |
|-----------|-------|-----------------|--------|
| Corporate Tax Rate | 30% | 2025-11-01 | BIR Circular |
| Solar FIT | 6.5 PHP/kWh | 2025-10-15 | ERC Order |

[View Full Report](http://localhost:3000)
```

## Testing Command
```bash
pnpm test -- apps/api --testNamePattern="digest|email"
# For schedule testing: manual trigger via API endpoint
curl -X POST http://localhost:3001/api/v1/digest/send
```

## Dependencies
- Story #7 (datapoints extraction)
- SMTP service (SendGrid, Mailgun, or custom)
- `node-cron` for scheduling

## Next Story
After completion → Story #10: Data Query API & Time Series
