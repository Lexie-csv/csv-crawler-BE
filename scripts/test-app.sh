#!/bin/bash

set -e  # Exit on error

echo "🔍 Testing CSV Crawler App..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check dependencies
echo -e "\n${YELLOW}1️⃣ Checking dependencies...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Install with: npm install -g pnpm${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker Desktop${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites installed${NC}"

# 2. Install dependencies
echo -e "\n${YELLOW}2️⃣ Installing dependencies...${NC}"
pnpm install --frozen-lockfile || pnpm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# 3. Check database
echo -e "\n${YELLOW}3️⃣ Starting database...${NC}"
docker-compose up -d postgres

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
    echo -e "${GREEN}✅ Database is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}❌ Database failed to start${NC}"
    docker-compose logs postgres
    exit 1
  fi
  sleep 1
done

# 4. Run migrations
echo -e "\n${YELLOW}4️⃣ Running migrations...${NC}"
pnpm --filter @csv/db migrate || {
  echo -e "${RED}❌ Migrations failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Migrations applied${NC}"

# 5. Check if ports are available
echo -e "\n${YELLOW}5️⃣ Checking ports...${NC}"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}⚠️  Port 3001 is in use. Killing process...${NC}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}⚠️  Port 3000 is in use. Killing process...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi
echo -e "${GREEN}✅ Ports are available${NC}"

# 6. Start API in background
echo -e "\n${YELLOW}6️⃣ Starting API server...${NC}"
cd apps/api
pnpm dev > /tmp/csv-api.log 2>&1 &
API_PID=$!
cd ../..

# Wait for API to start
echo "Waiting for API to start..."
for i in {1..20}; do
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is running (PID: $API_PID)${NC}"
    break
  fi
  if [ $i -eq 20 ]; then
    echo -e "${RED}❌ API failed to start${NC}"
    echo "API logs:"
    cat /tmp/csv-api.log
    kill $API_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Test API endpoints
echo "Testing API endpoints..."
if ! curl -sf http://localhost:3001/api/v1/sources > /dev/null; then
  echo -e "${RED}❌ Sources endpoint failed${NC}"
  kill $API_PID 2>/dev/null || true
  exit 1
fi
echo -e "${GREEN}✅ API endpoints working${NC}"

# 7. Start Web in background
echo -e "\n${YELLOW}7️⃣ Starting Web app...${NC}"
cd apps/web
pnpm dev > /tmp/csv-web.log 2>&1 &
WEB_PID=$!
cd ../..

# Wait for web to start
echo "Waiting for Web app to start..."
for i in {1..30}; do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web app is running (PID: $WEB_PID)${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}❌ Web app failed to start${NC}"
    echo "Web logs:"
    cat /tmp/csv-web.log
    kill $API_PID $WEB_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 All systems operational!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo -e ""
echo -e "${GREEN}   📊 Dashboard:${NC} http://localhost:3000"
echo -e "${GREEN}   🔌 API:${NC}       http://localhost:3001"
echo -e "${GREEN}   ❤️  Health:${NC}    http://localhost:3001/health"
echo -e ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  kill $API_PID $WEB_PID 2>/dev/null || true
  echo -e "${GREEN}✅ Services stopped${NC}"
  echo -e "${YELLOW}To stop the database: docker-compose down${NC}"
}

trap cleanup EXIT INT TERM

# Keep script running
wait
