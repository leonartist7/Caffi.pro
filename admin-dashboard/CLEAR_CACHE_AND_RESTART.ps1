# Clear Cache and Restart Script
# Run this if you see browser errors about service role key

Write-Host "🔧 Clearing all caches and restarting..." -ForegroundColor Cyan
Write-Host ""

# Stop any running dev servers
Write-Host "1. Stopping any running servers..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clear Next.js build cache
Write-Host "2. Clearing Next.js build cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "   ✅ .next folder deleted" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  .next folder doesn't exist" -ForegroundColor Gray
}

# Clear node_modules cache (optional - uncomment if needed)
# Write-Host "3. Clearing node_modules..." -ForegroundColor Yellow
# if (Test-Path "node_modules") {
#     Remove-Item -Recurse -Force node_modules
#     Remove-Item package-lock.json -ErrorAction SilentlyContinue
#     Write-Host "   ✅ node_modules deleted" -ForegroundColor Green
#     npm install
# }

Write-Host ""
Write-Host "3. Starting fresh dev server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ✅ Cache cleared!                                      ║" -ForegroundColor Cyan
Write-Host "║                                                          ║" -ForegroundColor Cyan
Write-Host "║  Now:                                                    ║" -ForegroundColor Cyan
Write-Host "║  1. Hard refresh your browser (Ctrl+Shift+R)            ║" -ForegroundColor Cyan
Write-Host "║  2. Or open incognito window (Ctrl+Shift+N)             ║" -ForegroundColor Cyan
Write-Host "║  3. Visit http://localhost:3000                         ║" -ForegroundColor Cyan
Write-Host "║                                                          ║" -ForegroundColor Cyan
Write-Host "║  The error should be gone! ✅                           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Start dev server
npm run dev

