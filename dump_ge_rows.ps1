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
Write-Host "Dumping Generator rows from Service record.xlsx..."

foreach ($ws in $wb.Worksheets) {
    $totalRows = $ws.UsedRange.Rows.Count
    $totalCols = $ws.UsedRange.Columns.Count
    if ($totalRows -gt 500) { $totalRows = 500 }
    if ($totalCols -gt 25) { $totalCols = 25 }
    
    # Dump headers (assuming row 1 or 2 is header)
    $headerRow = ""
    for ($c = 1; $c -le $totalCols; $c++) {
        $headerRow += "$(Get-CellText $ws 1 $c) | "
    }
    Write-Host "[$($ws.Name)] HEADERS 1: $headerRow"
    
    $headerRow2 = ""
    for ($c = 1; $c -le $totalCols; $c++) {
        $headerRow2 += "$(Get-CellText $ws 2 $c) | "
    }
    Write-Host "[$($ws.Name)] HEADERS 2: $headerRow2"
    
    for ($r = 1; $r -le $totalRows; $r++) {
        $hasGe = $false
        for ($c = 1; $c -le $totalCols; $c++) {
            $val = Get-CellText $ws $r $c
            if ($val -match "^GE-\d+") {
                $hasGe = $true
                break
            }
        }
        
        if ($hasGe) {
            $rowStr = ""
            for ($c = 1; $c -le $totalCols; $c++) {
                $rowStr += "$(Get-CellText $ws $r $c) | "
            }
            Write-Host "[$($ws.Name) Row $r]: $rowStr"
        }
    }
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
