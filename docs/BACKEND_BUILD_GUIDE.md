# Backend-Only Build Guide

This guide explains how to run the CSV crawler backend independently from the frontend.

## Quick Start - Backend Only

### Option 1: Using the dedicated script (Recommended)

```bash
# One command to build and run everything
./scripts/run-crawler.sh
```

### Option 2: Manual step-by-step

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Run migrations
pnpm db:migrate

# 3. Build backend packages only
pnpm build:api

# 4. Start the API server
pnpm start:api
```

### Option 3: Development mode (with hot reload)

```bash
# Start only the API in watch mode
pnpm dev:api
```

## Available Scripts

### Development
- `pnpm dev` - Run everything (API + Web) in parallel
- `pnpm dev:api` - Run only backend (API + types + db)
- `pnpm dev:web` - Run only frontend (Web + types)

### Building
- `pnpm build` - Build everything
- `pnpm build:api` - Build only backend packages
- `pnpm build:web` - Build only frontend packages

### Testing
- `pnpm test` - Run all tests
- `pnpm test:api` - Test only backend
- `pnpm test:web` - Test only frontend

### Linting & Type Checking
- `pnpm lint:api` - Lint backend code
- `pnpm lint:web` - Lint frontend code
- `pnpm type-check:api` - Type check backend
- `pnpm type-check:web` - Type check frontend

## Backend API Endpoints

Once the backend is running on `http://localhost:3001`, you can test the crawler:

### Sources Management
```bash
# List all sources
curl http://localhost:3001/api/sources

# Add a new source
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Source",
    "url": "https://example.com",
    "type": "policy",
    "country": "PH"
  }'
```

### Crawl Jobs
```bash
# Create a crawl job
curl -X POST http://localhost:3001/api/crawl-jobs \
  -H "Content-Type: application/json" \
  -d '{"source_id": 1}'

# List all crawl jobs
curl http://localhost:3001/api/crawl-jobs

# Get specific crawl job status
curl http://localhost:3001/api/crawl-jobs/1
```

## Architecture

The backend consists of:

- **`apps/api`** - Express.js REST API server
- **`packages/db`** - PostgreSQL migrations and database utilities
- **`packages/types`** - Shared TypeScript types

### Dependencies
The backend build includes only what's necessary:
- Database schema and migrations
- API server and crawler logic
- Shared types

The frontend (`apps/web`) is completely excluded from backend builds.

## Production Deployment

### Backend Only
```bash
# Build production backend
pnpm build:api

# Start production server
NODE_ENV=production pnpm start:api
```

### Full Stack
```bash
# Build everything
pnpm build

# Deploy API to Railway/Fly.io
# Deploy Web to Vercel
```

## Troubleshooting

### "Cannot find module" errors
```bash
pnpm install
pnpm build:api
```

### PostgreSQL connection issues
```bash
docker-compose down
docker-compose up -d postgres
pnpm db:migrate
```

### Type errors
```bash
# Check types before building
pnpm type-check:api
```

## Next Steps

1. **Test the crawler**: Use the curl commands above
2. **Monitor logs**: Check API server console for crawl progress
3. **Add sources**: Use POST /api/sources to add new sites
4. **Schedule jobs**: Set up cron jobs or use the scheduler

For more details, see:
- [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md)
- [docs/MULTI_PAGE_CRAWLER_GUIDE.md](../docs/MULTI_PAGE_CRAWLER_GUIDE.md)
