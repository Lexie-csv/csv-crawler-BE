/**
 * EmailService
 * Handles email delivery via SMTP or SendGrid
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
}

export class EmailService {
    private transporter: Transporter | null = null;
    private fromAddress: string;

    constructor() {
        this.fromAddress = process.env.EMAIL_FROM || 'noreply@csv-crawler.com';
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter based on environment
     */
    private initializeTransporter(): void {
        const sendgridKey = process.env.SENDGRID_API_KEY;
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (sendgridKey) {
            // Use SendGrid SMTP
            this.transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: sendgridKey,
                },
            });
            console.log('[EmailService] Initialized with SendGrid SMTP');
        } else if (smtpHost && smtpUser && smtpPass) {
            // Use custom SMTP
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
            console.log(`[EmailService] Initialized with custom SMTP: ${smtpHost}:${smtpPort}`);
        } else {
            // Development mode: log emails to console
            console.warn('[EmailService] No SMTP configured. Emails will be logged to console only.');
            console.warn('[EmailService] Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS to enable email delivery.');
        }
    }

    /**
     * Send an email
     */
    async sendEmail(options: EmailOptions): Promise<void> {
        const { to, subject, html, text, from } = options;

        // Validate inputs
        if (!to || (Array.isArray(to) && to.length === 0)) {
            throw new Error('Email recipient(s) required');
        }
        if (!subject) {
            throw new Error('Email subject required');
        }
        if (!html) {
            throw new Error('Email HTML content required');
        }

        const recipients = Array.isArray(to) ? to.join(', ') : to;
        const fromAddr = from || this.fromAddress;

        // If no transporter, log to console (dev mode)
        if (!this.transporter) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('[EmailService] EMAIL (DEV MODE)');
            console.log(`From: ${fromAddr}`);
            console.log(`To: ${recipients}`);
            console.log(`Subject: ${subject}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(text || this.stripHtml(html));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return;
        }

        // Send via SMTP
        try {
            const info = await this.transporter.sendMail({
                from: fromAddr,
                to: recipients,
                subject,
                html,
                text: text || this.stripHtml(html),
            });

            console.log(`[EmailService] Email sent: ${info.messageId} to ${recipients}`);
        } catch (error) {
            console.error('[EmailService] Failed to send email:', error);
            throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Send bulk emails (one by one to avoid rate limits)
     */
    async sendBulkEmails(emails: EmailOptions[]): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const email of emails) {
            try {
                await this.sendEmail(email);
                success++;
                // Rate limiting: wait 100ms between sends
                await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`[EmailService] Failed to send to ${email.to}:`, error);
                failed++;
            }
        }

        return { success, failed };
    }

    /**
     * Verify SMTP connection
     */
    async verifyConnection(): Promise<boolean> {
        if (!this.transporter) {
            console.warn('[EmailService] No transporter configured');
            return false;
        }

        try {
            await this.transporter.verify();
            console.log('[EmailService] SMTP connection verified');
            return true;
        } catch (error) {
            console.error('[EmailService] SMTP verification failed:', error);
            return false;
        }
    }

    /**
     * Strip HTML tags for plain text fallback
     */
    private stripHtml(html: string): string {
        return html
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

// Export singleton instance
export const emailService = new EmailService();
