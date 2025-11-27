# RouteWise Development Server Stop Script
# Kills running processes on dev ports (3210, 5173, 5174)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RouteWise Dev Server Stop Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Ports to clean up
$ports = @(3210, 5173, 5174)
$killedCount = 0

Write-Host "Stopping processes on ports $($ports -join ', ')..." -ForegroundColor Yellow
Write-Host ""

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen 2>$null

    if ($connections) {
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            $process = Get-Process -Id $processId 2>$null

            if ($process) {
                Write-Host "  - Killing '$($process.ProcessName)' (PID: $processId) on port $port" -ForegroundColor Gray
                Stop-Process -Id $processId -Force 2>$null
                $killedCount++
            }
        }
    } else {
        Write-Host "  - Port ${port}: No process running" -ForegroundColor DarkGray
    }
}

# Give processes time to terminate
Start-Sleep -Seconds 1

Write-Host ""

# Verify ports are free
$stillRunning = @()
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen 2>$null
    if ($conn) {
        $stillRunning += $port
    }
}

if ($stillRunning.Count -eq 0) {
    if ($killedCount -gt 0) {
        Write-Host "Successfully stopped $killedCount process(es)" -ForegroundColor Green
    } else {
        Write-Host "No dev servers were running" -ForegroundColor Yellow
    }
    Write-Host "All ports are now free" -ForegroundColor Green
} else {
    Write-Host "Warning: Some ports are still in use: $($stillRunning -join ', ')" -ForegroundColor Red
}

Write-Host ""
