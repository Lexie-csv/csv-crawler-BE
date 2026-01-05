# Deployment & Contributing Guide

This file contains deployment instructions and contribution guidelines for CSV Radar.

## 🚀 Deployment

### Production Checklist

Before deploying to production:

- [ ] **Environment Variables:** Set all production env vars (DATABASE_URL, OPENAI_API_KEY, etc.)
- [ ] **Database:** Run migrations on production database
- [ ] **Secrets:** Rotate all API keys and credentials
- [ ] **Monitoring:** Set up error tracking (Sentry, LogRocket)
- [ ] **Analytics:** Configure usage analytics
- [ ] **Logging:** Verify Pino JSON logging in production
- [ ] **Performance:** Run lighthouse audits (target: 90+ score)
- [ ] **Security:** Add rate limiting, CORS configuration, helmet.js
- [ ] **Backup:** Configure automated database backups
- [ ] **CI/CD:** Set up GitHub Actions (lint, test, deploy)

### Recommended Stack

**Frontend (Next.js Web):**
- Platform: **Vercel** (zero-config Next.js deployment)
- Domain: Custom domain with SSL
- Environment: Node.js 20, automatic Turbopack builds
- Preview deployments on every PR

**Backend (Express API):**
- Platform: **Railway** or **Fly.io**
- Database: **Railway PostgreSQL** or **Supabase**
- Environment: Node.js 20, pnpm
- Health check endpoint: `/health`

**Database:**
- **Railway PostgreSQL** (managed, auto-backups)
- **Supabase** (PostgreSQL + realtime, auth ready)
- Alternative: **Neon** (serverless Postgres)

### Environment Variables (Production)

```bash
# Database
DATABASE_URL=postgresql://user:pass@prod-host:5432/csv_crawler

# API
NEXT_PUBLIC_API_URL=https://api.csvradar.com
API_URL=https://api.csvradar.com

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Environment
NODE_ENV=production

# Monitoring (optional)
SENTRY_DSN=https://...
LOGROCKET_APP_ID=...

# Email (for newsletters)
SENDGRID_API_KEY=...
FROM_EMAIL=newsletters@csvradar.com
```

### Vercel Deployment (Web)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
cd apps/web
vercel

# Deploy to production
vercel --prod
```

**Vercel Configuration (`vercel.json`):**
```json
{
  "buildCommand": "pnpm build:web",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.csvradar.com"
  }
}
```

### Railway Deployment (API)

```bash
# Install Railway CLI
npm install -g railway

# Login and init
railway login
railway init

# Deploy
cd apps/api
railway up
```

**Railway Configuration:**
- Build command: `cd apps/api && pnpm install && pnpm build`
- Start command: `cd apps/api && pnpm start`
- Health check: `/health`
- Port: 3001 (or $PORT env var)

---

## 🐛 Troubleshooting

### Database Connection Issues

**Problem:** `ECONNREFUSED localhost:5432`

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart container
docker-compose restart postgres

# Check logs
docker logs csv-crawler-db
```

### Build Failures

**Problem:** `Type errors in build`

**Solution:**
```bash
# Clear build cache
pnpm clean

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Type check
pnpm type-check
```

### Port Already in Use

**Problem:** `Port 3000 already in use`

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Migration Failures

**Problem:** Migration fails with SQL error

**Solution:**
```bash
# Rollback last migration
pnpm db:rollback

# Check migration status
docker exec csv-crawler-db psql -U postgres -d csv_crawler -c "SELECT * FROM migrations;"

# Manually fix database state if needed
docker exec -it csv-crawler-db psql -U postgres -d csv_crawler
```

### Playwright Test Failures

**Problem:** E2E tests fail with `TimeoutError`

**Solution:**
```bash
# Check if dev servers are running
lsof -i:3000 -i:3001

# Increase timeout in playwright.config.ts
# timeout: 10000 → 30000

# Run in headed mode to debug
pnpm e2e -- --headed

# Run in UI mode
pnpm e2e:ui
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Process

1. **Fork the repository** and create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following our code standards:
   - Use TypeScript strict mode
   - Follow ESLint rules (0 errors, 0 warnings)
   - Format with Prettier
   - Write tests for new features
   - Update documentation

3. **Commit your changes** using conventional commits:
   ```bash
   git commit -m "feat(scope): add new feature"
   git commit -m "fix(api): resolve endpoint bug"
   git commit -m "docs(readme): update setup instructions"
   ```

4. **Push to your fork** and create a pull request:
   ```bash
   git push origin feat/your-feature-name
   ```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code formatting (no logic changes)
- `refactor` - Code restructuring (no behavior changes)
- `test` - Adding or updating tests
- `chore` - Build process, dependencies, tooling

**Scopes:** `api`, `web`, `db`, `types`, `docs`, `ci`

**Example:**
```
feat(api): add document classification endpoint

- Implement POST /api/v1/documents/classify
- Add OpenAI integration for policy detection
- Update API documentation

Closes #123
```

### Code Review Guidelines

All PRs must:
- ✅ Pass all tests (`pnpm test`, `pnpm e2e`)
- ✅ Have 0 ESLint errors/warnings (`pnpm lint`)
- ✅ Be formatted with Prettier (`pnpm format`)
- ✅ Type-check successfully (`pnpm type-check`)
- ✅ Include relevant documentation updates
- ✅ Have descriptive commit messages

---

## 📄 License

**Proprietary** — CSV Team  
All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 💬 Support

For issues, questions, or feature requests:

- **GitHub Issues:** Create an issue in this repository
- **Email:** support@csvradar.com
- **Documentation:** See `/docs` folder for detailed guides

---

**Built with ❤️ by the CSV Team**
