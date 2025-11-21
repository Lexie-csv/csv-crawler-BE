#!/bin/bash

# Quick Test - Backend Alpha Policy Scanner
# Tests the full pipeline with a simple example

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Backend Alpha - Quick Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the api directory:"
    echo "   cd apps/api && ./quick-test.sh"
    exit 1
fi

# Check environment
if [ ! -f "../../.env.local" ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "   LLM features will be limited without OPENAI_API_KEY"
    echo ""
fi

# Create test URLs file
echo "📝 Creating test URLs..."
cat > test-urls.txt << 'EOF'
# Test URLs for scanner
https://example.com
https://www.wikipedia.org
EOF

echo "✅ Test URLs created"
echo ""

# Test 1: Basic scan
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Basic Scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

pnpm scanner scan --file test-urls.txt --export json --output ./storage/test-exports

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test 1 PASSED - Scan completed successfully"
else
    echo ""
    echo "❌ Test 1 FAILED - Scan error"
    exit 1
fi

echo ""

# Test 2: Generate digest
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Generate Digest"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Find the latest scan result
SCAN_FILE=$(ls -t storage/test-exports/scan_results_*.json 2>/dev/null | head -1)

if [ -z "$SCAN_FILE" ]; then
    echo "❌ No scan results found"
    exit 1
fi

echo "Using scan results: $SCAN_FILE"
echo ""

pnpm scanner digest \
    --input "$SCAN_FILE" \
    --period "Test Run $(date +%Y-%m-%d)" \
    --export md,json \
    --output ./storage/test-exports

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test 2 PASSED - Digest generated successfully"
else
    echo ""
    echo "❌ Test 2 FAILED - Digest error"
    exit 1
fi

echo ""

# Test 3: List exports
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: List Exports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

pnpm scanner list --output ./storage/test-exports

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL TESTS PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Generated files in: storage/test-exports/"
echo ""
echo "Now let's view the results in plain English:"
echo ""
read -p "Press ENTER to view scan results..."
echo ""

# Show results using viewer
pnpm view:scan --output ./storage/test-exports 2>/dev/null || echo "Results available in storage/test-exports/"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Add your URLs to example-urls.txt"
echo "2. Run: pnpm scanner scan --file example-urls.txt"
echo "3. View: pnpm view scan  ← No SQL/JSON needed!"
echo ""
echo "📖 Full guide: ../../HOW_TO_VIEW_RESULTS.md"
echo "⚡ Quick ref: ../../QUICK_REFERENCE.md"
echo ""
echo "🎉 Backend Alpha is ready for production use!"
