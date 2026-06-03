$MachineListPath = "d:\Yohan\Service record\MACHINE LIST 2022.11.10.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

function Get-CellText($ws, [int]$row, [int]$col) {
    $cell = $ws.Cells.Item($row, $col)
    if ($null -eq $cell) { return "" }
    $t = $cell.Text
    if ([string]::IsNullOrEmpty($t)) { return "" }
    return $t.Trim()
}

$wbMachine = $excel.Workbooks.Open($MachineListPath)
foreach ($ws in $wbMachine.Worksheets) {
    Write-Host "Searching $($ws.Name)..."
    $totalRows = $ws.UsedRange.Rows.Count
    for ($r = 1; $r -le $totalRows; $r++) {
        for ($c = 1; $c -le 10; $c++) {
            $val = Get-CellText $ws $r $c
            if ($val -match "GENERATOR" -or $val -match "GE-") {
                Write-Host "Found in $($ws.Name) Row $r Col $c : $val"
            }
        }
    }
}

$wbMachine.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
