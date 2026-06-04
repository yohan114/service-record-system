<#
.SYNOPSIS
    Starts the Edward & Christie Service Record System (Windows).
    Installs dependencies and seeds the database on first run, then launches
    the server and opens the browser.
#>

Set-Location $PSScriptRoot
Write-Host "Edward & Christie - Service Record System" -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first run)..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "data\service.db")) {
    Write-Host "Building database from your data (first run)..." -ForegroundColor Yellow
    npm run seed
}

Write-Host "Starting server..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Hidden
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Write-Host "Application is running at http://localhost:3000" -ForegroundColor Green
Write-Host "Press any key to stop the server..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Write-Host "Server stopped."
