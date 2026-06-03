$FilterAnalysisPath = "d:\Yohan\Service record\Filter_Analysis_Report_Master_V2.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Open($FilterAnalysisPath)
Write-Host "Sheet Names in $($FilterAnalysisPath):"
foreach ($ws in $wb.Worksheets) {
    Write-Host "- $($ws.Name)"
}
$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
