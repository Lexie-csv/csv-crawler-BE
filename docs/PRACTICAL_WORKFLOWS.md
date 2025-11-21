# Practical Workflows - Backend-Only Development

This guide shows real-world scenarios for running the CSV crawler independently.

## Workflow 1: First-Time Setup (Backend Only)

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your PostgreSQL credentials

# 3. Start PostgreSQL
docker-compose up -d postgres

# 4. Run migrations
pnpm db:migrate

# 5. Build backend packages
pnpm build:api

# 6. Start the crawler
pnpm start:api
```

**Result**: API server running on http://localhost:3001 ✅

---

## Workflow 2: Daily Development (Hot Reload)

```bash
# Terminal 1: Start PostgreSQL (if not running)
docker-compose up -d postgres

# Terminal 2: Run API in watch mode
pnpm dev:api
```

Now you can edit files in `apps/api/src/` and they'll automatically reload!

---

## Workflow 3: Test the Crawler

```bash
# Terminal 1: Start the API
pnpm dev:api

# Terminal 2: Run the test script
pnpm crawler:test
```

**Expected output**:
```
🧪 CSV Crawler - Test Script
==============================

✅ API server is running
📋 Listing existing sources...
➕ Adding a test source...
🚀 Creating crawl job...
📊 Checking crawl job status...
✅ Test completed!
```

---

## Workflow 4: Manual Testing with curl

```bash
# 1. Start the API
pnpm dev:api

# 2. In another terminal, test endpoints:

# Health check
curl http://localhost:3001/health

# List sources
curl http://localhost:3001/api/sources

# Add a new source
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bangko Sentral ng Pilipinas",
    "url": "https://www.bsp.gov.ph",
    "type": "policy",
    "country": "PH",
    "sector": "banking"
  }'

# Create a crawl job
curl -X POST http://localhost:3001/api/crawl-jobs \
  -H "Content-Type: application/json" \
  -d '{"source_id": 1}'

# Check job status
curl http://localhost:3001/api/crawl-jobs/1

# List all jobs
curl http://localhost:3001/api/crawl-jobs
```

---

## Workflow 5: Production Build & Deploy

### Local Production Test
```bash
# Build for production
pnpm build:api

# Start in production mode
NODE_ENV=production pnpm start:api
```

### Deploy to Railway
```bash
# Build
pnpm build:api

# Push to Railway
railway up

# Set environment variables in Railway dashboard:
# - DATABASE_URL
# - NODE_ENV=production
# - PORT=3001
```

### Deploy to Fly.io
```bash
# Create fly.toml (one-time setup)
fly launch --no-deploy

# Build and deploy
pnpm build:api
fly deploy
```

---

## Workflow 6: Debugging Backend Issues

```bash
# 1. Check TypeScript types
pnpm type-check:api

# 2. Run linter
pnpm lint:api

# 3. Run tests
pnpm test:api

# 4. Run with verbose logging
DEBUG=* pnpm dev:api

# 5. Check database connection
docker-compose ps
docker-compose logs postgres
```

---

## Workflow 7: Working with Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d csvdata

# Inside psql:
\dt                     # List tables
SELECT * FROM sources;  # Query sources
SELECT * FROM crawl_jobs ORDER BY created_at DESC LIMIT 10;

# Run migrations
pnpm db:migrate

# Reset database (careful!)
docker-compose down -v
docker-compose up -d postgres
pnpm db:migrate
```

---

## Workflow 8: Performance Testing

```bash
# 1. Start the API
pnpm build:api
pnpm start:api

# 2. Install Apache Bench (if needed)
brew install apache-bench

# 3. Load test the API
ab -n 1000 -c 10 http://localhost:3001/api/sources

# 4. Monitor memory/CPU
top
htop  # if installed
```

---

## Workflow 9: Scheduled Crawling (Cron)

### Option A: Using node-cron (in code)
```typescript
// apps/api/src/jobs/scheduler.ts
import cron from 'node-cron';
import { runCrawlJob } from './crawler.service';

// Run every day at 6 AM
cron.schedule('0 6 * * *', () => {
  console.log('Running scheduled crawl...');
  runCrawlJob();
});
```

### Option B: System cron
```bash
# Edit crontab
crontab -e

# Add this line (crawl daily at 6 AM)
0 6 * * * cd /path/to/csv-crawler && pnpm start:api
```

---

## Workflow 10: Multi-Environment Setup

### Development
```bash
# .env.development
DATABASE_URL=postgresql://localhost:5432/csvdata_dev
NODE_ENV=development
PORT=3001

pnpm dev:api
```

### Staging
```bash
# .env.staging
DATABASE_URL=postgresql://staging-db:5432/csvdata_staging
NODE_ENV=staging
PORT=3001

pnpm build:api && pnpm start:api
```

### Production
```bash
# .env.production
DATABASE_URL=postgresql://prod-db:5432/csvdata
NODE_ENV=production
PORT=3001

pnpm build:api && pnpm start:api
```

---

## Workflow 11: Monitoring & Logs

```bash
# View API logs in real-time
pnpm dev:api | tee api.log

# Filter for errors
pnpm dev:api 2>&1 | grep ERROR

# Save logs to file
pnpm start:api > logs/api-$(date +%Y%m%d).log 2>&1 &

# Monitor specific endpoints
watch -n 5 'curl -s http://localhost:3001/api/crawl-jobs | jq'
```

---

## Workflow 12: Clean & Reset

```bash
# Clean all builds
pnpm clean

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Reset database
docker-compose down -v
docker-compose up -d postgres
pnpm db:migrate

# Rebuild everything
pnpm build:api
```

---

## Common Issues & Solutions

### Issue: "Cannot find module @csv/types"
```bash
# Solution: Build types package first
cd packages/types && pnpm build
# OR
pnpm build:api  # Builds all dependencies
```

### Issue: "Database connection failed"
```bash
# Solution: Check PostgreSQL is running
docker-compose ps
docker-compose up -d postgres

# Check connection string in .env.local
cat .env.local | grep DATABASE_URL
```

### Issue: "Port 3001 already in use"
```bash
# Solution: Kill existing process
lsof -ti:3001 | xargs kill -9

# OR change port in .env.local
echo "PORT=3002" >> .env.local
```

### Issue: "Migration failed"
```bash
# Solution: Check migration files
ls -la packages/db/migrations/

# Manually run migrations
cd packages/db
node --import tsx src/cli.ts migrate
```

---

## Pro Tips

1. **Use tmux/screen** for persistent sessions:
   ```bash
   tmux new -s crawler
   pnpm dev:api
   # Detach with Ctrl+B, D
   ```

2. **Set up aliases** in `.zshrc`:
   ```bash
   alias crawler-start="cd ~/csv-crawler && pnpm dev:api"
   alias crawler-test="cd ~/csv-crawler && pnpm crawler:test"
   ```

3. **Use VS Code tasks** (`.vscode/tasks.json`):
   ```json
   {
     "label": "Start Crawler",
     "type": "shell",
     "command": "pnpm dev:api"
   }
   ```

4. **Monitor with better logs**:
   ```bash
   pnpm add pino pino-pretty
   # Use structured logging in your code
   ```

---

**Need help?** Check:
- [BACKEND_BUILD_GUIDE.md](./BACKEND_BUILD_GUIDE.md)
- [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)
- [BUILD_SEGMENTATION.md](../BUILD_SEGMENTATION.md)
