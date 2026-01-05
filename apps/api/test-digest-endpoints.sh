#!/bin/bash

# Test script for digest API endpoints
# Tests the normalized highlights/datapoints retrieval

echo "🧪 Testing Digest API Endpoints"
echo "================================"
echo ""

API_BASE="http://localhost:3001/api/v1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1️⃣  Testing GET /api/v1/digests (list with pagination)"
echo "---------------------------------------------------"
RESPONSE=$(curl -s "${API_BASE}/digests?page=1&pageSize=3")
echo "$RESPONSE" | jq '.'
echo ""

# Extract first digest ID for detail test
DIGEST_JOB_ID=$(echo "$RESPONSE" | jq -r '.items[0].crawlJobId // empty')

if [ -z "$DIGEST_JOB_ID" ]; then
    echo -e "${YELLOW}⚠️  No digests found in database. Run test-digest-generation.ts first.${NC}"
    echo ""
    exit 0
fi

echo -e "${GREEN}✓ Found digest with crawl_job_id: $DIGEST_JOB_ID${NC}"
echo ""

echo "2️⃣  Testing GET /api/v1/digests/:digestId (detail with highlights/datapoints)"
echo "--------------------------------------------------------------------------"
DETAIL_RESPONSE=$(curl -s "${API_BASE}/digests/${DIGEST_JOB_ID}")
echo "$DETAIL_RESPONSE" | jq '.'
echo ""

# Validate structure
HIGHLIGHTS_COUNT=$(echo "$DETAIL_RESPONSE" | jq '.data.highlights | length')
DATAPOINTS_COUNT=$(echo "$DETAIL_RESPONSE" | jq '.data.datapoints | length')
HIGHLIGHTS_COUNT_FIELD=$(echo "$DETAIL_RESPONSE" | jq '.data.highlights_count')
DATAPOINTS_COUNT_FIELD=$(echo "$DETAIL_RESPONSE" | jq '.data.datapoints_count')

echo "📊 Validation Results:"
echo "  Highlights array length: $HIGHLIGHTS_COUNT"
echo "  Highlights count field: $HIGHLIGHTS_COUNT_FIELD"
echo "  Datapoints array length: $DATAPOINTS_COUNT"
echo "  Datapoints count field: $DATAPOINTS_COUNT_FIELD"
echo ""

if [ "$HIGHLIGHTS_COUNT" -eq "$HIGHLIGHTS_COUNT_FIELD" ] && [ "$DATAPOINTS_COUNT" -eq "$DATAPOINTS_COUNT_FIELD" ]; then
    echo -e "${GREEN}✓ Count fields match array lengths!${NC}"
else
    echo -e "${RED}✗ Mismatch between count fields and array lengths${NC}"
fi
echo ""

# Check for normalized data
HAS_SOURCE_NAME=$(echo "$DETAIL_RESPONSE" | jq '.data.sourceName != null')
HAS_CRAWLED_AT=$(echo "$DETAIL_RESPONSE" | jq '.data.crawledAt != null')

echo "🔍 Joined Fields Check:"
echo "  Has sourceName: $HAS_SOURCE_NAME"
echo "  Has crawledAt: $HAS_CRAWLED_AT"
echo ""

if [ "$HAS_SOURCE_NAME" == "true" ] && [ "$HAS_CRAWLED_AT" == "true" ]; then
    echo -e "${GREEN}✓ All JOIN fields present!${NC}"
else
    echo -e "${YELLOW}⚠️  Some JOIN fields missing${NC}"
fi
echo ""

echo "3️⃣  Testing List Response Structure"
echo "------------------------------------"
LIST_HAS_SOURCE_NAME=$(echo "$RESPONSE" | jq '.items[0].sourceName != null')
LIST_HAS_HIGHLIGHTS_COUNT=$(echo "$RESPONSE" | jq '.items[0].highlightsCount != null')
LIST_HAS_DATAPOINTS_COUNT=$(echo "$RESPONSE" | jq '.items[0].datapointsCount != null')

echo "  First list item has sourceName: $LIST_HAS_SOURCE_NAME"
echo "  First list item has highlightsCount: $LIST_HAS_HIGHLIGHTS_COUNT"
echo "  First list item has datapointsCount: $LIST_HAS_DATAPOINTS_COUNT"
echo ""

if [ "$LIST_HAS_SOURCE_NAME" == "true" ] && [ "$LIST_HAS_HIGHLIGHTS_COUNT" == "true" ] && [ "$LIST_HAS_DATAPOINTS_COUNT" == "true" ]; then
    echo -e "${GREEN}✓ List endpoint returns denormalized fields!${NC}"
else
    echo -e "${YELLOW}⚠️  Some denormalized fields missing from list${NC}"
fi
echo ""

echo "================================"
echo -e "${GREEN}✅ Test Complete${NC}"
echo ""
echo "Next steps:"
echo "  • Verify highlights/datapoints content in detail response"
echo "  • Test with different page sizes and sourceId filters"
echo "  • Run frontend to verify UI integration"
