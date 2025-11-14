/**
 * Weekly Digest Scheduler
 * Runs every Monday at 08:00 Asia/Manila (UTC+8)
 */

import cron from 'node-cron';
import { query, queryOne } from '@csv/db';
import { digestService } from '../services/digest.service';
import { emailService } from '../services/email.service';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
}

/**
 * Send weekly digest to all active subscribers
 */
async function sendWeeklyDigest(): Promise<void> {
  console.log('[WeeklyDigest] Starting scheduled digest generation...');

  try {
    // Calculate last 7 days
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Generate digest
    const digest = await digestService.generateDigest({
      periodStart,
      periodEnd,
    });

    console.log(`[WeeklyDigest] Generated digest: ${digest.datapointCount} datapoints, ${digest.documentCount} documents`);

    // Get active subscribers
    const subscribers = await query<Subscriber>(
      'SELECT * FROM subscribers WHERE active = true'
    );

    if (subscribers.length === 0) {
      console.log('[WeeklyDigest] No active subscribers. Skipping email delivery.');
      return;
    }

    console.log(`[WeeklyDigest] Sending to ${subscribers.length} subscriber(s)...`);

    // Store digest in database
    const digestRecord = await queryOne<{ id: string }>(
      `INSERT INTO digests (subject, content_markdown, content_html, recipient_count, datapoint_count, period_start, period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        digest.subject,
        digest.contentMarkdown,
        digest.contentHtml,
        subscribers.length,
        digest.datapointCount,
        periodStart,
        periodEnd,
      ]
    );

    // Send emails
    const emailPromises = subscribers.map((sub) => ({
      to: sub.email,
      subject: digest.subject,
      html: digest.contentHtml,
      text: digest.contentMarkdown,
    }));

    const { success, failed } = await emailService.sendBulkEmails(emailPromises);

    // Track recipients
    for (const sub of subscribers) {
      await query(
        `INSERT INTO digest_recipients (digest_id, subscriber_id, delivered)
         VALUES ($1, $2, $3)`,
        [digestRecord?.id, sub.id, success > 0] // Mark delivered if at least one success
      );
    }

    console.log(`[WeeklyDigest] Completed: ${success} sent, ${failed} failed`);
  } catch (error) {
    console.error('[WeeklyDigest] Error generating/sending digest:', error);
  }
}

/**
 * Initialize scheduled digest job
 * Runs every Monday at 08:00 Asia/Manila (00:00 UTC)
 * Cron format: minute hour day month weekday
 */
export function initializeDigestScheduler(): void {
  // Monday at 00:00 UTC (08:00 Asia/Manila)
  const schedule = '0 0 * * 1';

  cron.schedule(schedule, async () => {
    console.log('[WeeklyDigest] Scheduled job triggered');
    await sendWeeklyDigest();
  }, {
    timezone: 'UTC',
  });

  console.log(`[WeeklyDigest] Scheduler initialized (${schedule} UTC = Monday 08:00 Asia/Manila)`);
  console.log('[WeeklyDigest] Next run:', cron.getTasks().values().next().value);
}

// Export for manual triggering
export { sendWeeklyDigest };
