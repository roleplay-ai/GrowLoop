# scripts/db-setup.ps1
# Resets local Supabase DB, applies migrations, and runs seed (Windows PowerShell version)

$ErrorActionPreference = "Stop"

Write-Host "🗄️  Nudgeable — Database Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if Supabase CLI is installed
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseExists) {
    Write-Host "❌ Supabase CLI not found. Install with: npm install -g supabase" -ForegroundColor Red
    exit 1
}

# Check if Supabase is running
$status = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Supabase not running. Starting..." -ForegroundColor Yellow
    supabase start
}

Write-Host ""
Write-Host "1️⃣  Resetting database..." -ForegroundColor Yellow
supabase db reset --no-confirm

Write-Host ""
Write-Host "2️⃣  Verifying migration applied..." -ForegroundColor Yellow
supabase db lint

Write-Host ""
Write-Host "3️⃣  Listing tables..." -ForegroundColor Yellow
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

Write-Host ""
Write-Host "4️⃣  Checking seed data..." -ForegroundColor Yellow
supabase db query "SELECT name, slug, plan FROM organizations;"
supabase db query "SELECT name, icon, source FROM skills ORDER BY name;"

Write-Host ""
Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: npx tsx scripts/create-demo-users.ts"
Write-Host "  2. Run: npm run db:types"
