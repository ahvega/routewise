# RouteWise Development Server Startup Script
# Updates Convex, kills existing processes on dev ports, and starts fresh servers

param(
    [switch]$SkipConvex,
    [switch]$SkipSvelte,
    [switch]$SkipUpdate,
    [Alias("SkipConvexUpdate")]
    [switch]$SkipPkgUpdate
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RouteWise Dev Server Startup Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Update Convex to latest version
if (-not $SkipUpdate -and -not $SkipPkgUpdate) {
    Write-Host "[1/4] Updating Convex to latest version..." -ForegroundColor Yellow

    $updateResult = & npm install convex@latest 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Convex package updated successfully" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Convex update may have issues" -ForegroundColor Red
        Write-Host "  $updateResult" -ForegroundColor Gray
    }
} else {
    Write-Host "[1/4] Skipping Convex update (-SkipUpdate or -SkipConvexUpdate flag)" -ForegroundColor Gray
}

Write-Host ""

# Ports to clean up
$ports = @(3210, 5173, 5174)

Write-Host "[2/4] Stopping existing processes on ports $($ports -join ', ')..." -ForegroundColor Yellow

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen 2>$null

    if ($connections) {
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            $process = Get-Process -Id $processId 2>$null

            if ($process) {
                Write-Host "  - Killing process '$($process.ProcessName)' (PID: $processId) on port $port" -ForegroundColor Gray
                Stop-Process -Id $processId -Force 2>$null
            }
        }
    }
}

# Give processes time to terminate
Start-Sleep -Seconds 2

# Verify ports are free
$allClear = $true
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen 2>$null
    if ($conn) {
        Write-Host "  ! Warning: Port $port is still in use" -ForegroundColor Red
        $allClear = $false
    }
}

if ($allClear) {
    Write-Host "  All ports are now free" -ForegroundColor Green
}

Write-Host ""

# Start Convex dev server
if (-not $SkipConvex) {
    Write-Host "[3/4] Starting Convex dev server (port 3210)..." -ForegroundColor Yellow

    $convexJob = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "title Convex Dev Server && npx convex dev" `
        -WorkingDirectory $PSScriptRoot `
        -PassThru

    Write-Host "  Convex server starting in new window (PID: $($convexJob.Id))" -ForegroundColor Green

    # Wait a moment for Convex to initialize
    Start-Sleep -Seconds 3
} else {
    Write-Host "[3/4] Skipping Convex dev server (--SkipConvex flag)" -ForegroundColor Gray
}

Write-Host ""

# Start SvelteKit dev server
if (-not $SkipSvelte) {
    Write-Host "[4/4] Starting SvelteKit dev server (port 5173)..." -ForegroundColor Yellow

    $svelteJob = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "title SvelteKit Dev Server && npm run dev" `
        -WorkingDirectory $PSScriptRoot `
        -PassThru

    Write-Host "  SvelteKit server starting in new window (PID: $($svelteJob.Id))" -ForegroundColor Green
} else {
    Write-Host "[4/4] Skipping SvelteKit dev server (--SkipSvelte flag)" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Development servers started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SvelteKit:  http://localhost:5173" -ForegroundColor White
Write-Host "  Convex:     http://localhost:3210" -ForegroundColor White
Write-Host ""
Write-Host "  Note: Convex may prompt for backend upgrade" -ForegroundColor Gray
Write-Host "        in its terminal window." -ForegroundColor Gray
Write-Host ""
