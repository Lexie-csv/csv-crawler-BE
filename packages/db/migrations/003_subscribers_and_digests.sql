-- Migration 003: Subscribers and Digests
-- Add tables for email subscriptions and digest audit trail

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);

-- Digests table (audit trail)
CREATE TABLE IF NOT EXISTS digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(500) NOT NULL,
    content_markdown TEXT NOT NULL,
    content_html TEXT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    datapoint_count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digests_sent_at ON digests(sent_at);
CREATE INDEX IF NOT EXISTS idx_digests_period ON digests(period_start, period_end);

-- Digest recipients (many-to-many)
CREATE TABLE IF NOT EXISTS digest_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digest_id UUID NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
    subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    delivered BOOLEAN NOT NULL DEFAULT false,
    opened BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_recipients_digest ON digest_recipients(digest_id);
CREATE INDEX IF NOT EXISTS idx_digest_recipients_subscriber ON digest_recipients(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_digest_recipients_delivered ON digest_recipients(delivered);

COMMENT ON TABLE subscribers IS 'Email subscribers for weekly digests';
COMMENT ON TABLE digests IS 'Audit trail of sent digests';
COMMENT ON TABLE digest_recipients IS 'Tracking individual email deliveries';
