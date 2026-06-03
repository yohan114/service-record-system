$Path = "d:\Yohan\Service record\Service record.xlsx"
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

$wb = $excel.Workbooks.Open($Path)
Write-Host "Searching Service record.xlsx for Generators..."
foreach ($ws in $wb.Worksheets) {
    $found = 0
    $totalRows = $ws.UsedRange.Rows.Count
    for ($r = 1; $r -le 200; $r++) {
        for ($c = 1; $c -le 10; $c++) {
            $val = Get-CellText $ws $r $c
            if ($val -match "GENERATOR" -or $val -match "GE-") {
                Write-Host "Found in $($ws.Name) Row $r Col $c : $val"
                $found++
            }
        }
    }
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
