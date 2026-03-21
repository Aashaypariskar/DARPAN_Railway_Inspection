# Railway Monitoring Dashboard - Build & Deploy Script

$ErrorActionPreference = "Stop"

# Get script directory safely
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootPath = Resolve-Path "$ScriptPath\.."

$DashboardPath = Join-Path $RootPath "monitoring-dashboard"
$BackendPublicPath = Join-Path $RootPath "backend\public\dashboard"

Write-Host "--- Starting Build Process ---" -ForegroundColor Cyan

# 1. Build Dashboard
Write-Host "[1/3] Building monitoring-dashboard..." -ForegroundColor Yellow
Set-Location $DashboardPath
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Deployment aborted." -ForegroundColor Red
    exit 1
}

# 2. Clean Backend Folder
Write-Host "[2/3] Cleaning backend/public/dashboard..." -ForegroundColor Yellow

if (Test-Path $BackendPublicPath) {
    Get-ChildItem $BackendPublicPath -Exclude ".gitkeep" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
}
else {
    New-Item -ItemType Directory -Path $BackendPublicPath -Force | Out-Null
}

# 3. Copy Build Files
Write-Host "[3/3] Deploying assets to backend..." -ForegroundColor Yellow
Copy-Item (Join-Path $DashboardPath "dist\*") $BackendPublicPath -Recurse -Force

Write-Host "--- Build & Deploy Complete! ---" -ForegroundColor Green
Write-Host "Dashboard is now available at /wsp/dashboard/" -ForegroundColor Cyan