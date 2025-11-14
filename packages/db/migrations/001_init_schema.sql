-- Migration 001: Create schema
-- Created at: 2025-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL UNIQUE,
  country VARCHAR(10) NOT NULL,
  sector VARCHAR(50) NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
  active BOOLEAN DEFAULT true,
  robots_txt_checked_at TIMESTAMP,
  last_crawled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  content TEXT,
  content_hash VARCHAR(64) NOT NULL,
  classification VARCHAR(50) NOT NULL,
  country VARCHAR(10),
  sector VARCHAR(50),
  themes TEXT[], -- array of tags
  extracted_data JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.0,
  verified BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, content_hash)
);

-- Datapoints table
CREATE TABLE IF NOT EXISTS datapoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  unit VARCHAR(50),
  effective_date DATE,
  source VARCHAR(255),
  confidence FLOAT DEFAULT 0.0,
  provenance TEXT, -- audit trail
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Digests (weekly newsletters) table
CREATE TABLE IF NOT EXISTS digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(512) NOT NULL,
  topics TEXT[], -- array of topic strings
  countries TEXT[], -- array of country codes
  content TEXT,
  markdown_content TEXT,
  pdf_url VARCHAR(2048),
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  topics TEXT[], -- array of topic interests
  countries TEXT[], -- array of countries
  active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  user_id VARCHAR(255),
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_documents_source_id ON documents(source_id);
CREATE INDEX IF NOT EXISTS idx_documents_classification ON documents(classification);
CREATE INDEX IF NOT EXISTS idx_documents_country ON documents(country);
CREATE INDEX IF NOT EXISTS idx_documents_sector ON documents(sector);
CREATE INDEX IF NOT EXISTS idx_documents_crawled_at ON documents(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_datapoints_document_id ON datapoints(document_id);
CREATE INDEX IF NOT EXISTS idx_datapoints_key ON datapoints(key);
CREATE INDEX IF NOT EXISTS idx_digests_scheduled_at ON digests(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
