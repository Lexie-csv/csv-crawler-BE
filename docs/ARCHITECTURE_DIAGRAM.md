# CSV Crawler - Segmented Build Architecture

## Before: Monolithic Build
```
┌────────────────────────────────────────┐
│         pnpm build (everything)        │
└────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│   Backend     │       │   Frontend    │
│               │       │               │
│ • API Server  │       │ • Next.js     │
│ • Crawler     │       │ • UI/Pages    │
│ • Database    │       │ • Components  │
│ • Types       │       │ • Types       │
└───────────────┘       └───────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
          [Both must deploy together]
```

## After: Segmented Builds
```
┌─────────────────────────────────────────────────────────┐
│              Build Orchestration Layer                  │
│                 (Turbo + Filters)                       │
└─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────────┐   ┌───────────────────┐
│  pnpm build:api   │   │  pnpm build:web   │
│                   │   │                   │
│  Builds only:     │   │  Builds only:     │
│  • packages/db    │   │  • apps/web       │
│  • packages/types │   │  • packages/types │
│  • apps/api       │   │                   │
└───────────────────┘   └───────────────────┘
        │                       │
        ▼                       ▼
┌───────────────────┐   ┌───────────────────┐
│  Deploy Backend   │   │  Deploy Frontend  │
│                   │   │                   │
│  • Railway        │   │  • Vercel         │
│  • Fly.io         │   │  • Netlify        │
│  • Render         │   │  • Cloudflare     │
│                   │   │                   │
│  Port: 3001       │   │  Port: 3000       │
└───────────────────┘   └───────────────────┘
```

## Development Modes

### 1. Backend Only (Crawler Focus)
```bash
pnpm crawler
# OR
pnpm dev:api
```
```
┌──────────────────────────────┐
│      PostgreSQL              │
│      (Docker)                │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      API Server              │
│      localhost:3001          │
│                              │
│  • Crawler Service           │
│  • REST Endpoints            │
│  • Job Queue                 │
└──────────────────────────────┘
```

### 2. Frontend Only (UI Development)
```bash
pnpm dev:web
```
```
┌──────────────────────────────┐
│      Next.js Dev Server      │
│      localhost:3000          │
│                              │
│  • Hot Reload (Turbopack)    │
│  • Component Dev             │
│  • UI Testing                │
└──────────────────────────────┘
```

### 3. Full Stack (Integrated Development)
```bash
pnpm dev
```
```
┌──────────────────────────────┐
│      PostgreSQL              │
│      (Docker)                │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐ ┌──────────────┐
│  API Server  │ │  Next.js     │
│  :3001       │ │  :3000       │
│              │ │              │
│  Backend     │ │  Frontend    │
└──────────────┘ └──────────────┘
```

## Dependency Graph

```
                    ┌──────────────┐
                    │ @csv/types   │
                    │ (shared)     │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌─────────────────┐       ┌─────────────┐
     │   Backend Deps  │       │ Frontend    │
     │                 │       │ Deps        │
     │ • @csv/db       │       │             │
     │ • @csv/api      │       │ • @csv/web  │
     │ • express       │       │ • react     │
     │ • pg (postgres) │       │ • next      │
     │ • cheerio       │       │ • tailwind  │
     │ • openai        │       │ • shadcn    │
     └─────────────────┘       └─────────────┘
```

## Build Outputs

### Backend Build (`pnpm build:api`)
```
dist/
├── packages/
│   ├── db/
│   │   └── dist/          # Compiled DB utilities
│   └── types/
│       └── dist/          # Compiled TypeScript types
└── apps/
    └── api/
        └── dist/          # Compiled Express server
            ├── index.js
            ├── app.js
            └── services/
```

### Frontend Build (`pnpm build:web`)
```
.next/
├── static/                # Static assets
├── server/                # Server components
└── cache/                 # Build cache

dist/
└── packages/
    └── types/
        └── dist/          # Shared types only
```

## Testing Strategy

```
┌──────────────────────────────────────────┐
│         pnpm test (all tests)            │
└──────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  pnpm test:api   │   │  pnpm test:web   │
│                  │   │                  │
│  • Unit tests    │   │  • Component     │
│  • Integration   │   │    tests         │
│  • Supertest     │   │  • E2E           │
│                  │   │  • Playwright    │
└──────────────────┘   └──────────────────┘
```

## CI/CD Pipeline Example

```
┌─────────────────────────────────────┐
│         Git Push to Main            │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌────────────────┐   ┌──────────────┐
│ Backend CI     │   │ Frontend CI  │
│ (GitHub Actions)│  │ (Vercel)     │
│                │   │              │
│ 1. Lint API    │   │ 1. Lint Web  │
│ 2. Test API    │   │ 2. Test Web  │
│ 3. Build API   │   │ 3. Build Web │
│ 4. Deploy      │   │ 4. Deploy    │
│    Railway     │   │    Vercel    │
└────────────────┘   └──────────────┘
```

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Build Time** | ~2-3 min (everything) | ~30s (backend only) |
| **Deploy Speed** | Both must deploy | Independent deploys |
| **Development** | Must run both | Run what you need |
| **Testing** | All tests always | Targeted testing |
| **CI/CD Cost** | High (full build) | Lower (split builds) |
| **Debugging** | Complex (full stack) | Isolated concerns |

---

This architecture provides complete flexibility while maintaining the benefits of a monorepo structure.
