#!/bin/bash
# scripts/db-setup.sh
# Resets local Supabase DB, applies migrations, and runs seed

set -e

echo "🗄️  Nudgeable — Database Setup"
echo "================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# Check if Supabase is running
if ! supabase status &> /dev/null; then
    echo "⚠️  Supabase not running. Starting..."
    supabase start
fi

echo ""
echo "1️⃣  Resetting database..."
supabase db reset --no-confirm

echo ""
echo "2️⃣  Verifying migration applied..."
supabase db lint

echo ""
echo "3️⃣  Listing tables..."
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo ""
echo "4️⃣  Checking seed data..."
supabase db query "SELECT name, slug, plan FROM organizations;"
supabase db query "SELECT name, icon, source FROM skills ORDER BY name;"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npx tsx scripts/create-demo-users.ts"
echo "  2. Run: npm run db:types"
