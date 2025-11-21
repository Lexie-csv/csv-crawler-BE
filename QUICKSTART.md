# 🚀 Quick Start — CSV Policy & Data Crawler

## Prerequisites Installed ✅
- Node.js 24.11.1
- pnpm 10.21.0
- PostgreSQL 16 (Docker)
- All 858 npm dependencies

---

## Launch in 3 Steps

### 1️⃣ Open Terminal & Navigate
```bash
cd ~/Desktop/csv-crawler
```

### 2️⃣ Ensure PATH is Set (one-time)
```bash
source ~/.zprofile
```

### 3️⃣ Start Everything
```bash
pnpm dev
```

**Wait 30-60 seconds for servers to start...**

---

## Access the Application

| Service | URL | Port |
|---------|-----|------|
| 🌐 Web UI | http://localhost:3000 | 3000 |
| 🔌 API | http://localhost:3001 | 3001 |
| 💾 Database | localhost:5432 | 5432 |

---

## Test the Setup

### In a new terminal:
```bash
# Test API health
curl http://localhost:3001/health

# Should return:
# {"status":"ok","timestamp":"2025-11-12T..."}
```

---

## Common Commands

```bash
# Run tests
pnpm test

# Check code quality
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check

# View database
docker exec csv-crawler-db psql -U postgres -d csv_crawler -c "\dt"
```

---

## Stop Services

```bash
# Stop dev servers
Ctrl+C

# Stop PostgreSQL (optional)
docker-compose down
```

---

## If Something Goes Wrong

### `pnpm: command not found`
```bash
source ~/.zprofile
```

### Ports already in use
```bash
lsof -i :3000      # See what's using port 3000
# Change port in .env.local if needed
```

### Database connection failed
```bash
docker-compose up -d postgres
pnpm db:migrate
```

---

## Project Structure

```
csv-crawler/
├── apps/api/        ← Express REST API
├── apps/web/        ← Next.js UI
├── packages/db/     ← PostgreSQL migrations
├── packages/types/  ← Shared types
└── SETUP_REPORT.md  ← Detailed audit report
```

---

## Documentation

- 📖 **README.md** — Full project documentation
- 📋 **SETUP_REPORT.md** — Complete audit & fixes (detailed)
- 🛠️ **.github/copilot-instructions.md** — Development guidelines

---

**You're all set! Happy coding! 🎉**
