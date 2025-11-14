/**
 * Digest Routes
 * Subscription management and manual digest triggers
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '@csv/db';
import { digestService } from '../services/digest.service';
import { emailService } from '../services/email.service';

const router: Router = Router();

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * POST /api/digest/subscribe
 * Subscribe to weekly digests
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Check if already subscribed
    const existing = await queryOne<Subscriber>(
      'SELECT * FROM subscribers WHERE email = $1',
      [email]
    );

    if (existing) {
      // Reactivate if inactive
      if (!existing.active) {
        await query(
          'UPDATE subscribers SET active = true, updated_at = NOW() WHERE id = $1',
          [existing.id]
        );
        return res.json({ message: 'Subscription reactivated', subscriber: { ...existing, active: true } });
      }
      return res.status(409).json({ error: 'Already subscribed', subscriber: existing });
    }

    // Create new subscriber
    const subscriber = await queryOne<Subscriber>(
      `INSERT INTO subscribers (email, name, active) 
       VALUES ($1, $2, true) 
       RETURNING *`,
      [email, name || null]
    );

    res.status(201).json({ message: 'Subscribed successfully', subscriber });
  } catch (error) {
    console.error('[DigestRoutes] Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

/**
 * POST /api/digest/unsubscribe
 * Unsubscribe from weekly digests
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const subscriber = await queryOne<Subscriber>(
      'SELECT * FROM subscribers WHERE email = $1',
      [email]
    );

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    if (!subscriber.active) {
      return res.json({ message: 'Already unsubscribed' });
    }

    await query(
      'UPDATE subscribers SET active = false, updated_at = NOW() WHERE id = $1',
      [subscriber.id]
    );

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('[DigestRoutes] Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * GET /api/digest/subscribers
 * List all subscribers (for admin)
 */
router.get('/subscribers', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let sql = 'SELECT * FROM subscribers';
    const params: any[] = [];

    if (active !== undefined) {
      sql += ' WHERE active = $1';
      params.push(active === 'true');
    }

    sql += ' ORDER BY created_at DESC';

    const subscribers = await query<Subscriber>(sql, params);
    res.json(subscribers);
  } catch (error) {
    console.error('[DigestRoutes] List subscribers error:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

/**
 * POST /api/digest/send
 * Manually trigger digest generation and send
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { days = 7, countries, sectors } = req.body;

    // Calculate time period
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);

    // Generate digest
    const digest = await digestService.generateDigest({
      periodStart,
      periodEnd,
      countries,
      sectors,
    });

    // Get active subscribers
    const subscribers = await query<Subscriber>(
      'SELECT * FROM subscribers WHERE active = true'
    );

    if (subscribers.length === 0) {
      return res.json({ 
        message: 'Digest generated but no active subscribers',
        digest: {
          subject: digest.subject,
          datapointCount: digest.datapointCount,
          documentCount: digest.documentCount,
        },
      });
    }

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
        [digestRecord?.id, sub.id, true] // Assume delivered for now (improve with webhooks)
      );
    }

    res.json({
      message: 'Digest sent successfully',
      digest: {
        id: digestRecord?.id,
        subject: digest.subject,
        datapointCount: digest.datapointCount,
        documentCount: digest.documentCount,
        recipientCount: subscribers.length,
        emailsSent: success,
        emailsFailed: failed,
      },
    });
  } catch (error) {
    console.error('[DigestRoutes] Send digest error:', error);
    res.status(500).json({ error: 'Failed to send digest' });
  }
});

/**
 * GET /api/digest/history
 * List sent digests
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const digests = await query(
      `SELECT id, subject, recipient_count, datapoint_count, period_start, period_end, sent_at, created_at
       FROM digests
       ORDER BY sent_at DESC
       LIMIT $1`,
      [parseInt(limit as string, 10)]
    );

    res.json(digests);
  } catch (error) {
    console.error('[DigestRoutes] History error:', error);
    res.status(500).json({ error: 'Failed to fetch digest history' });
  }
});

export default router;
