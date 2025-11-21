# 🚀 Quick Start — CSV Policy & Data Crawler

## Start the App (3 steps)

### 1. Start Database & Run Migrations
```bash
cd /Users/lexiepelaez/Desktop/csv-crawler
docker-compose up -d postgres
pnpm --filter @csv/db migrate
```

### 2. Start API (Terminal 1)
```bash
cd /Users/lexiepelaez/Desktop/csv-crawler/apps/api
pnpm dev
```

**Wait for:** `✓ API server listening on port 3001`

### 3. Start Web (Terminal 2)
```bash
cd /Users/lexiepelaez/Desktop/csv-crawler/apps/web
pnpm dev
```

**Wait for:** `✓ Ready in ...ms`

## ✅ You're Ready!

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001/health

## Stop the App

Press `Ctrl+C` in each terminal, then:
```bash
docker-compose down
```

## Common Issues

### "Port already in use"
```bash
lsof -ti:3000 :3001 | xargs kill -9
```

### "Cannot connect to database"
```bash
docker-compose down
docker-compose up -d postgres
pnpm --filter @csv/db migrate
```

### "Module not found"
```bash
pnpm install
```

---

**Need help?** See [`QUICKSTART.md`](QUICKSTART.md) for detailed instructions.
