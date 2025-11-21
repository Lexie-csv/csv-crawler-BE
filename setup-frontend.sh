#!/bin/bash

# CSV Crawler Frontend - Quick Start Script
# This script sets up and starts the frontend application

set -e

echo "🚀 CSV Crawler Frontend Setup"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "🎨 Design System Features:"
echo "  • Naval blue & green color palette (Orbit theme)"
echo "  • Responsive navigation with orbital icon"
echo "  • Dashboard with real-time stats"
echo "  • Modern card-based UI with hover effects"
echo "  • Mobile-first responsive design"
echo "  • Accessible components (WCAG AA)"
echo ""
echo "📝 To start development:"
echo "  1. Ensure PostgreSQL is running: docker-compose up -d postgres"
echo "  2. Run migrations: pnpm db:migrate"
echo "  3. Start dev servers: pnpm dev"
echo ""
echo "🌐 URLs:"
echo "  • Frontend: http://localhost:3000"
echo "  • API: http://localhost:3001"
echo "  • Dashboard: http://localhost:3000/dashboard"
echo ""
echo "📚 Documentation:"
echo "  • DESIGN_SYSTEM_IMPLEMENTED.md - Complete design system guide"
echo "  • docs/DESIGN_SYSTEM_PROMPT.md - Original CSV Orbit design reference"
echo ""
