#!/bin/bash

# CSV Crawler - Backend Only Launcher
# This script runs the crawling feature independently from the frontend

set -e

echo "🚀 Starting CSV Crawler Backend..."
echo "=================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "   Copy .env.example to .env.local and configure your environment"
    exit 1
fi

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! docker ps | grep -q postgres; then
    echo "⚠️  PostgreSQL container not running"
    echo "   Starting PostgreSQL..."
    docker-compose up -d postgres
    echo "   Waiting for PostgreSQL to be ready..."
    sleep 3
fi

# Run migrations
echo "📊 Running database migrations..."
pnpm db:migrate

# Build backend packages
echo "🔨 Building backend packages..."
pnpm build:api

# Start the API server
echo "✅ Starting API server on http://localhost:3001"
echo ""
echo "Available crawler endpoints:"
echo "  POST   /api/crawl-jobs        - Create new crawl job"
echo "  GET    /api/crawl-jobs        - List all crawl jobs"
echo "  GET    /api/crawl-jobs/:id    - Get crawl job status"
echo "  GET    /api/sources           - List all sources"
echo "  POST   /api/sources           - Add new source"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="
echo ""

pnpm start:api
