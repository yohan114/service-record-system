$Path = "d:\Yohan\Service record\Service record.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Open($Path)
Write-Host "Sheet Names in Service record.xlsx:"
foreach ($ws in $wb.Worksheets) {
    Write-Host "- $($ws.Name)"
}
$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
