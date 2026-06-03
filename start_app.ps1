Write-Host "Starting Edward and Christie Service Tracker..."
Write-Host "Please keep this window open!"

# Start the node server in the background
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Hidden

# Wait for server to start
Start-Sleep -Seconds 2

# Open browser
Start-Process "http://localhost:3000"

Write-Host "Application is running. Press any key to stop the server..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Clean up node process
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Write-Host "Server stopped."
