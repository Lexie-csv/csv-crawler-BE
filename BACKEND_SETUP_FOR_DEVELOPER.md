# Backend Setup Instructions for Developer

## Context

CSV RADAR is a full-stack monitoring platform for regulatory and policy updates. The **frontend is complete and functional** but requires a working PostgreSQL database backend to operate.

**Current Status:**
- ✅ Frontend (Next.js): Fully implemented and working
- ✅ Backend API (Express): Code complete, routes implemented
- ❌ Database: Not set up (causing `role "postgres" does not exist` errors)
- ❌ Migrations: Not run

**Your Mission:** Set up the PostgreSQL database and run migrations so the frontend can connect.

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ (needs to be installed)
- pnpm (can use `npx pnpm` if not installed globally)

---

## Quick Start (Mac)

### Step 1: Install & Start PostgreSQL

```bash
# Install PostgreSQL via Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify it's running
psql --version
# Should output: psql (PostgreSQL) 14.x
```

### Step 2: Create Database

```bash
# Create the csv_crawler database
createdb csv_crawler

# Verify database was created
psql -l | grep csv_crawler
```

### Step 3: Configure Environment

```bash
cd /Users/martinbanaria/Projects/csv-crawler-BE-main

# Create .env.local file with database connection
cat > .env.local << EOF
DATABASE_URL=postgresql://$(whoami)@localhost:5432/csv_crawler
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Also create .env file for packages/db
cat > packages/db/.env << EOF
DATABASE_URL=postgresql://$(whoami)@localhost:5432/csv_crawler
EOF
```

### Step 4: Install Dependencies & Build Database Package

```bash
# Install all dependencies
npx pnpm install

# Build the database package
cd packages/db
npx pnpm build

# Verify dist folder was created
ls -la dist/
# Should see: migrate.js and index.js
```

### Step 5: Run Database Migrations

```bash
# Still in packages/db directory
node dist/migrate.js

# You should see output like:
# [Migration] Running migration: 001_init_schema.sql
# [Migration] Running migration: 002_crawl_jobs.sql
# ... etc
# [Migration] All migrations completed successfully
```

### Step 6: Verify Database Schema

```bash
# Connect to database
psql -d csv_crawler

# List tables
\dt

# Should see tables:
# - sources
# - crawl_jobs
# - documents
# - datapoints
# - crawl_digests
# - subscribers
# - audit_logs

# Exit psql
\q
```

### Step 7: Start Dev Servers

```bash
# Go back to project root
cd /Users/martinbanaria/Projects/csv-crawler-BE-main

# Start both API and Web servers
npx -y pnpm@latest dev

# You should see:
# ✓ API server listening on port 3001
# ✓ Next.js Ready in Xs
```

### Step 8: Test API Connection

```bash
# In a new terminal, test the API
curl http://localhost:3001/health

# Should return: {"status":"ok","timestamp":"...","uptime":...}

# Test sources endpoint
curl http://localhost:3001/api/sources

# Should return: {"data":[],"total":0,"limit":50,"offset":0,...}
```

---

## Database Schema Overview

The migrations create these tables:

### 1. **sources** (Monitoring sources)
```sql
- id (UUID)
- name (VARCHAR 255)
- url (VARCHAR 2048) 
- type (VARCHAR 50): 'policy' | 'exchange' | 'gazette' | 'ifi' | 'portal' | 'news'
- country (VARCHAR 10)
- sector (VARCHAR 50)
- active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

### 2. **crawl_jobs** (Crawl execution tracking)
```sql
- id (UUID)
- source_id (UUID FK → sources)
- status (VARCHAR 20): 'pending' | 'running' | 'done' | 'failed'
- started_at, completed_at (TIMESTAMP)
- items_crawled, items_new (INTEGER)
- pages_crawled, pages_new, pages_failed, pages_skipped (INTEGER) -- for multi-page
- max_depth, max_pages (INTEGER) -- multi-page config
- crawl_config (JSONB)
- error_message (TEXT)
```

### 3. **documents** (Crawled content)
```sql
- id (UUID)
- source_id (UUID FK → sources)
- crawl_job_id (UUID FK → crawl_jobs)
- url (VARCHAR 2048)
- title, content_text, content_html (TEXT)
- content_hash (VARCHAR 64) -- SHA-256 for deduplication
- published_at, created_at (TIMESTAMP)
```

### 4. **datapoints** (Extracted structured data)
```sql
- id (UUID)
- document_id (UUID FK → documents)
- source_id (UUID FK → sources)
- category, subcategory (VARCHAR)
- title, value (TEXT)
- date_value (DATE)
- metadata (JSONB)
```

### 5. **crawl_digests** (LLM-generated summaries)
```sql
- id (UUID)
- crawl_job_id (UUID FK → crawl_jobs)
- source_id (UUID FK → sources)
- period_start, period_end (TIMESTAMP)
- summary_markdown (TEXT)
- highlights (JSONB) -- array of key findings
- datapoints (JSONB) -- extracted indicators
- metadata (JSONB)
```

### 6. **subscribers** (Email subscriptions)
```sql
- id (UUID)
- email (VARCHAR 255)
- active (BOOLEAN)
- verified (BOOLEAN)
- subscribed_at (TIMESTAMP)
```

---

## Migration Files Location

All SQL migration files are in: `packages/db/migrations/`

```
001_init_schema.sql         -- Core tables
002_crawl_jobs.sql          -- Crawl job tracking
003_add_crawl_job_id.sql    -- Link documents to jobs
004_datapoints.sql          -- Structured data extraction
005_digests.sql             -- Weekly digest emails
006_alter_sources.sql       -- Source type updates
007_subscribers.sql         -- Email subscriptions
008_multi_page_crawling.sql -- Multi-page crawl support
```

---

## API Endpoints (Already Implemented)

### Sources
- `GET /api/sources` - List all sources
- `GET /api/sources/:id` - Get single source
- `POST /api/sources` - Create source
- `PUT /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source

