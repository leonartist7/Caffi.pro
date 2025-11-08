# Kill All Node/Next.js Servers
# This will stop ALL running servers on ports 3000, 3001, 3002

Write-Host "🔧 Stopping all Node.js servers..." -ForegroundColor Cyan
Write-Host ""

# Method 1: Kill all node processes
Write-Host "1. Killing all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Method 2: Kill processes on specific ports
$ports = @(3000, 3001, 3002)

foreach ($port in $ports) {
    Write-Host "2. Checking port $port..." -ForegroundColor Yellow
    
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connections) {
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "   Killing process $($process.Name) (PID: $($process.Id)) on port $port" -ForegroundColor Red
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "   ✅ Port $port is free" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ All servers stopped!                                ║" -ForegroundColor Green
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "║  Now run:                                                ║" -ForegroundColor Green
Write-Host "║  npm run dev                                             ║" -ForegroundColor Green
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "║  Only ONE server will start on port 3000                ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to start the server..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Start fresh server
Write-Host ""
Write-Host "Starting server on port 3000..." -ForegroundColor Yellow
npm run dev

