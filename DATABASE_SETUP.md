# Database Setup Guide

## Problem
The error `role "postgres" does not exist` means PostgreSQL isn't installed or configured.

## Quick Fix Options

### Option 1: Install PostgreSQL with Homebrew (Recommended for Mac)

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create the database
createdb csv_crawler

# Create .env.local file
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://$(whoami)@localhost:5432/csv_crawler
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Run migrations
cd packages/db
npx pnpm build
node dist/migrate.js

# Restart the dev servers
cd ../..
npx -y pnpm@latest dev
```

### Option 2: Use Docker (If you have Docker installed)

```bash
# Start PostgreSQL in Docker
docker run --name csv-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=csv_crawler \
  -p 5432:5432 \
  -d postgres:14

# Create .env.local file
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/csv_crawler
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Run migrations
cd packages/db
npx pnpm build
node dist/migrate.js

# Restart the dev servers
cd ../..
npx -y pnpm@latest dev
```

### Option 3: Use Postgres.app (Mac GUI)

1. Download from: https://postgresapp.com/
2. Install and start Postgres.app
3. Click "Initialize" to create a new server
4. Run these commands:

```bash
# Add Postgres.app to PATH (add to ~/.zshrc)
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

# Create database
createdb csv_crawler

# Create .env.local
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://$(whoami)@localhost:5432/csv_crawler
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Run migrations
cd packages/db
npx pnpm build
node dist/migrate.js

# Restart dev servers
cd ../..
npx -y pnpm@latest dev
```

## Verify Database Connection

```bash
# Test connection
psql -d csv_crawler -c "SELECT version();"

# Should show PostgreSQL version if connected
```

## After Setup

Once PostgreSQL is running and migrations are complete:

1. Restart dev servers: `npx -y pnpm@latest dev`
2. Visit http://localhost:3000/sources
3. Add a test source (DOE Circulars)
4. Start a crawl!

## Troubleshooting

**"command not found: createdb"**
- PostgreSQL isn't in your PATH
- For Homebrew: `brew link postgresql@14 --force`
- For Postgres.app: Add to PATH as shown above

**"database csv_crawler already exists"**
- That's fine! Skip `createdb` and go straight to migrations

**Migrations fail**
- Check DATABASE_URL in .env.local matches your setup
- Make sure PostgreSQL is running: `ps aux | grep postgres`

**"permission denied"**
- Your user doesn't have DB permissions
- Use Docker option with postgres:postgres credentials

---

**Choose Option 1 (Homebrew) for the simplest setup on Mac.**
