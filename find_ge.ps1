function Get-CellText($ws, [int]$row, [int]$col) {
    $cell = $ws.Cells.Item($row, $col)
    if ($null -eq $cell) { return "" }
    $t = $cell.Text
    if ([string]::IsNullOrEmpty($t)) { return "" }
    return $t.Trim()
}

$MachineListPath = "d:\Yohan\Service record\MACHINE LIST 2022.11.10.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wbMachine = $excel.Workbooks.Open($MachineListPath)
$ws = $wbMachine.Worksheets.Item("Sheet2")
$totalRows = $ws.UsedRange.Rows.Count
Write-Host "Total rows in Sheet2: $totalRows"

for ($r = 1; $r -le $totalRows; $r++) {
    $equip = Get-CellText $ws $r 2
    $type = Get-CellText $ws $r 5
    if ($equip -match "GENERATOR" -or $type -match "GENERATOR" -or $equip -match "GE-" -or $type -match "GE-") {
        $c1 = Get-CellText $ws $r 1
        $c2 = Get-CellText $ws $r 2
        $c3 = Get-CellText $ws $r 3
        $c4 = Get-CellText $ws $r 4
        $c5 = Get-CellText $ws $r 5
        $c6 = Get-CellText $ws $r 6
        Write-Host "Row $r : $c1 | $c2 | $c3 | $c4 | $c5 | $c6"
    }
}

$wbMachine.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
