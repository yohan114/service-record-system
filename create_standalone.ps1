<#
.SYNOPSIS
    Creates a self-contained HTML file with embedded data (no external JS needed).
    Works from file:// protocol without any server.
#>

$DataPath = "d:\Yohan\Service record\vehicle_filter_data.js"
$HtmlPath = "d:\Yohan\Service record\VehicleFilterSearch.html"
$OutPath  = "d:\Yohan\Service record\VehicleFilterSearch_Standalone.html"

Write-Host "Creating standalone HTML with embedded data..." -ForegroundColor Cyan

$htmlContent = Get-Content $HtmlPath -Raw -Encoding UTF8
$dataContent = Get-Content $DataPath -Raw -Encoding UTF8

# Replace the external script tag with embedded data
$htmlContent = $htmlContent.Replace(
    '<script src="vehicle_filter_data.js"></script>',
    "<script>`n$dataContent`n</script>"
)

$htmlContent | Out-File -FilePath $OutPath -Encoding UTF8

$fileSize = (Get-Item $OutPath).Length / 1KB
Write-Host "Created: $OutPath ($([Math]::Round($fileSize, 1)) KB)" -ForegroundColor Green
Write-Host "This file works standalone - no server needed!" -ForegroundColor Yellow
