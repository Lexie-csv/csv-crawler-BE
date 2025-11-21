# CSV Policy & Data Crawler — Copilot Instructions

## Project Overview

**CSV** is a full-stack monorepo for monitoring regulatory and policy updates across Philippine and Southeast Asian markets, extracting key datapoints, and generating weekly newsletters.

### Tech Stack

- **Database**: PostgreSQL 14+ with migrations (SQL-based)
- **API**: Express.js (TypeScript) on port 3001, REST/JSON
- **Web**: Next.js 14 (App Router) with Tailwind CSS, Turbopack, shadcn/ui
- **Testing**: Jest + ts-jest (unit), Supertest (API), Playwright (E2E)
- **Monorepo**: pnpm workspaces, Turbo orchestration
- **Code Quality**: ESLint, Prettier, Husky, commitlint

### Folder Structure

```
csv-crawler/
├── apps/
│   ├── api/              # Express server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── app.ts
│   │   │   └── app.test.ts
│   │   └── package.json
│   └── web/              # Next.js app
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   ├── components/
│       │   ├── lib/      # Utilities (e.g. cn.ts)
│       │   └── styles/   # globals.css + Tailwind
│       └── package.json
├── packages/
│   ├── db/               # PostgreSQL schema + migrations
│   │   ├── migrations/   # SQL files
│   │   ├── src/          # TypeScript CLI + pool
│   │   └── package.json
│   └── types/            # Shared TypeScript types
│       ├── src/index.ts
│       └── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .eslintrc.json
├── .prettierrc.json
└── README.md
```

## Development Workflow

### 1. Setup

```bash
pnpm install
cp .env.example .env.local
docker-compose up -d postgres
pnpm db:migrate
pnpm dev  # Start all servers
```

### 2. Code Standards

- **TypeScript**: Strict mode enabled; no `any` types. Use explicit return types.
- **Naming**: camelCase for variables/functions, PascalCase for types/classes.
- **Commit messages**: Follow Conventional Commits (feat, fix, docs, test, etc.)
- **Testing**: TDD-first; aim for ≥70% coverage. Write tests before code.
- **Styling**: Tailwind utility classes; no inline styles. Use design tokens (colors in config).

### 3. Before Pushing

```bash
pnpm lint        # Check ESLint
pnpm format      # Auto-format with Prettier
pnpm test        # Run all unit tests
pnpm type-check  # Verify TypeScript
git add .
git commit -m "feat(scope): description"  # Conventional commit
```

### 4. Common Tasks

**Add a new API endpoint:**
1. Define types in `packages/types/src/index.ts`
2. Add route in `apps/api/src/index.ts` (or modularized route file)
3. Write test in `apps/api/src/app.test.ts`
4. Run `pnpm test` to verify

**Add a new Next.js page:**
1. Create file in `apps/web/src/app/[route]/page.tsx`
2. Use server components by default; add `'use client'` only if needed
3. Import Tailwind classes from `@/styles/globals.css`
4. Test with `pnpm dev` in web app

**Add a database migration:**
1. Create new SQL file in `packages/db/migrations/NNN_description.sql`
2. Update migration runner in `packages/db/src/migrate.ts` if structure changes
3. Run `pnpm db:migrate` to apply

## Key Principles

1. **Content-first**: UI is minimal; data is the focus.
2. **Deterministic**: Prefer regex + schema validation over LLM for extraction (fallback to LLM if needed).
3. **Reliability**: No silent failures; fail fast with clear error messages.
4. **Privacy**: Respect robots.txt; rate-limit crawling.
5. **Auditability**: Log all actions (who, what, when).

## Design System

- **Font**: Plus Jakarta Sans (Google Fonts)
- **Primary**: #202020 (neutral black)
- **Text**: copy #202020, secondary #727272, captions #A0A0A0
- **Backgrounds**: white, page #FAFAFA, contrast #EFEFEF
- **Borders**: #DCDCDC
- **Components**: shadcn/ui + Tailwind (no vanilla Radix)
- **Spacing**: 8px baseline (Tailwind defaults)
- **Radii**: md (0.375rem) / lg (0.5rem)

## Troubleshooting

**Dependencies not resolving?**
```bash
pnpm install --force
pnpm clean && pnpm install
```

**Build fails?**
```bash
pnpm type-check
pnpm lint
# Check console errors
```

**Database issues?**
```bash
docker-compose down
docker-compose up -d postgres
pnpm db:migrate
```

## Next Steps / TODOs

- [ ] Set up GitHub Actions (CI/CD, automated testing)
- [ ] Add Prisma or Drizzle ORM (optional; SQL migrations sufficient for now)
- [ ] Integrate email service (Sendgrid/Resend) for digests
- [ ] Scaffold LangGraph AI pipeline for doc classification (optional)
- [ ] Deploy web to Vercel, API to Railway/Fly.io
- [ ] Add Sentry/monitoring
- [ ] Set up Renovate for automated dependency updates

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Express.js Docs](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Last updated**: 2025-01-01 | Maintained by: CSV Team
