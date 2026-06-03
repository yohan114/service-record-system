$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$tables = @("ServiceFilters")
foreach ($tbl in $tables) {
    Write-Host "--- $tbl ---"
    try {
        $rs = $conn.Execute("SELECT * FROM $tbl WHERE 1=0")
        for ($i=0; $i -lt $rs.Fields.Count; $i++) {
            Write-Host "Column: $($rs.Fields.Item($i).Name)"
        }
        $rs.Close()
    } catch {
        Write-Host "Error accessing table $tbl : $($_.Exception.Message)"
    }
}
$conn.Close()
