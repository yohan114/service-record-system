$Path = "d:\Yohan\Service record\Service record.xlsx"
$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

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
Write-Host "Extracting GE IDs from Service record.xlsx..."

$geSet = @{}

foreach ($ws in $wb.Worksheets) {
    $totalRows = $ws.UsedRange.Rows.Count
    $totalCols = $ws.UsedRange.Columns.Count
    if ($totalRows -gt 500) { $totalRows = 500 } # Limit to reasonable bounds
    if ($totalCols -gt 20) { $totalCols = 20 }
    
    for ($r = 1; $r -le $totalRows; $r++) {
        for ($c = 1; $c -le $totalCols; $c++) {
            $val = Get-CellText $ws $r $c
            if ($val -match "^GE-\d+") {
                $geSet[$val.ToUpper()] = $true
            }
        }
    }
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

$geList = $geSet.Keys | Sort-Object
Write-Host "Found $($geList.Count) unique generators:"
$geList -join ", " | Write-Host

Write-Host "Inserting into database..."
$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)
$conn.Execute("BEGIN TRANSACTION") | Out-Null

$count = 0
foreach ($ge in $geList) {
    # Check if exists
    $rs = $conn.Execute("SELECT COUNT(*) FROM Vehicles WHERE ECNumber = '$ge'")
    $exists = $rs.Fields.Item(0).Value
    $rs.Close()
    
    if ($exists -eq 0) {
        $sql = "INSERT INTO Vehicles (SequenceNo, EquipmentDescription, ECNumber, Brand, VehicleType, Status) VALUES (999, 'GENERATOR', '$ge', 'GENERATOR', 'Generator', 'Active')"
        $conn.Execute($sql) | Out-Null
        $count++
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null

Write-Host "Inserted $count new generators."
