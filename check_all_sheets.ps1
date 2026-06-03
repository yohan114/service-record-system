$MachineListPath = "d:\Yohan\Service record\MACHINE LIST 2022.11.10.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wbMachine = $excel.Workbooks.Open($MachineListPath)
Write-Host "All sheets (including hidden) in $($MachineListPath):"
foreach ($ws in $wbMachine.Worksheets) {
    Write-Host "- $($ws.Name) (Visible: $($ws.Visible))"
}
$wbMachine.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