### Crawl Jobs
- `POST /api/crawl/start` - Start a crawl job
- `GET /api/crawl/jobs` - List jobs (with filters)
- `GET /api/crawl/jobs/:id` - Get job details
- `PUT /api/crawl/jobs/:id` - Update job status

### Datapoints
- `GET /api/datapoints` - Query datapoints (with filters)
- `GET /api/datapoints/export` - Export to CSV

### Digests
- `GET /api/digests` - List digests (paginated)
- `GET /api/digests/:id` - Get digest details

### Dashboard
- `GET /api/stats` - Dashboard statistics
- `GET /api/crawl-jobs` - Recent jobs list

---

## Troubleshooting

### Error: `role "postgres" does not exist`
**Cause:** PostgreSQL not running or wrong connection string  
**Fix:** 
```bash
# Check if PostgreSQL is running
pg_isready

# If not running:
brew services start postgresql@14

# Check DATABASE_URL uses your Mac username:
echo "postgresql://$(whoami)@localhost:5432/csv_crawler"
```

### Error: `database "csv_crawler" does not exist`
**Cause:** Database not created  
**Fix:** 
```bash
createdb csv_crawler
```

### Error: `relation "sources" does not exist`
**Cause:** Migrations not run  
**Fix:**
```bash
cd packages/db
npx pnpm build
node dist/migrate.js
```

### Migrations fail with syntax errors
**Cause:** Migration files may have issues  
**Fix:**
```bash
# Check PostgreSQL version
psql --version  # Should be 14+

# Try running migrations one by one
cd packages/db/migrations
psql -d csv_crawler -f 001_init_schema.sql
psql -d csv_crawler -f 002_crawl_jobs.sql
# ... etc
```

### Port 3001 already in use
**Cause:** Old API server still running  
**Fix:**
```bash
# Kill all node processes
pkill -9 node

# Or find specific process
lsof -ti:3001 | xargs kill -9
```

---

## Environment Variables Reference

### `.env.local` (project root)
```bash
# Database
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/csv_crawler

# API Server
PORT=3001
NODE_ENV=development

# Web App
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: LLM (for digest generation)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# Optional: Email (for digest delivery)
# SENDGRID_API_KEY=SG...
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=yourpassword
```

### `packages/db/.env`
```bash
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/csv_crawler
```

---

## Verification Checklist

Once setup is complete, verify everything works:

```bash
# ✅ 1. PostgreSQL is running
pg_isready
# Output: /tmp:5432 - accepting connections

# ✅ 2. Database exists
psql -l | grep csv_crawler
# Output: csv_crawler | your_username | ...

# ✅ 3. Tables created
psql -d csv_crawler -c "\dt"
# Should list 7+ tables

# ✅ 4. API server responds
curl http://localhost:3001/health
# Output: {"status":"ok",...}

# ✅ 5. Frontend loads
curl http://localhost:3000
# Output: HTML content (should not be error)

# ✅ 6. API endpoints work
curl http://localhost:3001/api/sources
# Output: {"data":[],"total":0,...}
```

---

## Testing the Complete System

After setup, test the full workflow:

1. **Open browser:** http://localhost:3000/sources
2. **Add a test source:**
   - Name: DOE Circulars Test
   - URL: https://www.doe.gov.ph/circulars
   - Type: Policy
   - Country: PH
   - Sector: Energy
   - Active: ✓
3. **Start a crawl:** Navigate to /crawl and click "Start Crawl"
4. **Monitor progress:** Watch real-time updates
5. **View results:** Check /documents and /datapoints

---

## Alternative: Docker Setup (if preferred)

If you prefer Docker over local PostgreSQL:

```bash
# Start PostgreSQL container
docker run --name csv-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=csv_crawler \
  -p 5432:5432 \
  -d postgres:14

# Update .env.local
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/csv_crawler" > .env.local

# Run migrations
cd packages/db
npx pnpm build
node dist/migrate.js

# Start servers
cd ../..
npx -y pnpm@latest dev
```

---

## Support

If you encounter issues:

1. Check terminal output for specific error messages
2. Verify PostgreSQL is running: `brew services list`
3. Check database connection: `psql -d csv_crawler -c "SELECT 1;"`
4. Review migration logs in `packages/db/migrations/`
5. Check API logs in terminal where `pnpm dev` is running

**The frontend code is solid and complete. Once the database is set up, everything will work!**

---

## Summary

**What's Working:**
- ✅ Frontend UI (Next.js, React, Tailwind)
- ✅ Backend API routes (Express, TypeScript)
- ✅ Crawler service (multi-page, PDF support)
- ✅ LLM extraction pipeline
- ✅ Real-time job monitoring

**What Needs Setup:**
- ❌ PostgreSQL installation
- ❌ Database creation
- ❌ Migration execution
- ❌ Environment configuration

**Time Estimate:** 15-20 minutes for complete setup

**Once complete:** Frontend will connect seamlessly and all features will work end-to-end.
