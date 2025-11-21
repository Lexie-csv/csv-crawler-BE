#!/bin/bash

# Example: Test the crawler with a sample crawl job
# Run this after starting the API server

set -e

API_URL="http://localhost:3001"

echo "🧪 CSV Crawler - Test Script"
echo "=============================="
echo ""

# Check if API is running
echo "🔍 Checking API server..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "❌ API server not responding at $API_URL"
    echo "   Start it with: pnpm dev:api or ./scripts/run-crawler.sh"
    exit 1
fi

echo "✅ API server is running"
echo ""

# List existing sources
echo "📋 Listing existing sources..."
curl -s "$API_URL/api/sources" | jq '.' || echo "Response received"
echo ""

# Create a new source (if needed)
echo "➕ Adding a test source..."
SOURCE_RESPONSE=$(curl -s -X POST "$API_URL/api/sources" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Philippine SEC",
    "url": "https://www.sec.gov.ph",
    "type": "exchange",
    "country": "PH",
    "sector": "finance"
  }')

echo "$SOURCE_RESPONSE" | jq '.' || echo "$SOURCE_RESPONSE"
SOURCE_ID=$(echo "$SOURCE_RESPONSE" | jq -r '.id // 1' 2>/dev/null || echo "1")
echo ""

# Create a crawl job
echo "🚀 Creating crawl job for source ID: $SOURCE_ID..."
CRAWL_RESPONSE=$(curl -s -X POST "$API_URL/api/crawl-jobs" \
  -H "Content-Type: application/json" \
  -d "{\"source_id\": $SOURCE_ID}")

echo "$CRAWL_RESPONSE" | jq '.' || echo "$CRAWL_RESPONSE"
CRAWL_JOB_ID=$(echo "$CRAWL_RESPONSE" | jq -r '.id // 1' 2>/dev/null || echo "1")
echo ""

# Check crawl job status
echo "📊 Checking crawl job status (ID: $CRAWL_JOB_ID)..."
sleep 2
curl -s "$API_URL/api/crawl-jobs/$CRAWL_JOB_ID" | jq '.' || echo "Response received"
echo ""

# List all crawl jobs
echo "📋 Listing all crawl jobs..."
curl -s "$API_URL/api/crawl-jobs" | jq '.' || echo "Response received"
echo ""

echo "✅ Test completed!"
echo ""
echo "Next steps:"
echo "  - Check the API logs for crawl progress"
echo "  - Query: curl $API_URL/api/crawl-jobs"
echo "  - Monitor specific job: curl $API_URL/api/crawl-jobs/$CRAWL_JOB_ID"
